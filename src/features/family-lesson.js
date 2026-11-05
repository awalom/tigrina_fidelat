import { PRIMARY_ROWS, SECONDARY_ROWS } from '../data/fidelat-data.js';
import familyReadings from '../data/readingPractice.json' with { type: 'json' };

export const LETTER_FAMILIES = [...PRIMARY_ROWS, ...SECONDARY_ROWS];
export const FORM_ORDER = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

export class FamilyLessonFeature {
  constructor(audio) {
    this.audio = audio;
    this.familyIndex = 0;
    this.exerciseOrder = [];
    this.exerciseIndex = null;
    this.exerciseResult = '';
    this.exerciseComplete = false;
    this.listeningSkipped = false;
    this.resetOrdering();
    this.readingActive = false;
  }

  get family() {
    return LETTER_FAMILIES[this.familyIndex];
  }

  selectFamily(index) {
    if (!Number.isInteger(index) || !LETTER_FAMILIES[index]) return false;
    this.familyIndex = index;
    this.exerciseOrder = [];
    this.exerciseIndex = null;
    this.exerciseResult = '';
    this.exerciseComplete = false;
    this.listeningSkipped = false;
    this.resetOrdering();
    this.readingActive = false;
    return true;
  }

  skipListeningToOrdering() {
    if (this.exerciseComplete || this.listeningSkipped) return false;
    this.listeningSkipped = true;
    this.startOrdering();
    return true;
  }

  resetOrdering() {
    this.orderBank = [];
    this.orderPlaced = [];
    this.orderSelected = null;
    this.orderResult = '';
    this.orderingComplete = false;
  }

