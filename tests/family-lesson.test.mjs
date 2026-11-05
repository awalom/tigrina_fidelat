import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LETTER_FAMILIES, FamilyLessonFeature } from '../src/features/family-lesson.js';

const soundMap = JSON.parse(await readFile(new URL('../sounds.json', import.meta.url), 'utf8')).symbols;
const familyReadings = JSON.parse(await readFile(new URL('../src/data/readingPractice.json', import.meta.url), 'utf8'));

test('every configured family has seven forms in order and each form has root audio', () => {
  assert.equal(LETTER_FAMILIES.length, 27);
  for (const family of LETTER_FAMILIES) {
    assert.equal(family.length, 7);
    for (const symbol of family) assert.equal(typeof soundMap[symbol], 'string');
  }
  assert.deepEqual(LETTER_FAMILIES.find(family => family[0] === 'በ'), ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ']);
});

test('local reading file contains five same-family two- and three-form drills for every family', () => {
  assert.deepEqual(Object.keys(familyReadings), LETTER_FAMILIES.map(family => family[0]));
  for (const family of LETTER_FAMILIES) {
    const reading = familyReadings[family[0]];
    assert.equal(reading.readingOne.length, 5);
    assert.equal(reading.readingTwo.length, 5);
    assert.equal(typeof reading.readingThree, 'string');
    assert.ok(reading.readingThree.length > 0);
    assert.ok(reading.readingOne.every(word => [...word].length === 2 && [...word].every(symbol => family.includes(symbol))));
    assert.ok(reading.readingTwo.every(word => [...word].length === 3 && [...word].every(symbol => family.includes(symbol))));
    assert.ok([...reading.readingThree].filter(symbol => symbol !== ' ').every(symbol => family.includes(symbol)));
  }
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
  assert.equal(await lesson.answerExercise(lesson.family.find(symbol => symbol !== promptOrder[0])), 'wrong');
  assert.equal(lesson.exerciseIndex, 0);
  assert.equal(lesson.exerciseResult, 'try-again');
  assert.deepEqual(played.slice(-1), [promptOrder[0]]);
  const incorrectMarkup = lesson.render();
  assert.match(incorrectMarkup, /exercise-feedback is-incorrect/);
  assert.match(incorrectMarkup, /exercise-error-icon/);
  assert.match(incorrectMarkup, /Incorrect! Listen to the sound again/);
  for (const [index, symbol] of promptOrder.entries()) {
    assert.equal(lesson.exerciseOrder[lesson.exerciseIndex], symbol);
    const result = await lesson.answerExercise(symbol);
    assert.equal(result, index === promptOrder.length - 1 ? 'complete' : 'correct');
  }
  assert.equal(lesson.exerciseComplete, true);
  assert.equal(lesson.exerciseIndex, null);
  assert.deepEqual(played, ['ቤ', promptOrder[0], promptOrder[0], ...promptOrder.slice(1)]);
  assert.equal(lesson.selectFamily(999), false);
});

test('reading and rendered exercises include forms only from the chosen family', async () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  lesson.selectFamily(8);
  const initialMarkup = lesson.render();
  assert.match(initialMarkup, /<select class='selector family-selector' id='family-selector' data-action='family-select'>/);
  assert.equal((initialMarkup.match(/<option value='/g) || []).length, LETTER_FAMILIES.length);
  assert.match(initialMarkup, /<option value='8' selected>\s*Family 09 · በ/);
  assert.equal(lesson.continueToReadingPractice(), false);
  const lockedMarkup = lesson.render();
  assert.match(lockedMarkup, /reading-practice is-locked/);
  assert.match(lockedMarkup, /Complete the listening exercise/);
  assert.doesNotMatch(lockedMarkup, /class='reading-combination-card'/);
  await lesson.startExercise();
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  assert.equal(lesson.exerciseComplete, true);
  assert.equal(lesson.readingActive, false);
  const completedMarkup = lesson.render();
  assert.match(completedMarkup, /Continue to reading practice/);
  assert.doesNotMatch(completedMarkup, /class='reading-combination-card'/);
  assert.equal(lesson.continueToReadingPractice(), true);
  const markup = lesson.render();
  const lessonContent = markup.split("<section class='workspace family-lesson'")[1];
  for (const symbol of lesson.family) assert.match(lessonContent, new RegExp(symbol));
  assert.doesNotMatch(lessonContent, /ሀ|ሁ|ሂ|ሃ|ሄ|ህ|ሆ/);
  assert.doesNotMatch(markup, /Practice reading these combinations|not verified Tigrinya vocabulary words|The seven forms of this family/);
  assert.match(markup, /Reading practice/);
  const reading = markup.split("id='family-reading-practice'")[1];
  const readingLists = [...reading.matchAll(/<ol class='reading-combinations'[^>]*>([\s\S]*?)<\/ol>/g)];
  const readWords = list => [...list.matchAll(/<li class='reading-combination-card' lang='ti' dir='ltr'>([^<]+)<\/li>/g)].map(([, word]) => word);
  assert.deepEqual(readWords(readingLists[0][1]), familyReadings[lesson.family[0]].readingOne);
  assert.deepEqual(readWords(readingLists[1][1]), familyReadings[lesson.family[0]].readingTwo);
  assert.match(reading, new RegExp(`<p class='reading-paragraph' lang='ti' dir='ltr'>${familyReadings[lesson.family[0]].readingThree}</p>`));
  assert.match(reading, /Reading One/);
  assert.match(reading, /Reading Two/);
  assert.match(reading, /Reading Three/);
  assert.match(markup, /Repeat exercise/);
  assert.match(markup, /Continue to reading practice/);
});
