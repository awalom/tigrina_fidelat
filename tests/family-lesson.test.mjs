import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LETTER_FAMILIES, FamilyLessonFeature } from '../src/features/family-lesson.js';

const soundMap = JSON.parse(await readFile(new URL('../sounds.json', import.meta.url), 'utf8')).symbols;

test('every configured family has seven forms in order and each form has root audio', () => {
  assert.equal(LETTER_FAMILIES.length, 27);
  for (const family of LETTER_FAMILIES) {
    assert.equal(family.length, 7);
    for (const symbol of family) assert.equal(typeof soundMap[symbol], 'string');
  }
  assert.deepEqual(LETTER_FAMILIES.find(family => family[0] === 'በ'), ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ']);
});

test('family selection scopes playback and exercise answers to the selected family', async () => {
  const played = [];
  const audio = { playSymbol: async symbol => { played.push(symbol); } };
  const lesson = new FamilyLessonFeature(audio);
  lesson.selectFamily(8);
  assert.deepEqual(lesson.family, ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ']);
  await lesson.playSymbol('ቤ');
  await assert.rejects(lesson.playSymbol('ሀ'), /selected family/);
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    await lesson.startExercise();
  } finally {
    Math.random = originalRandom;
  }
  const promptOrder = [...lesson.exerciseOrder];
  assert.equal(new Set(promptOrder).size, 7);
  assert.notDeepEqual(promptOrder, lesson.family);
  assert.equal(await lesson.answerExercise(lesson.family.find(symbol => symbol !== promptOrder[0])), 'try-again');
  for (const [index, symbol] of promptOrder.entries()) {
    assert.equal(lesson.exerciseOrder[lesson.exerciseIndex], symbol);
    const result = await lesson.answerExercise(symbol);
    assert.equal(result, index === promptOrder.length - 1 ? 'complete' : 'correct');
  }
  assert.equal(lesson.exerciseComplete, true);
  assert.equal(lesson.exerciseIndex, null);
  assert.deepEqual(played, ['ቤ', promptOrder[0], ...promptOrder.slice(1)]);
  assert.equal(lesson.selectFamily(999), false);
});

test('reading and rendered exercises include forms only from the chosen family', async () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  lesson.selectFamily(8);
  await lesson.startExercise();
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  const markup = lesson.render();
  const lessonContent = markup.split("<section class='workspace family-lesson'")[1];
  for (const symbol of lesson.family) assert.match(lessonContent, new RegExp(symbol));
  assert.doesNotMatch(lessonContent, /ሀ|ሁ|ሂ|ሃ|ሄ|ህ|ሆ/);
  assert.match(markup, /Reading practice/);
  assert.match(markup, /Repeat exercise/);
  assert.match(markup, /Continue to reading practice/);
});
