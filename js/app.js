// app.js - Main entry point, wires everything together

(function () {
  const reader = new RSVPReader();
  let currentFileHash = null;
  let currentFile = null;
  let epubChapters = null;
  let saveInterval = null;

  // Initialize UI
  UI.init(reader, handleFileLoaded);

  // Apply saved theme
  UI.applyTheme(Storage.loadTheme());

  // Wire reader callbacks
  reader.onWord((text) => {
    Display.renderWord(text, UI.getWordDisplay());
  });

  reader.onProgress((progress) => {
    UI.updateProgress(progress);
  });

  reader.onComplete(() => {
    UI.updatePlayPauseIcon();
    Display.showComplete(UI.getWordDisplay());
    stopAutoSave();
  });

  async function handleFileLoaded(file) {
    currentFile = file;
    epubChapters = null;

    try {
      const result = await Parser.parseFile(file);
      let text;

      if (result && result.chapters) {
        // EPUB with chapters
        epubChapters = result.chapters;
        text = result.fullText;
        UI.setupChapters(epubChapters);

        // Wire chapter selection
        const select = UI.getChapterSelect();
        select.onchange = () => {
          const idx = parseInt(select.value);
          if (!isNaN(idx) && epubChapters[idx]) {
            loadChapterText(idx);
          }
        };
      } else {
        text = result;
        UI.setupChapters(null);
      }

      if (!text || text.trim().length === 0) {
        alert('No text found in file.');
        return;
      }

      // Compute file hash for progress tracking
      currentFileHash = Storage.fileHash(file, text);

      // Load text into reader
      reader.loadText(text);
      UI.showReader();
      Display.clearDisplay(UI.getWordDisplay());

      // Check for saved progress
      const saved = Storage.loadProgress(currentFileHash);
      if (saved && saved.index > 0) {
        const percent = Math.round((saved.index / reader.totalWords) * 100);
        const resume = await UI.showResumeModal(
          `You were ${percent}% through this document at ${saved.wpm} WPM. Resume?`
        );
        if (resume) {
          reader.currentIndex = Math.min(saved.index, reader.totalWords - 1);
          UI.setSpeed(saved.wpm);
          reader._showCurrent();
        }
      }

      startAutoSave();

    } catch (err) {
      console.error('Parse error:', err);
      alert('Error reading file: ' + err.message);
    }
  }

  function loadChapterText(chapterIndex) {
    if (!epubChapters || !epubChapters[chapterIndex]) return;

    // Find the word position for this chapter
    // Rebuild from chapter texts to find offset
    let offset = 0;
    for (let i = 0; i < chapterIndex; i++) {
      const words = epubChapters[i].text.split(/\s+/).filter(w => w.length > 0);
      offset += words.length;
    }

    reader.pause();
    reader.currentIndex = Math.min(offset, reader.totalWords - 1);
    reader._showCurrent();
    UI.updatePlayPauseIcon();
  }

  function startAutoSave() {
    stopAutoSave();
    saveInterval = setInterval(() => {
      if (currentFileHash && reader.totalWords > 0) {
        Storage.saveProgress(currentFileHash, reader.currentIndex, reader.wpm);
      }
    }, 3000);
  }

  function stopAutoSave() {
    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }
  }

  // Save progress on page unload
  window.addEventListener('beforeunload', () => {
    if (currentFileHash && reader.totalWords > 0) {
      Storage.saveProgress(currentFileHash, reader.currentIndex, reader.wpm);
    }
  });
})();
