import { VARIANT_NAMES } from '../data/fidelat-data.js';

function shuffle(list) {
  return [...list]
    .map((item) => ({ item, weight: Math.random() }))
    .sort((a, b) => a.weight - b.weight)
    .map((entry) => entry.item);
}

export class ListenMatchFeature {
  constructor(store, audio) {
    this.store = store;
    this.audio = audio;
  }

  getPlayableSymbols(variantIndex, part) {
    return this.store
      .getVariantSymbols(variantIndex, part)
      .filter((symbol) => this.audio.hasAudio(symbol));
  }

  getPreferredPart(variantIndex) {
    return this.store.getPartProgress(variantIndex, 1).length >= this.store.getVariantSymbols(variantIndex, 1).length ? 2 : 1;
  }

  async openVariant(variantIndex) {
    if (!this.store.isVariantUnlocked(variantIndex)) return;

    const part = this.getPreferredPart(variantIndex);
    this.store.updateChallenge({
      variantIndex,
      part,
      targetSymbol: null,
      currentChoices: [],
      lastOutcome: null,
      unlockReadyVariantIndex: null,
      courseCompleted: false,
      celebrationText: ''
    });

    await this.startRound(true);
  }

  async openNextVariant() {
    const { unlockReadyVariantIndex } = this.store.getProgress().challenge;
    if (typeof unlockReadyVariantIndex !== 'number') {
      throw new Error('Choose a variant from the dropdown to continue.');
    }

    await this.openVariant(unlockReadyVariantIndex);
  }

  async startRound(forceNew = false) {
    const challenge = this.store.getProgress().challenge;
    const playable = this.getPlayableSymbols(challenge.variantIndex, challenge.part);
    if (!playable.length) {
      throw new Error('This set does not have playable audio yet. Add more recordings to sounds.json first.');
    }

    const progress = this.store.getPartProgress(challenge.variantIndex, challenge.part);
    const remaining = playable.filter((symbol) => !progress.includes(symbol));
    const pool = remaining.length ? remaining : playable;
    const targetSymbol = forceNew || !playable.includes(challenge.targetSymbol)
      ? pool[Math.floor(Math.random() * pool.length)]
      : challenge.targetSymbol;

    const choices = shuffle(playable).slice(0, Math.min(8, playable.length));
    if (!choices.includes(targetSymbol)) {
      choices[Math.floor(Math.random() * choices.length)] = targetSymbol;
    }

    this.store.updateChallenge({
      targetSymbol,
      currentChoices: shuffle(choices),
      lastOutcome: null,
      unlockReadyVariantIndex: null,
      courseCompleted: false,
      celebrationText: ''
    });

    await this.audio.playSymbol(targetSymbol);
  }

  async replayPrompt() {
    const { targetSymbol, unlockReadyVariantIndex, courseCompleted, celebrationText } = this.store.getProgress().challenge;
    if (typeof unlockReadyVariantIndex === 'number' || courseCompleted) {
      throw new Error(celebrationText || 'Choose a variant from the dropdown to continue.');
    }

    if (!targetSymbol) {
      await this.startRound(true);
      return;
    }

    await this.audio.playSymbol(targetSymbol);
  }

