const APP_ROOT = new URL('../../', import.meta.url);
const AUDIO_VERSION = 'alphabet-recordings-20261115';

export class AudioService {
  constructor() {
    this.audioMap = {};
    this.currentAudio = null;
  }

  resolveAudioPath(path, baseDir = '') {
    const trimmed = String(path || '').trim();
    if (!trimmed) return '';
    if (!baseDir) return trimmed;
    if (/^(?:[a-z]+:|\/)/i.test(trimmed)) return trimmed;
    return `${baseDir.replace(/\/?$/, '/')}${trimmed.replace(/^\.\//, '')}`;
  }

  async loadAudioSourceMap(url, options = {}) {
    const { optional = false, baseDir = '' } = options;
    const response = await fetch(new URL(url, APP_ROOT), { cache: 'no-store' });
    if (!response.ok) {
      if (optional) return {};
      throw new Error(`Could not load ${url}`);
    }

    const payload = await response.json();
    const rawMap = payload.symbols && typeof payload.symbols === 'object' ? payload.symbols : payload;
    return Object.fromEntries(
      Object.entries(rawMap)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([symbol, value]) => [symbol, this.resolveAudioPath(value, baseDir)])
    );
  }

  async loadAudioMap() {
    const mainMap = await this.loadAudioSourceMap('sounds.json');
    let extraMap = {};

    try {
      extraMap = await this.loadAudioSourceMap('extra-letters/sounds.json', {
        optional: true,
        baseDir: 'extra-letters'
      });
    } catch {
      extraMap = {};
    }

    this.audioMap = {
      ...mainMap,
      ...extraMap
    };

    return this.audioMap;
  }

  hasAudio(symbol) {
    return typeof this.audioMap[symbol] === 'string' && this.audioMap[symbol].trim().length > 0;
  }

  stop() {
    if (!this.currentAudio) return;
    try {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    } catch {
      // Ignore playback cleanup failures.
    }
    this.currentAudio = null;
  }

  async playSource(path) {
    this.stop();
    const url = new URL(path, APP_ROOT);
    url.searchParams.set('v', AUDIO_VERSION);
    const audio = new Audio(url.href);
    this.currentAudio = audio;
    await audio.play();
    return path;
  }

  async playSymbol(symbol) {
    if (!this.hasAudio(symbol)) {
      throw new Error('No audio file is available for this symbol yet.');
    }

    return this.playSource(this.audioMap[symbol]);
  }

  waitForCurrentAudio() {
    const audio = this.currentAudio;
    if (!audio || audio.ended || audio.paused) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => {
        ['ended', 'pause', 'error'].forEach(event => audio.removeEventListener(event, finish));
        resolve();
      };
      ['ended', 'pause', 'error'].forEach(event => audio.addEventListener(event, finish));
    });
  }

  async playVariantUnlock() {
    try {
      await this.playSource('audio/variant-unlock.mp3');
    } catch {
      // Celebration audio should not block progression.
    }
  }

  async playFinalCelebration() {
    try {
      await this.playSource('audio/final-celebration.mp3');
    } catch {
      // Celebration audio should not block progression.
    }
  }

  speak(text, options = {}) {
    if (!('speechSynthesis' in window) || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = options.pitch ?? 1.45;
    utterance.lang = options.lang ?? 'ti-ER';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  playSuccessTone() {
    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) return;
      const context = new AudioContextRef();
      const now = context.currentTime;
      [392, 523.25, 659.25].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
        gain.gain.setValueAtTime(0.0001, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.1, now + index * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.22);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + index * 0.08 + 0.24);
      });
    } catch {
      // Ignore synthesis failures.
    }
  }
}
