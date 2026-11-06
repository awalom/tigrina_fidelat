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

test('local reading file contains seven varied same-family two- and three-form drills for every family', () => {
  assert.deepEqual(Object.keys(familyReadings), LETTER_FAMILIES.map(family => family[0]));
  for (const family of LETTER_FAMILIES) {
    const reading = familyReadings[family[0]];
    assert.equal(reading.readingOne.length, 7);
    assert.equal(reading.readingTwo.length, 7);
    assert.equal(typeof reading.readingThree, 'string');
    assert.ok(reading.readingThree.length > 0);
    assert.ok(reading.readingOne.every(word => [...word].length === 2 && [...word].every(symbol => family.includes(symbol))));
    assert.ok(reading.readingTwo.every(word => [...word].length === 3 && [...word].every(symbol => family.includes(symbol))));
    assert.equal(new Set(reading.readingOne).size, 7);
    assert.equal(new Set(reading.readingTwo).size, 7);
    assert.deepEqual(new Set(reading.readingOne.join('')), new Set(family));
    assert.deepEqual(new Set(reading.readingTwo.join('')), new Set(family));
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
  assert.match(completedMarkup, /Order the alphabets/);
  assert.doesNotMatch(completedMarkup, /data-action='family-reading-continue'/);
  assert.doesNotMatch(completedMarkup, /class='reading-combination-card'/);
  assert.equal(lesson.continueToReadingPractice(), false);
  for (const [index, symbol] of lesson.family.entries()) await lesson.placeOrderSymbol(symbol, index);
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
  assert.match(markup, /aria-label='Repeat listening exercise'/);
  assert.match(markup, /aria-label='Continue to reading practice'/);
});

async function listeningDone(index = 8, audio = { playSymbol: async () => {} }) {
  const lesson = new FamilyLessonFeature(audio);
  lesson.selectFamily(index);
  await lesson.startExercise();
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  return lesson;
}

test('ordering exercise is locked until listening is complete and sits between listening and readings', async () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  lesson.selectFamily(8);
  assert.equal(lesson.startOrdering(), false);
  assert.equal(lesson.orderingActive, false);
  assert.equal(await (await lesson.placeOrderSymbol('ቡ', 1)).status, 'inactive');
  const markup = lesson.render();
  assert.ok(markup.indexOf('Listening exercise') < markup.indexOf('Order the alphabets'));
  assert.ok(markup.indexOf('Order the alphabets') < markup.indexOf('Reading practice'));
  assert.doesNotMatch(markup, /data-action='family-order-bank'/);
  assert.match(markup, /lesson-icon/);
  assert.doesNotMatch(markup, /aria-label='Listening completed'/);
  assert.doesNotMatch(markup, /aria-label='Alphabet ordering completed'/);
});

test('skipping listening unlocks alphabet ordering while keeping reading locked', async () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  lesson.selectFamily(8);
  const initialMarkup = lesson.render();
  assert.match(initialMarkup, /data-action='family-listening-skip'/);
  assert.match(initialMarkup, /aria-label='Skip listening and go to alphabet ordering'/);
  assert.match(initialMarkup, /data-action='family-listening-skip'[\s\S]*?<svg class='lesson-icon/);
  assert.equal(lesson.skipListeningToOrdering(), true);
  assert.equal(lesson.skipListeningToOrdering(), false);
  assert.equal(lesson.listeningSkipped, true);
  assert.equal(lesson.exerciseComplete, false);
  assert.equal(lesson.orderingActive, true);
  assert.deepEqual([...lesson.orderBank].sort(), [...lesson.family].sort());
  assert.equal(lesson.orderingComplete, false);
  assert.equal(lesson.readingActive, false);
  assert.equal(lesson.continueToReadingPractice(), false);
  const markup = lesson.render();
  assert.match(markup, /Listening skipped\. Continue with alphabet ordering/);
  assert.match(markup, /Listening skipped\. Drag each letter/);
  assert.match(markup, /Complete the “Order the alphabets” exercise/);
  assert.doesNotMatch(markup, /Reading One pronunciation practice/);
  assert.doesNotMatch(markup, /data-action='family-listening-skip'/);
  assert.match(markup, /data-action='family-order-bank'/);
  for (const [index, symbol] of lesson.family.entries()) {
    await lesson.placeOrderSymbol(symbol, index);
  }
  assert.equal(lesson.orderingComplete, true);
  assert.equal(lesson.continueToReadingPractice(), true);
  assert.equal(lesson.readingActive, true);
  await lesson.startExercise();
  assert.equal(lesson.listeningSkipped, false);
  assert.equal(lesson.readingActive, false);
});