  async submitGuess(symbol) {
    const challenge = this.store.getProgress().challenge;
    if (!challenge.targetSymbol) {
      if (typeof challenge.unlockReadyVariantIndex === 'number' || challenge.courseCompleted) {
        return {
          ok: false,
          status: 'blocked',
          message: challenge.celebrationText || 'Choose a variant from the dropdown to continue.'
        };
      }

      await this.startRound(true);
      return { ok: false, status: 'prompt-started', message: 'A new sound was prepared. Listen first, then choose a symbol.' };
    }

    const rounds = challenge.rounds + 1;
    const correct = symbol === challenge.targetSymbol;
    const patch = {
      rounds,
      lastOutcome: correct ? 'correct' : 'wrong',
      correctStreak: correct ? challenge.correctStreak + 1 : 0
    };

    if (!correct) {
      this.store.updateChallenge(patch);
      return { ok: false, status: 'wrong', message: 'Not quite. Listen again and try another symbol.' };
    }

    patch.score = challenge.score + 1;
    this.store.markSymbolLearned(challenge.variantIndex, challenge.part, symbol);
    this.audio.playSuccessTone();

    const partProgress = this.store.getPartProgress(challenge.variantIndex, challenge.part);
    const symbolsInPart = this.store.getVariantSymbols(challenge.variantIndex, challenge.part);
    const partComplete = partProgress.length >= symbolsInPart.length;

    if (partComplete && challenge.part === 1) {
      patch.part = 2;
      patch.targetSymbol = null;
      patch.currentChoices = [];
      this.store.updateChallenge(patch);
      return {
        ok: true,
        status: 'part-advanced',
        message: 'Excellent. Part 1 is complete. Part 2 is starting now.'
      };
    }

    if (partComplete && challenge.part === 2) {
      patch.targetSymbol = null;
      patch.currentChoices = [];

      const nextVariantIndex = Array.from({ length: VARIANT_NAMES.length }, (_, offset) =>
        (challenge.variantIndex + offset + 1) % VARIANT_NAMES.length
      ).find(index => !this.store.isVariantCompleteByIndex(index));
      if (nextVariantIndex !== undefined) {
        patch.unlockReadyVariantIndex = nextVariantIndex;
        patch.courseCompleted = false;
        patch.celebrationText = `${VARIANT_NAMES[challenge.variantIndex]} is complete. Choose any variant, or continue with ${VARIANT_NAMES[nextVariantIndex]}.`;
        this.store.updateChallenge(patch);
        return {
          ok: true,
          status: 'variant-complete',
          nextVariantIndex,
          message: patch.celebrationText
        };
      }

      patch.unlockReadyVariantIndex = null;
      patch.courseCompleted = true;
      patch.celebrationText = 'Wonderful work. All variants are complete.';
      this.store.updateChallenge(patch);
      return {
        ok: true,
        status: 'course-complete',
        message: patch.celebrationText
      };
    }

    patch.targetSymbol = null;
    patch.currentChoices = [];
    this.store.updateChallenge(patch);
    return { ok: true, status: 'continue', message: 'Correct. A new sound is ready.' };
  }

