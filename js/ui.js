// ui.js - UI controls, event wiring, interactions

const UI = (() => {
  let reader = null;
  let onFileLoaded = null;

  const els = {};

  function init(rsvpReader, fileLoadedCallback) {
    reader = rsvpReader;
    onFileLoaded = fileLoadedCallback;

    // Cache DOM elements
    els.uploadArea = document.getElementById('upload-area');
    els.uploadContent = document.querySelector('.upload-content');
    els.fileInput = document.getElementById('file-input');
    els.uploadBtn = document.getElementById('upload-btn');
    els.readerSection = document.getElementById('reader-section');
    els.fileName = document.getElementById('file-name');
    els.chapterSelect = document.getElementById('chapter-select');
    els.newFileBtn = document.getElementById('new-file-btn');
    els.settingsBtn = document.getElementById('settings-btn');
    els.wordDisplay = document.getElementById('word-display');
    els.progressBar = document.getElementById('progress-bar');
    els.progressFill = document.getElementById('progress-fill');
    els.progressText = document.getElementById('progress-text');
    els.playPauseBtn = document.getElementById('play-pause-btn');
    els.playIcon = document.getElementById('play-icon');
    els.pauseIcon = document.getElementById('pause-icon');
    els.skipBackBtn = document.getElementById('skip-back-btn');
    els.skipForwardBtn = document.getElementById('skip-forward-btn');
    els.speedSlider = document.getElementById('speed-slider');
    els.wpmDisplay = document.getElementById('wpm-display');
    els.settingsPanel = document.getElementById('settings-panel');
    els.closeSettingsBtn = document.getElementById('close-settings-btn');
    els.themeToggleBtn = document.getElementById('theme-toggle-btn');
    els.clearProgressBtn = document.getElementById('clear-progress-btn');
    els.resumeModal = document.getElementById('resume-modal');
    els.resumeInfo = document.getElementById('resume-info');
    els.resumeYesBtn = document.getElementById('resume-yes-btn');
    els.resumeNoBtn = document.getElementById('resume-no-btn');

    bindEvents();
  }

  function bindEvents() {
    // File upload
    els.uploadBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    els.uploadContent.addEventListener('dragover', e => {
      e.preventDefault();
      els.uploadContent.classList.add('drag-over');
    });
    els.uploadContent.addEventListener('dragleave', () => {
      els.uploadContent.classList.remove('drag-over');
    });
    els.uploadContent.addEventListener('drop', e => {
      e.preventDefault();
      els.uploadContent.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    // Playback controls
    els.playPauseBtn.addEventListener('click', () => {
      reader.toggle();
      updatePlayPauseIcon();
    });
    els.skipBackBtn.addEventListener('click', () => reader.skipBackward());
    els.skipForwardBtn.addEventListener('click', () => reader.skipForward());

    // Speed slider
    els.speedSlider.addEventListener('input', () => {
      const wpm = parseInt(els.speedSlider.value);
      reader.setSpeed(wpm);
      els.wpmDisplay.textContent = wpm + ' WPM';
    });

    // Progress bar click to seek
    els.progressBar.addEventListener('click', e => {
      const rect = els.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      reader.seekTo(Math.max(0, Math.min(1, percent)));
    });

    // Navigation
    els.newFileBtn.addEventListener('click', showUpload);
    els.settingsBtn.addEventListener('click', toggleSettings);
    els.closeSettingsBtn.addEventListener('click', () => hideSettings());

    // Theme
    els.themeToggleBtn.addEventListener('click', toggleTheme);

    // Clear progress
    els.clearProgressBtn.addEventListener('click', () => {
      Storage.clearProgress();
      alert('Saved progress cleared.');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
  }

  function handleFileSelect(e) {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }

  function handleFile(file) {
    const validExts = ['txt', 'pdf', 'docx', 'epub'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExts.includes(ext)) {
      alert('Unsupported file format. Please use TXT, PDF, DOCX, or EPUB.');
      return;
    }
    els.fileName.textContent = file.name;
    if (onFileLoaded) onFileLoaded(file);
  }

  function showReader() {
    els.uploadArea.classList.add('hidden');
    els.readerSection.classList.remove('hidden');
  }

  function showUpload() {
    reader.pause();
    updatePlayPauseIcon();
    els.readerSection.classList.add('hidden');
    els.uploadArea.classList.remove('hidden');
    els.fileInput.value = '';
    els.chapterSelect.classList.add('hidden');
  }

  function updatePlayPauseIcon() {
    if (reader.isPlaying) {
      els.playIcon.classList.add('hidden');
      els.pauseIcon.classList.remove('hidden');
    } else {
      els.playIcon.classList.remove('hidden');
      els.pauseIcon.classList.add('hidden');
    }
  }

  function updateProgress(percent) {
    els.progressFill.style.width = (percent * 100) + '%';
    els.progressText.textContent = Math.round(percent * 100) + '%';
  }

  function setSpeed(wpm) {
    els.speedSlider.value = wpm;
    els.wpmDisplay.textContent = wpm + ' WPM';
    reader.setSpeed(wpm);
  }

  function setupChapters(chapters) {
    if (!chapters || chapters.length === 0) {
      els.chapterSelect.classList.add('hidden');
      return;
    }

    els.chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
    chapters.forEach((ch, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = ch.title;
      els.chapterSelect.appendChild(opt);
    });
    els.chapterSelect.classList.remove('hidden');

    // Reset handler - app.js will set .onchange directly
    els.chapterSelect.onchange = null;
  }

  function toggleSettings() {
    els.settingsPanel.classList.toggle('hidden');
  }

  function hideSettings() {
    els.settingsPanel.classList.add('hidden');
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    Storage.saveTheme(theme);
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  function showResumeModal(info) {
    return new Promise(resolve => {
      els.resumeInfo.textContent = info;
      els.resumeModal.classList.remove('hidden');

      const cleanup = (result) => {
        els.resumeModal.classList.add('hidden');
        els.resumeYesBtn.onclick = null;
        els.resumeNoBtn.onclick = null;
        resolve(result);
      };

      els.resumeYesBtn.onclick = () => cleanup(true);
      els.resumeNoBtn.onclick = () => cleanup(false);
    });
  }

  function handleKeyboard(e) {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        reader.toggle();
        updatePlayPauseIcon();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSpeed(Math.min(1500, reader.wpm + 25));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSpeed(Math.max(50, reader.wpm - 25));
        break;
      case 'ArrowRight':
        e.preventDefault();
        reader.skipForward();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        reader.skipBackward();
        break;
      case 'd':
      case 'D':
        toggleTheme();
        break;
      case 'r':
      case 'R':
        reader.restart();
        updatePlayPauseIcon();
        break;
      case 'Escape':
        hideSettings();
        break;
      case '?':
        e.preventDefault();
        toggleSettings();
        break;
    }
  }

  return {
    init, showReader, showUpload, updatePlayPauseIcon, updateProgress,
    setSpeed, setupChapters, applyTheme, showResumeModal,
    getWordDisplay: () => els.wordDisplay,
    getChapterSelect: () => els.chapterSelect,
  };
})();
