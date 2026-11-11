import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore } from '../src/core/progress-store.js';
import { StorageService } from '../src/services/storage-service.js';
import { ListenMatchFeature } from '../src/features/listen-match.js';

function fixture() {
  const store = new ProgressStore(new StorageService());
  store.save = () => {};
  const played = [];
  const audio = { hasAudio: () => true, playSymbol: async symbol => played.push(symbol), playSuccessTone() {} };
  return { store, played, feature: new ListenMatchFeature(store, audio) };
}

test('fresh learners can select all seven variants without completing earlier ones', async () => {
  const { store, feature, played } = fixture();
  assert.equal(store.getUnlockedCount(), 7);
  for (let index = 6; index >= 0; index--) {
    assert.equal(store.isVariantUnlocked(index), true);
    await feature.openVariant(index);
    const challenge = store.getProgress().challenge;
    assert.equal(challenge.variantIndex, index);
    assert.equal(challenge.part, 1);
    assert.ok(challenge.currentChoices.includes(challenge.targetSymbol));
    assert.equal(played.at(-1), challenge.targetSymbol);
    assert.equal(store.getPartProgress(index, 1).length, 0);
  }
  const html = feature.render(true);
  assert.match(html, /<select[^>]+challenge-variant-select/);
  assert.equal((html.match(/<option /g) || []).length, 7);
  assert.doesNotMatch(html, /disabled|is-locked|variant-directory/);
});

test('repeat starts a prompt when needed and replays the same prompt', async () => {
  const { store, feature, played } = fixture();
  await feature.replayPrompt();
  const target = store.getProgress().challenge.targetSymbol;
  assert.ok(target);
  assert.deepEqual(played, [target]);
  await feature.replayPrompt();
  assert.deepEqual(played, [target, target]);

  const html = feature.render(true);
  assert.match(html, /data-action='challenge-play' aria-label='Repeat sound'/);
  assert.match(html, /<svg class='lesson-icon'/);
  assert.doesNotMatch(html, />Play Prompt</);
  assert.doesNotMatch(html, /Prompt is ready\. Tap the right symbol after listening\./);
  assert.doesNotMatch(html, /class='message-box/);
});

test('repeat is disabled while audio loads or a variant is complete', () => {
  const { store, feature } = fixture();
  assert.match(feature.render(false), /data-action='challenge-play'[^>]*disabled/);
  store.updateChallenge({ courseCompleted: true });
  assert.match(feature.render(true), /data-action='challenge-play'[^>]*disabled/);
});

test('correct answers build a streak and any wrong answer resets it', async () => {
  const { store, feature } = fixture();
  assert.equal(store.getProgress().challenge.correctStreak, 0);
  assert.match(feature.render(true), /aria-label='0 correct answers in a row'/);

  await feature.startRound(true);
  await feature.submitGuess(store.getProgress().challenge.targetSymbol);
  assert.equal(store.getProgress().challenge.correctStreak, 1);
  await feature.startRound(true);
  await feature.submitGuess(store.getProgress().challenge.targetSymbol);
  assert.equal(store.getProgress().challenge.correctStreak, 2);
  assert.match(feature.render(true), /aria-label='2 correct answers in a row'/);

  await feature.startRound(true);
  const challenge = store.getProgress().challenge;
  const wrong = challenge.currentChoices.find(symbol => symbol !== challenge.targetSymbol);
  await feature.submitGuess(wrong);
  assert.equal(store.getProgress().challenge.correctStreak, 0);
  await feature.submitGuess(challenge.targetSymbol);
  assert.equal(store.getProgress().challenge.correctStreak, 1);
  await feature.openVariant(1);
  assert.equal(store.getProgress().challenge.correctStreak, 1);
});

test('streak survives a reload, defaults to zero for older progress, and resets with progress', () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  try {
    const storage = new StorageService();
    assert.equal(storage.mergeProgressWithDefaults({ challenge: { score: 3 } }).challenge.correctStreak, 0);
    const store = new ProgressStore(storage);
    store.ensureLearnerSession();
    store.updateChallenge({ correctStreak: 4 });
    const reloaded = new ProgressStore(new StorageService());
    assert.equal(reloaded.getProgress().challenge.correctStreak, 4);
    reloaded.resetCurrentProfile();
    assert.equal(reloaded.getProgress().challenge.correctStreak, 0);
    assert.equal(new ProgressStore(new StorageService()).getProgress().challenge.correctStreak, 0);
  } finally {
    globalThis.localStorage = original;
  }
});

test('completing the seventh variant first suggests an unfinished variant', async () => {
  const { store, feature } = fixture();
  for (const part of [1, 2]) {
    for (const symbol of store.getVariantSymbols(6, part)) store.markSymbolLearned(6, part, symbol);
  }
  await feature.openVariant(6);
  const result = await feature.submitGuess(store.getProgress().challenge.targetSymbol);
  assert.equal(result.status, 'variant-complete');
  assert.equal(store.getProgress().challenge.courseCompleted, false);
  assert.equal(result.nextVariantIndex, 0);
  await feature.openNextVariant();
  assert.equal(store.getProgress().challenge.variantIndex, 0);
});

test('completing all variants celebrates regardless of which is finished last', async () => {
  const { store, feature } = fixture();
  for (let index = 0; index < 7; index++) {
    for (const part of [1, 2]) {
      for (const symbol of store.getVariantSymbols(index, part)) store.markSymbolLearned(index, part, symbol);
    }
  }
  await feature.openVariant(2);
  const result = await feature.submitGuess(store.getProgress().challenge.targetSymbol);
  assert.equal(result.status, 'course-complete');
  await feature.openVariant(5);
  assert.equal(store.getProgress().challenge.courseCompleted, false);
  assert.ok(store.getProgress().challenge.targetSymbol);
});