  render(audioReady) {
    const activeProfile = this.store.getActiveProfile();
    const { challenge } = this.store.getProgress();
    const targetPrepared = Boolean(challenge.targetSymbol);
    const celebrationActive = typeof challenge.unlockReadyVariantIndex === 'number' || challenge.courseCompleted;
    const variantOptions = VARIANT_NAMES.map((name, index) =>
      `<option value='${index}' ${index === challenge.variantIndex ? 'selected' : ''}>${name}</option>`
    ).join('');

    const titleText = this.store.getText('challenge.title', {}, activeProfile);
    const titleEnglish = this.store.getEnglishSupportText('challenge.title', {}, activeProfile);
    const introText = this.store.getText('challenge.intro', {}, activeProfile);
    const introEnglish = this.store.getEnglishSupportText('challenge.intro', {}, activeProfile);
    const unlockEnglish = typeof challenge.unlockReadyVariantIndex === 'number'
      ? this.store.getEnglishSupportText('challenge.unlockBody', {
          nextVariantName: VARIANT_NAMES[challenge.unlockReadyVariantIndex]
        }, activeProfile)
      : '';
    const finalEnglish = challenge.courseCompleted
      ? this.store.getEnglishSupportText('challenge.finalBody', {}, activeProfile)
      : '';
    const message = !audioReady
      ? this.store.getText('challenge.loadingMessage', {}, activeProfile)
      : targetPrepared
        ? this.store.getText('challenge.readyMessage', {}, activeProfile)
        : celebrationActive
          ? challenge.celebrationText
          : this.store.getText('challenge.waitingMessage', {}, activeProfile);

    const partProgress = this.store.getPartProgress(challenge.variantIndex, challenge.part).length;
    const partTotal = this.store.getVariantSymbols(challenge.variantIndex, challenge.part).length;
    const choices = celebrationActive
      ? []
      : challenge.currentChoices.length
        ? challenge.currentChoices
        : this.getPlayableSymbols(challenge.variantIndex, challenge.part);

    const unlockPanel = typeof challenge.unlockReadyVariantIndex === 'number'
      ? `
        <div class='celebration-card challenge-celebration'>
          <div class='activity-badge'>Variant Complete</div>
          <h3 class='activity-title'>${VARIANT_NAMES[challenge.variantIndex]} is complete.</h3>
          <p class='activity-copy'>${this.store.getText('challenge.unlockBody', {
            nextVariantName: VARIANT_NAMES[challenge.unlockReadyVariantIndex]
          }, activeProfile)}</p>
          ${unlockEnglish ? `<p class='english-copy'>${unlockEnglish}</p>` : ''}
          <div class='activity-actions'>
            <button class='primary-btn' type='button' data-action='challenge-next'>Continue with ${VARIANT_NAMES[challenge.unlockReadyVariantIndex]}</button>
          </div>
        </div>
      `
      : challenge.courseCompleted
        ? `
          <div class='celebration-card challenge-celebration is-final'>
            <div class='activity-badge'>All Variants Complete</div>
            <h3 class='activity-title'>Wonderful work!</h3>
            <p class='activity-copy'>${this.store.getText('challenge.finalBody', {}, activeProfile)}</p>
            ${finalEnglish ? `<p class='english-copy'>${finalEnglish}</p>` : ''}
          </div>
        `
        : '';

    return `
      <section class='workspace'>
        <div class='workspace-top'>
          <div>
            <h2 class='view-title'>${titleText}</h2>
            ${titleEnglish ? `<p class='english-copy'>${titleEnglish}</p>` : ''}
            <p class='panel-copy'>${introText}</p>
            ${introEnglish ? `<p class='english-copy'>${introEnglish}</p>` : ''}
          </div>
          <div class='mode-nav'>
            <button class='secondary-btn challenge-repeat-btn' type='button' data-action='challenge-play' aria-label='Repeat sound' title='Repeat sound' ${audioReady && !celebrationActive ? '' : 'disabled'}>
              <svg class='lesson-icon' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' focusable='false'><path d='m17 2 4 4-4 4'/><path d='M3 11V9a3 3 0 0 1 3-3h15'/><path d='m7 22-4-4 4-4'/><path d='M21 13v2a3 3 0 0 1-3 3H3'/></svg>
            </button>
          </div>
        </div>

        ${unlockPanel}

        <section class='panel-card card'>
          <div class='stat-strip'>
            <div class='stat-pill'><strong>${challenge.score}</strong>Score</div>
            <div class='stat-pill'><strong>${challenge.rounds}</strong>Rounds</div>
            <div class='stat-pill'><strong>${this.store.getAccuracy()}%</strong>Accuracy</div>
            <div class='stat-pill'><strong>${partProgress}/${partTotal}</strong>Part Progress</div>
          </div>

          <div class='challenge-streak' role='status' aria-label='${challenge.correctStreak} correct answers in a row'>
            <span class='challenge-streak-star' aria-hidden='true'>★</span>
            <span><strong>${challenge.correctStreak}</strong> in a row!</span>
          </div>

          <div class='panel-head'>
            <div>
              <strong>${VARIANT_NAMES[challenge.variantIndex]} - Part ${challenge.part}</strong>
              <p class='panel-copy'>${message}</p>
            </div>
          </div>

          <div class='selector-row'>
            <label>
              <span class='field-label'>Variant</span>
              <select class='selector' data-action='challenge-variant-select' ${audioReady ? '' : 'disabled'}>
                ${variantOptions}
              </select>
            </label>
          </div>

          ${choices.length
            ? `
              <div class='letter-grid'>
                ${choices.map((symbol) => `
                  <button class='symbol-btn' type='button' data-action='challenge-guess' data-symbol='${symbol}'>${symbol}</button>
                `).join('')}
              </div>
            `
            : ''}
        </section>
      </section>
    `;
  }
}
