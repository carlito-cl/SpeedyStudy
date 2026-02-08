// storage.js - localStorage persistence for theme and reading progress

const Storage = (() => {
  const THEME_KEY = 'speedreader_theme';
  const PROGRESS_PREFIX = 'speedreader_progress_';

  function fileHash(file, text) {
    // Simple hash from first 500 chars + file size
    const sample = text.substring(0, 500);
    let hash = file.size;
    for (let i = 0; i < sample.length; i++) {
      hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function saveProgress(hash, index, wpm) {
    try {
      localStorage.setItem(PROGRESS_PREFIX + hash, JSON.stringify({ index, wpm, timestamp: Date.now() }));
    } catch (e) { /* quota exceeded, ignore */ }
  }

  function loadProgress(hash) {
    try {
      const data = localStorage.getItem(PROGRESS_PREFIX + hash);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function clearProgress(hash) {
    if (hash) {
      localStorage.removeItem(PROGRESS_PREFIX + hash);
    } else {
      // Clear all progress entries
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(PROGRESS_PREFIX)) keys.push(key);
      }
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* ignore */ }
  }

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  return { fileHash, saveProgress, loadProgress, clearProgress, saveTheme, loadTheme };
})();
