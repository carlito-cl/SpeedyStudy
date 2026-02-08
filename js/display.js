// display.js - ORP calculation and word rendering

const Display = (() => {

  function getOrpIndex(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 3) return 1;
    if (len <= 6) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  function renderWord(wordText, container) {
    if (!wordText || !container) return;

    const orpIdx = getOrpIndex(wordText);
    const before = wordText.substring(0, orpIdx);
    const orp = wordText[orpIdx];
    const after = wordText.substring(orpIdx + 1);

    container.innerHTML =
      '<span class="word-left"><span class="word-before">' + escapeHtml(before) + '</span></span>' +
      '<span class="word-orp">' + escapeHtml(orp) + '</span>' +
      '<span class="word-right"><span class="word-after">' + escapeHtml(after) + '</span></span>';
  }

  function clearDisplay(container) {
    container.innerHTML = '<span class="word-placeholder">Press play to start</span>';
  }

  function showComplete(container) {
    container.innerHTML = '<span class="word-placeholder">Finished!</span>';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { renderWord, clearDisplay, showComplete, getOrpIndex };
})();
