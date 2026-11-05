import { PRIMARY_ROWS, SECONDARY_ROWS } from '../data/fidelat-data.js';

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
      return this.exerciseResult;
    }

    if (this.exerciseIndex === this.exerciseOrder.length - 1) {
      this.exerciseComplete = true;
      this.exerciseIndex = null;
      this.exerciseResult = 'complete';
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
    const familyLabel = `Family ${String(this.familyIndex + 1).padStart(2, '0')}`;
    const exerciseTarget = this.exerciseIndex === null ? null : this.exerciseOrder[this.exerciseIndex];

    return `
      <section class='family-lesson-layout' aria-label='Alphabet family lesson'>
        <aside class='family-sidebar card'>
          <h2 class='family-sidebar-title'>Alphabet families</h2>
          <nav class='family-list' aria-label='Choose an alphabet family'>
            ${LETTER_FAMILIES.map((letters, index) => `
              <button class='family-nav-btn ${index === this.familyIndex ? 'is-active' : ''}'
                type='button' data-action='family-select' data-family-index='${index}'
                aria-current='${index === this.familyIndex ? 'true' : 'false'}'
                aria-label='Family ${index + 1}, beginning with ${letters[0]}'>
                <span>Family ${String(index + 1).padStart(2, '0')}</span><strong lang='ti'>${letters[0]}</strong>
              </button>
            `).join('')}
          </nav>
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
                <button class='secondary-btn' type='button' data-action='family-reading-continue'>Continue to reading practice</button>
              </div>
            ` : exerciseTarget === null ? `
              <button class='primary-btn' type='button' data-action='family-exercise-start'>Start exercise</button>
            ` : `
              <div class='exercise-prompt'>
                <button class='secondary-btn' type='button' data-action='family-exercise-prompt'>Play sound prompt</button>
                <span class='helper-copy' aria-live='polite'>${this.exerciseResult === 'advanced'
                  ? 'Correct! Listen to the next sound.'
                  : this.exerciseResult === 'try-again' ? 'Not that one. Listen again and try another form.' : 'Choose the matching form.'}</span>
              </div>
              <div class='exercise-choices' role='group' aria-label='Choose the matching form'>
                ${family.map(symbol => `
                  <button class='symbol-btn exercise-choice' type='button' data-action='family-exercise-answer'
                    data-symbol='${symbol}' aria-label='Choose ${symbol}'><span lang='ti'>${symbol}</span>                    </button>
                `).join('')}
              </div>
            `}
          </section>

          <section class='panel-card card reading-practice' id='family-reading-practice' aria-labelledby='reading-title'>
            <h3 class='activity-title' id='reading-title' tabindex='-1'>Reading practice</h3>
            <p class='panel-copy'>Read the family forms from left to right. This practice uses characters only; no unverified word examples are included.</p>
            <p class='reading-glyphs' lang='ti' aria-label='The seven forms of this family, in order'>${family.join(' ')}</p>
          </section>
        </section>
      </section>
    `;
  }
}