test('ordering bank is a family-scoped shuffle that is never already sorted', async () => {
  const lesson = await listeningDone(8);
  assert.equal(lesson.orderingActive, true);
  assert.deepEqual([...lesson.orderBank].sort(), [...lesson.family].sort());
  assert.notDeepEqual(lesson.orderBank, lesson.family);
  const identity = lesson.shuffleFamily(() => 0.999999);
  assert.notDeepEqual(identity, lesson.family);
  assert.deepEqual(new Set(identity), new Set(lesson.family));
  const markup = lesson.render();
  const ordering = markup.split("aria-labelledby='ordering-title'")[1].split("id='family-reading-practice'")[0];
  assert.equal((ordering.match(/data-action='family-order-bank'/g) || []).length, 7);
  assert.equal((ordering.match(/data-action='family-order-slot'/g) || []).length, 7);
  assert.match(ordering, /aria-label='Shuffle letters again' title='Shuffle letters again'><svg class='lesson-icon/);
  assert.doesNotMatch(ordering, /ሀ|ሁ|ሂ|ሃ|ሄ|ህ|ሆ/);
});

test('ordering accepts correct drops, rejects wrong drops, and completes only when all are placed', async () => {
  const played = [];
  const lesson = await listeningDone(8, { playSymbol: async s => { played.push(s); } });
  played.length = 0;
  const wrong = await lesson.placeOrderSymbol('ቡ', 0);
  assert.equal(wrong.status, 'wrong-slot');
  assert.equal(lesson.orderPlaced[0], null);
  assert.match(lesson.render(), /exercise-feedback is-incorrect/);
  assert.equal((await lesson.placeOrderSymbol('ሀ', 0)).status, 'invalid');
  assert.equal((await lesson.placeOrderSymbol('በ', 7)).status, 'invalid');
  assert.equal((await lesson.placeOrderSymbol('በ', 0)).status, 'correct');
  assert.deepEqual(played, ['በ']);
  assert.equal((await lesson.placeOrderSymbol('በ', 0)).status, 'occupied');
  assert.equal(lesson.orderingComplete, false);
  assert.equal(lesson.continueToReadingPractice(), false);
  for (const [index, symbol] of lesson.family.entries().drop(1)) {
    const result = await lesson.placeOrderSymbol(symbol, index);
    assert.equal(result.status, index === 6 ? 'complete' : 'correct');
  }
  assert.equal(lesson.orderingComplete, true);
  assert.deepEqual(lesson.orderPlaced, lesson.family);
  const completedMarkup = lesson.render();
  assert.match(completedMarkup, /data-action='family-reading-continue'/);
  assert.match(completedMarkup, /aria-label='Listening completed'/);
  assert.match(completedMarkup, /aria-label='Alphabet ordering completed'/);
  assert.match(completedMarkup, /Alphabet ordering complete!/);
  assert.equal(lesson.readingActive, false);
  assert.equal(lesson.continueToReadingPractice(), true);
  assert.equal(lesson.readingActive, true);
});

test('ordering reports audio playback failures without hiding them', async () => {
  let failPlayback = false;
  const lesson = await listeningDone(8, { playSymbol: async () => {
    if (failPlayback) throw new Error('Audio playback failed.');
  } });
  failPlayback = true;
  await assert.rejects(lesson.placeOrderSymbol(lesson.family[0], 0), /Audio playback failed/);
  assert.equal(lesson.orderPlaced[0], lesson.family[0]);
  assert.equal(lesson.orderingComplete, false);
});

test('tap selection, restart, repeat, and family change reset ordering and re-lock readings', async () => {
  const lesson = await listeningDone(8);
  assert.equal(lesson.selectOrderSymbol('ሀ'), false);
  assert.equal(lesson.selectOrderSymbol('ቢ'), true);
  assert.equal(lesson.orderSelected, 'ቢ');
  await lesson.placeOrderSymbol('ቢ', 2);
  assert.equal(lesson.selectOrderSymbol('ቢ'), false);
  lesson.restartOrdering();
  assert.deepEqual(lesson.orderPlaced, Array(7).fill(null));
  assert.equal(lesson.orderSelected, null);
  for (const [index, symbol] of lesson.family.entries()) await lesson.placeOrderSymbol(symbol, index);
  lesson.continueToReadingPractice();
  assert.equal(lesson.readingActive, true);
  await lesson.startExercise();
  assert.equal(lesson.readingActive, false);
  assert.equal(lesson.orderingActive, false);
  assert.equal(lesson.orderingComplete, false);
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  assert.equal(lesson.orderingActive, true);
  assert.equal(lesson.orderingComplete, false);
  lesson.selectFamily(0);
  assert.equal(lesson.orderingActive, false);
  assert.deepEqual(lesson.orderPlaced, []);
  assert.equal(lesson.readingActive, false);
});
