// reader.js - RSVP timing engine

class RSVPReader {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.wpm = 300;
    this.isPlaying = false;
    this.timerId = null;

    this._onWord = null;
    this._onProgress = null;
    this._onComplete = null;
  }

  loadText(text) {
    this.pause();
    this.currentIndex = 0;
    this.words = this._tokenize(text);
  }

  _tokenize(text) {
    const tokens = [];
    // Split by whitespace, keeping track of paragraph breaks
    const paragraphs = text.split(/\n\s*\n/);

    for (let p = 0; p < paragraphs.length; p++) {
      const words = paragraphs[p].split(/\s+/).filter(w => w.length > 0);
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        tokens.push({ text: w, delay: this._calcDelay(w) });
      }
      // Mark paragraph break after last word (except final paragraph)
      if (p < paragraphs.length - 1 && tokens.length > 0) {
        tokens[tokens.length - 1].delay = Math.max(tokens[tokens.length - 1].delay, 3.0);
      }
    }

    return tokens;
  }

  _calcDelay(word) {
    const last = word[word.length - 1];
    if (/[.!?]/.test(last)) return 2.5;
    if (/[,;:]/.test(last)) return 1.5;
    if (word.length >= 8) return 1.3;
    return 1.0;
  }

  play() {
    if (this.isPlaying || this.words.length === 0) return;
    this.isPlaying = true;
    this._tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  toggle() {
    this.isPlaying ? this.pause() : this.play();
  }

  _tick() {
    if (!this.isPlaying || this.currentIndex >= this.words.length) {
      this.isPlaying = false;
      if (this.currentIndex >= this.words.length && this._onComplete) {
        this._onComplete();
      }
      return;
    }

    const word = this.words[this.currentIndex];
    if (this._onWord) this._onWord(word.text, this.currentIndex);
    if (this._onProgress) this._onProgress(this.getProgress());

    this.currentIndex++;

    const baseInterval = 60000 / this.wpm;
    const delay = baseInterval * word.delay;

    this.timerId = setTimeout(() => this._tick(), delay);
  }

  skipForward(n = 15) {
    this.currentIndex = Math.min(this.currentIndex + n, this.words.length - 1);
    this._showCurrent();
  }

  skipBackward(n = 15) {
    this.currentIndex = Math.max(this.currentIndex - n, 0);
    this._showCurrent();
  }

  _showCurrent() {
    if (this.words.length === 0 || this.currentIndex >= this.words.length) return;
    const word = this.words[this.currentIndex];
    if (this._onWord) this._onWord(word.text, this.currentIndex);
    if (this._onProgress) this._onProgress(this.getProgress());
  }

  setSpeed(wpm) {
    this.wpm = Math.max(50, Math.min(1500, wpm));
  }

  getProgress() {
    if (this.words.length === 0) return 0;
    return this.currentIndex / this.words.length;
  }

  seekTo(percent) {
    const idx = Math.floor(percent * this.words.length);
    this.currentIndex = Math.max(0, Math.min(idx, this.words.length - 1));
    this._showCurrent();
  }

  restart() {
    this.pause();
    this.currentIndex = 0;
    this._showCurrent();
  }

  onWord(cb) { this._onWord = cb; }
  onProgress(cb) { this._onProgress = cb; }
  onComplete(cb) { this._onComplete = cb; }

  get totalWords() { return this.words.length; }
}
