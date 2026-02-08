// parser.js - Document parsing for TXT, PDF, DOCX, EPUB

const Parser = (() => {

  async function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'txt': return parseTxt(file);
      case 'pdf': return parsePdf(file);
      case 'docx': return parseDocx(file);
      case 'epub': return parseEpub(file);
      default: throw new Error(`Unsupported file format: .${ext}`);
    }
  }

  function parseTxt(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(normalizeText(reader.result));
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  async function parsePdf(file) {
    // Dynamically import PDF.js as an ES module
    if (typeof window.pdfjsLib === 'undefined') {
      const pdfjs = await import('../node_modules/pdfjs-dist/build/pdf.min.mjs');
      window.pdfjsLib = pdfjs;
      pdfjs.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      pages.push(text);
    }

    return normalizeText(pages.join('\n\n'));
  }

  async function parseDocx(file) {
    if (typeof mammoth === 'undefined') throw new Error('Mammoth.js library not loaded');

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeText(result.value);
  }

  async function parseEpub(file) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip library not loaded');

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find container.xml to locate content.opf
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) throw new Error('Invalid EPUB: cannot find rootfile');

    const opfPath = rootfileMatch[1];
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
    const opfContent = await zip.file(opfPath)?.async('string');
    if (!opfContent) throw new Error('Invalid EPUB: cannot read content.opf');

    // Parse spine to get reading order
    const chapters = parseEpubSpine(opfContent, opfDir);

    // Extract text from each chapter
    const chapterTexts = [];
    for (const ch of chapters) {
      const xhtml = await zip.file(ch.href)?.async('string');
      if (xhtml) {
        const text = stripHtml(xhtml);
        if (text.trim()) {
          chapterTexts.push({ title: ch.title || `Chapter ${chapterTexts.length + 1}`, text: text.trim() });
        }
      }
    }

    return { chapters: chapterTexts, fullText: normalizeText(chapterTexts.map(c => c.text).join('\n\n')) };
  }

  function parseEpubSpine(opfContent, opfDir) {
    // Build id -> href map from manifest
    const manifest = {};
    const manifestRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*(?:media-type="([^"]+)")?[^>]*\/?>/g;
    let match;
    while ((match = manifestRegex.exec(opfContent)) !== null) {
      manifest[match[1]] = { href: opfDir + match[2], mediaType: match[3] || '' };
    }

    // Also check for reversed attribute order (href before id)
    const manifestRegex2 = /<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*(?:media-type="([^"]+)")?[^>]*\/?>/g;
    while ((match = manifestRegex2.exec(opfContent)) !== null) {
      if (!manifest[match[2]]) {
        manifest[match[2]] = { href: opfDir + match[1], mediaType: match[3] || '' };
      }
    }

    // Get spine order
    const spineRegex = /<itemref\s+idref="([^"]+)"[^>]*\/?>/g;
    const chapters = [];
    while ((match = spineRegex.exec(opfContent)) !== null) {
      const item = manifest[match[1]];
      if (item && (!item.mediaType || item.mediaType.includes('html') || item.mediaType.includes('xml'))) {
        chapters.push({ href: item.href, title: '' });
      }
    }

    // Try to get titles from TOC / nav
    const titleRegex = /<dc:title[^>]*>([^<]+)<\/dc:title>/;
    const titleMatch = opfContent.match(titleRegex);

    return chapters;
  }

  function stripHtml(html) {
    // Remove script/style content
    let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Convert block elements to newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Remove all remaining tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
               .replace(/&[a-zA-Z]+;/g, ' ');
    return text;
  }

  function normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return { parseFile };
})();