  // Shuffles the seven family letters; never returns the correct sequence.
  shuffleFamily(random = Math.random) {
    const letters = [...this.family];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      for (let index = letters.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
      }
      if (letters.some((symbol, index) => symbol !== this.family[index])) return letters;
    }
    return [...this.family.slice(1), this.family[0]];
  }

  startOrdering(random = Math.random) {
    if (!this.exerciseComplete && !this.listeningSkipped) return false;
    this.orderBank = this.shuffleFamily(random);
    this.orderPlaced = Array(this.family.length).fill(null);
    this.orderSelected = null;
    this.orderResult = '';
    this.orderingComplete = false;
    return true;
  }

  get orderingActive() {
    return (this.exerciseComplete || this.listeningSkipped) && this.orderBank.length > 0;
  }

  selectOrderSymbol(symbol) {
    if (!this.orderingActive || this.orderingComplete || !this.orderBank.includes(symbol)) return false;
    if (this.orderPlaced.includes(symbol)) return false;
    this.orderSelected = symbol;
    this.orderResult = '';
    return true;
  }

  async placeOrderSymbol(symbol, slotIndex) {
    if (!this.orderingActive || this.orderingComplete) return { ok: false, status: 'inactive' };
    if (!this.orderBank.includes(symbol) || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.family.length) {
      return { ok: false, status: 'invalid' };
    }
    if (this.orderPlaced[slotIndex] || this.orderPlaced.includes(symbol)) return { ok: false, status: 'occupied' };
    if (symbol !== this.family[slotIndex]) {
      this.orderSelected = symbol;
      this.orderResult = 'wrong';
      return { ok: false, status: 'wrong-slot', message: `${symbol} does not belong in position ${slotIndex + 1}. Try another place.` };
    }
    this.orderPlaced[slotIndex] = symbol;
    this.orderSelected = null;
    await this.audio.playSymbol(symbol);
    if (this.orderPlaced.every(Boolean)) {
      this.orderingComplete = true;
      this.orderResult = 'complete';
      return { ok: true, status: 'complete', message: 'All seven letters are in order!' };
    }
    this.orderResult = 'correct';
    return { ok: true, status: 'correct', message: 'Correct! Keep placing the rest of the letters.' };
  }

  restartOrdering(random = Math.random) {
    return this.startOrdering(random);
  }

  continueToReadingPractice() {
    if ((!this.exerciseComplete && !this.listeningSkipped) || !this.orderingComplete) return false;
    this.readingActive = true;
    return true;
  }

  async startExercise() {
    this.exerciseOrder = [...this.family];
    for (let index = this.exerciseOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this.exerciseOrder[index], this.exerciseOrder[swapIndex]] =
        [this.exerciseOrder[swapIndex], this.exerciseOrder[index]];
    }
    this.exerciseIndex = 0;
    this.exerciseComplete = false;
    this.listeningSkipped = false;
    this.resetOrdering();
    this.readingActive = false;
    this.exerciseResult = '';
    await this.playExercisePrompt();
    return this.family[this.exerciseIndex];
  }

  async playExercisePrompt() {
    if (this.exerciseIndex === null || this.exerciseComplete) {
      throw new Error('Start the exercise before playing its prompt.');
    }
    return this.audio.playSymbol(this.exerciseOrder[this.exerciseIndex]);
  }

  async answerExercise(symbol) {
    if (this.exerciseIndex === null || this.exerciseComplete || !this.family.includes(symbol)) return 'invalid';
    const correct = symbol === this.exerciseOrder[this.exerciseIndex];
    if (!correct) {
      this.exerciseResult = 'try-again';
      await this.playExercisePrompt();
      return 'wrong';
    }

    if (this.exerciseIndex === this.exerciseOrder.length - 1) {
      this.exerciseComplete = true;
      this.exerciseIndex = null;
      this.exerciseResult = 'complete';
      this.startOrdering();
      return 'complete';
    }

    this.exerciseIndex += 1;
    await this.playExercisePrompt();
    this.exerciseResult = 'advanced';
    return 'correct';
  }

  async playSymbol(symbol) {
    if (!this.family.includes(symbol)) throw new Error('Choose a form from the selected family.');
    return this.audio.playSymbol(symbol);
  }

  render() {
    const family = this.family;
    const reading = familyReadings[family[0]];
    if (!reading) throw new Error(`Reading material is missing for alphabet family ${family[0]}.`);
    const familyLabel = `Family ${String(this.familyIndex + 1).padStart(2, '0')}`;
    const exerciseTarget = this.exerciseIndex === null ? null : this.exerciseOrder[this.exerciseIndex];

    return `
      <section class='family-lesson-layout' aria-label='Alphabet family lesson'>
        <aside class='family-sidebar card'>
          <h2 class='family-sidebar-title'>Alphabet families</h2>
          <label class='family-selector-label' for='family-selector'>Choose a family</label>
          <select class='selector family-selector' id='family-selector' data-action='family-select'>
            ${LETTER_FAMILIES.map((letters, index) => `
              <option value='${index}' ${index === this.familyIndex ? 'selected' : ''}>
                Family ${String(index + 1).padStart(2, '0')} · ${letters[0]}
              </option>
            `).join('')}
          </select>
        </aside>

        <section class='workspace family-lesson' aria-labelledby='family-lesson-title'>
          <header class='workspace-top'>
            <div>
              <div class='activity-badge'>${familyLabel}</div>
              <h2 class='view-title' id='family-lesson-title'>${familyLabel} · <span lang='ti'>${family[0]}</span></h2>
              <p class='panel-copy'>Explore this family’s seven forms in order. Select a form to play its configured audio.</p>
            </div>
          </header>

          <section class='panel-card card' aria-labelledby='forms-title'>
            <h3 class='activity-title' id='forms-title'>Seven forms</h3>
            <ol class='family-forms'>
              ${family.map((symbol, index) => `
                <li>
                  <button class='family-form-btn' type='button' data-action='family-play' data-symbol='${symbol}'
                    aria-label='Play ${FORM_ORDER[index]} form, ${symbol}'>
                    <span class='family-form-order'>${FORM_ORDER[index]}</span><strong lang='ti'>${symbol}</strong><span class='family-play-label'>Play sound</span>
                  </button>
                </li>
              `).join('')}
            </ol>
          </section>

          <section class='panel-card card family-exercise' aria-labelledby='exercise-title'>
            <h3 class='activity-title' id='exercise-title'>Listening exercise</h3>
            <p class='panel-copy'>Listen to a form from this family, then choose the matching character.</p>
            ${this.exerciseComplete ? `
              <p class='helper-copy' role='status'>You answered all seven forms correctly!</p>
              <div class='activity-actions'>
                <button class='primary-btn' type='button' data-action='family-exercise-repeat'>Repeat exercise</button>
              </div>
            ` : this.listeningSkipped ? `
              <p class='helper-copy' role='status'>Listening exercise skipped. Continue with the alphabet ordering exercise below.</p>
              <div class='activity-actions'>
                <button class='primary-btn' type='button' data-action='family-exercise-start'>Practice listening</button>
              </div>
            ` : exerciseTarget === null ? `
              <button class='primary-btn' type='button' data-action='family-exercise-start'>Start exercise</button>
            ` : `
              <div class='exercise-prompt'>
                <button class='secondary-btn' type='button' data-action='family-exercise-prompt'>Play sound prompt</button>
                <span class='helper-copy exercise-feedback ${this.exerciseResult === 'try-again' ? 'is-incorrect' : ''}' aria-live='polite'>${this.exerciseResult === 'advanced'
                  ? 'Correct! Listen to the next sound.'
                  : this.exerciseResult === 'try-again' ? '<span class="exercise-error-icon" aria-hidden="true">✕</span> Incorrect! Listen to the sound again and try once more.' : 'Choose the matching form.'}</span>
              </div>
              <div class='exercise-choices' role='group' aria-label='Choose the matching form'>
                ${family.map(symbol => `
                  <button class='symbol-btn exercise-choice' type='button' data-action='family-exercise-answer'
                    data-symbol='${symbol}' aria-label='Choose ${symbol}'><span lang='ti'>${symbol}</span>                    </button>
                `).join('')}
              </div>
            `}
            ${!this.exerciseComplete && !this.listeningSkipped ? `
              <div class='activity-actions'>
                <button class='ghost-btn' type='button' data-action='family-listening-skip'>Skip listening and go to alphabet ordering</button>
              </div>
            ` : ''}
          </section>

          <section class='panel-card card family-ordering' aria-labelledby='ordering-title'>
            <h3 class='activity-title' id='ordering-title'>Order the alphabets</h3>
            ${!this.orderingActive ? `
              <p class='helper-copy'>Complete the listening exercise to unlock this exercise.</p>
            ` : `
              <p class='panel-copy'>${this.listeningSkipped ? 'Listening skipped. ' : ''}Drag each letter into its place, or select a letter and then select a place. Put the seven forms in order.</p>
              <p class='helper-copy exercise-feedback ${this.orderResult === 'wrong' ? 'is-incorrect' : ''}' role='status' aria-live='polite'>${
                this.orderingComplete ? 'Well done! The letters are in the correct order.'
                : this.orderResult === 'wrong' ? '<span class="exercise-error-icon" aria-hidden="true">✕</span> That letter belongs somewhere else. Try again.'
                : this.orderResult === 'correct' ? 'Correct! Place the next letter.' : 'Place the letters in order.'}</p>
              <div class='drop-grid' role='group' aria-label='Letter order'>
                ${family.map((symbol, index) => `
                  <button class='drop-slot ${this.orderPlaced[index] ? 'is-filled' : ''}' type='button'
                    data-action='family-order-slot' data-slot='${index}'
                    aria-label='Position ${index + 1}, ${this.orderPlaced[index] ? this.orderPlaced[index] : 'empty'}'>
                    <span class='drop-label'>${index + 1}</span>
                    <span class='drop-value' lang='ti'>${this.orderPlaced[index] || '...'}</span>
                  </button>
                `).join('')}
              </div>
              <div class='drag-bank' role='group' aria-label='Shuffled letters'>
                ${this.orderBank.filter(symbol => !this.orderPlaced.includes(symbol)).map(symbol => `
                  <button class='symbol-btn ${this.orderSelected === symbol ? 'is-correct' : ''}' type='button' draggable='true'
                    data-action='family-order-bank' data-symbol='${symbol}' aria-pressed='${this.orderSelected === symbol}'
                    aria-label='Letter ${symbol}'><span lang='ti'>${symbol}</span></button>
                `).join('')}
              </div>
              <div class='activity-actions'>
                <button class='ghost-btn' type='button' data-action='family-order-restart'>Shuffle again</button>
                ${this.orderingComplete ? `<button class='secondary-btn' type='button' data-action='family-reading-continue'>Continue to reading practice</button>` : ''}
              </div>
            `}
          </section>

          <section class='panel-card card reading-practice ${this.readingActive ? 'is-active' : 'is-locked'}'
            id='family-reading-practice' aria-label='Reading practice' aria-disabled='${!this.readingActive}'>
            ${this.readingActive ? `
              <h4 class='activity-title' tabindex='-1'>Reading One</h4>
              <ol class='reading-combinations' aria-label='Reading One pronunciation practice'>
                ${reading.readingOne.map(word => `<li class='reading-combination-card' lang='ti' dir='ltr'>${word}</li>`).join('')}
              </ol>
              <h4 class='activity-title'>Reading Two</h4>
              <ol class='reading-combinations' aria-label='Reading Two pronunciation practice'>
                ${reading.readingTwo.map(word => `<li class='reading-combination-card' lang='ti' dir='ltr'>${word}</li>`).join('')}
              </ol>
              <h4 class='activity-title'>Reading Three</h4>
              <p class='reading-paragraph' lang='ti' dir='ltr'>${reading.readingThree}</p>
            ` : `
              <div class='reading-lock-notice' role='status'>
                <h4 class='activity-title'>Reading One</h4>
                <h4 class='activity-title'>Reading Two</h4>
                <h4 class='activity-title'>Reading Three</h4>
                <p class='helper-copy'>${this.listeningSkipped
                  ? 'Complete the “Order the alphabets” exercise, then select “Continue to reading practice” to unlock all three readings.'
                  : 'Complete the listening exercise and the “Order the alphabets” exercise, then select “Continue to reading practice” to unlock all three readings.'}</p>
              </div>
            `}
          </section>
        </section>
      </section>
    `;
  }
}
