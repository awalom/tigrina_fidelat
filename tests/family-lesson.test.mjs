import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LESSON_STAGES, LETTER_FAMILIES, FamilyLessonFeature } from '../src/features/family-lesson.js';

const soundMap = JSON.parse(await readFile(new URL('../sounds.json', import.meta.url), 'utf8')).symbols;
const familyReadings = JSON.parse(await readFile(new URL('../src/data/readingPractice.json', import.meta.url), 'utf8'));

test('advanced reading presents 30 frequency-ranked words for every family', () => {
  assert.deepEqual(familyReadings['በ'].advancedReading[0], { word: 'ቤት', frequency: 142424 });
  assert.deepEqual(familyReadings['በ'].advancedReading.at(-1), { word: 'ባህሊ', frequency: 13491 });
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  for (const [familyIndex, family] of LETTER_FAMILIES.entries()) {
    const words = familyReadings[family[0]].advancedReading;
    assert.equal(words.length, 30, family[0]);
    assert.equal(new Set(words.map(item => item.word)).size, 30, family[0]);
    assert.ok(words.every(({ word, frequency }, index) =>
      family.includes(word[0]) && Number.isInteger(frequency) && frequency > 0
      && (index === 0 || words[index - 1].frequency >= frequency)), family[0]);

    lesson.selectFamily(familyIndex);
    assert.doesNotMatch(lesson.render(), /Advanced Reading/);
    for (let i = 0; i < 6; i += 1) assert.equal(lesson.moveStage(1), true);
    const markup = lesson.render();
    assert.match(markup, /Read the following words<\/h3>/);
    assert.doesNotMatch(markup, /Frequency:|advanced-reading-frequency|Read these frequent words/);
    const rendered = [...markup.matchAll(/<span class='advanced-reading-text' lang='ti' dir='ltr'>([^<]+)<\/span>/g)]
      .map(([, word]) => word);
    assert.deepEqual(rendered, words.map(({ word }) => word), family[0]);
  }
});

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
  lesson.moveStage(1);
  const listeningMarkup = lesson.render();
  assert.match(listeningMarkup, /exercise-feedback is-incorrect/);
  assert.match(listeningMarkup, /exercise-error-icon/);
  assert.match(listeningMarkup, /Incorrect! Listen to the sound again/);
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

test('family stages show the chosen family and one reading at a time', () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  lesson.selectFamily(8);
  const initialMarkup = lesson.render();
  assert.match(initialMarkup, /<select class='selector family-selector' id='family-selector' data-action='family-select'>/);
  assert.equal((initialMarkup.match(/<option value='/g) || []).length, LETTER_FAMILIES.length);
  assert.match(initialMarkup, /<option value='8' selected>\s*9th family · በ/);
  for (let i = 0; i < 3; i += 1) lesson.moveStage(1);
  const first = lesson.render();
  const readWords = markup => [...markup.matchAll(/<li class='reading-combination-card' lang='ti' dir='ltr'>([^<]+)<\/li>/g)].map(([, word]) => word);
  assert.deepEqual(readWords(first), familyReadings['በ'].readingOne);
  assert.doesNotMatch(first, /Reading Two pronunciation practice|reading-paragraph/);
  lesson.moveStage(1);
  assert.deepEqual(readWords(lesson.render()), familyReadings['በ'].readingTwo);
  lesson.moveStage(1);
  assert.match(lesson.render(), new RegExp(`<p class='reading-paragraph' lang='ti' dir='ltr'>${familyReadings['በ'].readingThree}</p>`));
});

async function listeningDone(index = 8, audio = { playSymbol: async () => {} }) {
  const lesson = new FamilyLessonFeature(audio);
  lesson.selectFamily(index);
  await lesson.startExercise();
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  lesson.moveStage(1);
  lesson.moveStage(1);
  return lesson;
}

test('next and previous navigate seven stages without completing exercises', () => {
  const lesson = new FamilyLessonFeature({ playSymbol: async () => {} });
  assert.equal(lesson.moveStage(-1), false);
  assert.equal(lesson.moveStage(2), false);
  for (const [index, name] of LESSON_STAGES.entries()) {
    const markup = lesson.render();
    assert.equal(lesson.stageIndex, index);
    assert.match(markup, new RegExp(`${index + 1} / 7 · ${name}`));
    assert.equal((markup.match(/class='panel-card card/g) || []).length, 1);
    if (index === 2) {
      assert.equal(lesson.orderingActive, true);
      assert.match(markup, /data-action='family-order-bank'/);
    }
    if (index < LESSON_STAGES.length - 1) assert.equal(lesson.moveStage(1), true);
  }
  assert.equal(lesson.moveStage(1), false);
  for (let index = 5; index >= 0; index -= 1) {
    assert.equal(lesson.moveStage(-1), true);
    assert.equal(lesson.stageIndex, index);
  }
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
  const ordering = markup.split("aria-labelledby='ordering-title'")[1];
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
  for (const [index, symbol] of lesson.family.entries().drop(1)) {
    const result = await lesson.placeOrderSymbol(symbol, index);
    assert.equal(result.status, index === 6 ? 'complete' : 'correct');
  }
  assert.equal(lesson.orderingComplete, true);
  assert.deepEqual(lesson.orderPlaced, lesson.family);
  const completedMarkup = lesson.render();
  assert.match(completedMarkup, /aria-label='Alphabet ordering completed'/);
  assert.match(completedMarkup, /Alphabet ordering complete!/);
  assert.equal(lesson.moveStage(1), true);
  assert.match(lesson.render(), /Reading One pronunciation practice/);
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

test('navigation and listening repeat preserve ordering; family changes reset the lesson', async () => {
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
  lesson.moveStage(1);
  lesson.moveStage(-1);
  assert.equal(lesson.orderingComplete, true);
  await lesson.startExercise();
  assert.equal(lesson.orderingActive, true);
  assert.equal(lesson.orderingComplete, true);
  for (const symbol of [...lesson.exerciseOrder]) await lesson.answerExercise(symbol);
  assert.equal(lesson.orderingActive, true);
  assert.equal(lesson.orderingComplete, true);
  lesson.selectFamily(0);
  assert.equal(lesson.orderingActive, false);
  assert.deepEqual(lesson.orderPlaced, []);
  assert.equal(lesson.stageIndex, 0);
});
