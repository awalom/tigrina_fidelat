import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioService } from '../src/services/audio-service.js';

test('letter playback uses the current recordings cache version', async () => {
  const originalAudio = globalThis.Audio;
  let url;
  globalThis.Audio = class {
    constructor(source) { url = new URL(source); }
    async play() {}
  };
  try {
    const audio = new AudioService();
    audio.audioMap = { 'ሀ': 'audio/ሀ.mp3' };
    await audio.playSymbol('ሀ');
    assert.equal(decodeURIComponent(url.pathname).endsWith('/audio/ሀ.mp3'), true);
    assert.equal(url.searchParams.get('v'), 'alphabet-recordings-20261115');
    await assert.rejects(audio.playSymbol('missing'), /No audio file/);
  } finally {
    globalThis.Audio = originalAudio;
  }
});
