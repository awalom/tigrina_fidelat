import { SECTION_HASHES, parsePracticeRoute, practiceHash, practiceOptions } from './src/services/practice-route.js';
import { VARIANT_NAMES } from './src/data/fidelat-data.js';
import { ProgressStore } from './src/core/progress-store.js';
import { AlphabetExplorerFeature } from './src/features/alphabet-explorer.js';
import { FamilyLessonFeature } from './src/features/family-lesson.js?v=lesson-stages-1';
import { DragDropFeature } from './src/features/drag-drop.js';
import { AdditionalLettersFeature } from './src/features/additional-letters.js';
import { ListenMatchFeature } from './src/features/listen-match.js';
import { AudioService } from './src/services/audio-service.js';
import { StorageService } from './src/services/storage-service.js';
import { THEME_OPTIONS, getThemeFrameVars } from './src/services/theme-service.js';

const LEARNER_LOGIN_ENABLED = false;


class FidelatApp {
  constructor(root) {
    this.root = root;
    this.route = this.isAdminRoute() ? 'admin' : 'learner';
    this.storage = new StorageService();
    this.store = new ProgressStore(this.storage);
    this.audio = new AudioService();
    this.explorer = new AlphabetExplorerFeature(this.store, this.audio);
    this.familyLesson = new FamilyLessonFeature(this.audio);
    this.dragdrop = new DragDropFeature(this.store, this.audio);
    this.additionalLetters = new AdditionalLettersFeature(this.store, this.audio);
    this.challenge = new ListenMatchFeature(this.store, this.audio);
    this.audioReady = false;
    this.adminTab = 'copy';
    this.banner = {
      tone: 'info',
      text: 'Loading your learning studio.'
    };
    this.authModal = null;
    this.pointerDrag = null;
    this.suppressAdditionalClickUntil = 0;
  }

  isAdminRoute() {
    const path = String(window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    return /(^|\/)admin(\/|$)/.test(path);
  }

  getRootUrl() {
    return new URL(this.route === 'admin' ? '../' : './', window.location.href).href;
  }

  getAdminUrl() {
    return new URL('admin/', this.getRootUrl()).href;
  }

  goToLearnerUrl() {
    window.location.href = this.getRootUrl();
  }

  goToAdminUrl() {
    window.location.href = this.getAdminUrl();
  }

  async init() {
    if (!LEARNER_LOGIN_ENABLED && this.route !== 'admin') {
      this.store.ensureLearnerSession();
    }

    this.attachEvents();
    if (this.route !== 'admin') {
      const view = window.location.hash
        ? this.getViewFromHash() || 'explorer'
        : 'explorer';
      await this.openView(view, { history: 'replace', selection: parsePracticeRoute(window.location.hash) });
    }
    this.render();

    try {
      await this.audio.loadAudioMap();
      this.audioReady = true;
      if (this.route === 'admin') {
        this.setBanner('success', this.store.isAdminAuthenticated()
          ? 'Sounds loaded. Admin controls are ready.'
          : 'Sounds loaded. Log in on this admin page to continue.');
      } else {
        this.setBanner('success', this.store.hasActiveProfile()
          ? ''
          : '');
      }
    } catch (error) {
      this.audioReady = false;
      this.setBanner('error', error.message || 'Audio files could not be loaded.');
    }

    this.render();
  }

  getViewFromHash() {
    return parsePracticeRoute(window.location.hash)?.view;
  }

  syncSectionUrl(view, mode = 'push') {
    const hash = practiceHash(view, this.store.getProgress()[view]);
    let current;
    try { current = decodeURIComponent(window.location.hash); } catch { current = ''; }
    if (current === hash) return;
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url);
  }

  applyPracticeSelection(selection) {
    if (!selection) return;
    const { view, part, variantIndex, rowIndex, groupId, tab } = selection;
    const current = this.store.getProgress()[view];
    if (view === 'explorer' && part && (current.part !== part || current.variantIndex !== variantIndex
      || (part === 1 && !Array.isArray(current.reviewSymbols) && this.store.isExplorerPartComplete(variantIndex, 1)))) {
      this.store.updateExplorer({ part, variantIndex, selectedSymbol: null, lastPlayedSymbol: null,
        reviewSymbols: part === 1 && this.store.isExplorerPartComplete(variantIndex, 1) ? [] : null });
    }
    if (view === 'challenge' && part && (current.part !== part || current.variantIndex !== variantIndex)) {
      this.store.updateChallenge({ part, variantIndex, targetSymbol: null, currentChoices: [],
        lastOutcome: null, unlockReadyVariantIndex: null, courseCompleted: false, celebrationText: '' });
    }
    if (view === 'dragdrop' && part) {
      // Opening a daily-practice part starts at its first row, not the saved row.
      this.dragdrop.startRow(part, rowIndex ?? 0);
    }
    if (view === 'additionalLetters' && groupId && (current.groupId !== groupId || current.tab !== tab)) {
      this.store.updateAdditionalLetters({ tab: 'learn' });
      this.additionalLetters.selectGroup(groupId);
      this.additionalLetters.setTab(tab);
    }
  }

  attachEvents() {
    window.addEventListener('hashchange', () => {
      if (this.route !== 'admin') {
        this.openView(this.getViewFromHash() || 'explorer', { history: 'replace', selection: parsePracticeRoute(window.location.hash) })
          .catch((error) => this.setBanner('error', error.message));
      }
    });
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('change', (event) => this.handleChange(event));
    this.root.addEventListener('submit', (event) => this.handleSubmit(event));
    this.root.addEventListener('dragstart', (event) => this.handleDragStart(event));
    this.root.addEventListener('dragover', (event) => this.handleDragOver(event));
    this.root.addEventListener('drop', (event) => this.handleDrop(event));
    this.root.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    window.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: false });
    window.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    window.addEventListener('pointercancel', (event) => this.handlePointerCancel(event));
  }

  createPointerDragGhost(symbol) {
    const ghost = document.createElement('div');
    ghost.className = 'pointer-drag-ghost';
    ghost.textContent = symbol;
    document.body.appendChild(ghost);
    return ghost;
  }

  positionPointerDragGhost(drag, clientX, clientY) {
    if (!drag?.ghost) return;
    drag.ghost.style.transform = `translate(${clientX + 18}px, ${clientY + 18}px)`;
  }

  clearPointerDrag(options = {}) {
    const { suppressClick = false } = options;
    if (this.pointerDrag?.ghost) this.pointerDrag.ghost.remove();
    this.pointerDrag = null;
    if (suppressClick) this.suppressAdditionalClickUntil = Date.now() + 400;
  }

  handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    const button = event.target.closest('[data-action="additional-drag-bank"], [data-action="family-order-bank"]');
    if (!button) return;

    const activeProfile = this.store.getActiveProfile();
    const activeView = this.store.getProgress().activeView;
    const isFamily = button.dataset.action === 'family-order-bank';
    const additionalState = this.store.getAdditionalLettersState();
    if (!activeProfile) return;
    if (isFamily ? activeView !== 'explorer' : (activeView !== 'additionalLetters' || additionalState.tab !== 'dragdrop')) return;

    this.pointerDrag = {
      slotAction: isFamily ? 'family-order-slot' : 'additional-drag-slot',
      pointerId: event.pointerId,
      symbol: button.dataset.symbol,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      ghost: null
    };
  }

  handlePointerMove(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const movedFarEnough = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 8;
    if (!drag.dragging && !movedFarEnough) return;

    if (!drag.dragging) {
      drag.dragging = true;
      drag.ghost = this.createPointerDragGhost(drag.symbol);
    }

    this.positionPointerDragGhost(drag, event.clientX, event.clientY);
    event.preventDefault();
  }

  async handlePointerUp(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (!drag.dragging) {
      this.clearPointerDrag();
      return;
    }

    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest(`[data-action="${drag.slotAction}"]`);
    const symbol = drag.symbol;
    const slotAction = drag.slotAction;
    this.clearPointerDrag({ suppressClick: true });

    if (!slot) return;

    try {
      if (slotAction === 'family-order-slot') {
        await this.handleFamilyOrderPlacement(symbol, Number(slot.dataset.slot));
        return;
      }
      const result = await this.additionalLetters.placeSymbol(symbol, Number(slot.dataset.slot));
      await this.handleAdditionalLettersResult(result);
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  handlePointerCancel(event) {
    const drag = this.pointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.clearPointerDrag({ suppressClick: drag.dragging });
  }

  getLearnerTypeLabel(profile) {
    return this.store.getText('labels.learnerType', {}, profile);
  }

  getEnglishSupportText(key, variables = {}, profile = this.store.getActiveProfile()) {
    return this.store.getEnglishSupportText(key, variables, profile);
  }

  renderEnglishSupport(key, variables = {}, profile = this.store.getActiveProfile(), className = 'english-copy') {
    const english = this.getEnglishSupportText(key, variables, profile);
    return english ? `<p class='${className}'>${english}</p>` : '';
  }

  getCurrentViewTitle() {
    const activeProfile = this.route === 'admin' ? null : this.store.getActiveProfile();
    if (this.route === 'admin') return this.store.getText('admin.title', {}, null);
    if (!activeProfile) return this.store.getText('menu.brandTitle', {}, null);

    const activeView = this.store.getProgress().activeView;
    if (activeView === 'explorer') return this.store.getText('explorer.title', {}, activeProfile);
    if (activeView === 'dragdrop') return this.store.getText('dragdrop.title', {}, activeProfile);
    if (activeView === 'challenge') return this.store.getText('challenge.title', {}, activeProfile);
    if (activeView === 'additionalLetters') return this.store.getText('additional.title', {}, activeProfile);
    return this.store.getText('help.title', {}, activeProfile);
  }

  updateDocumentTitle() {
    const brand = 'Eritrean Language and Culture School Bern';
    const view = this.store.getProgress().activeView;
    const assignment = this.route === 'admin' ? null : practiceOptions(view).find(option => option.hash === practiceHash(view, this.store.getProgress()[view]));
    document.title = `${this.getCurrentViewTitle()}${assignment ? ` · ${assignment.label}` : ''} | ${brand}`;
  }

  escapeAttribute(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  escapeTextarea(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  formatTimestamp(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  setBanner(tone, text) {
    this.banner = { tone, text };
    this.render();
  }

  openAuthModal(mode = 'login', options = {}) {
    this.authModal = {
      mode,
      message: typeof options.message === 'string' ? options.message : '',
      redirectView: options.redirectView || null
    };
    this.render();
  }

  closeAuthModal() {
    if (!this.authModal) return;
    this.authModal = null;
    this.render();
  }

  async completeLearnerAuthSuccess(message) {
    const redirectView = this.authModal?.redirectView || 'explorer';
    this.authModal = null;
    this.store.setActiveView(redirectView);

    if (redirectView === 'challenge') {
      const { challenge } = this.store.getProgress();
      if (!challenge.targetSymbol && typeof challenge.unlockReadyVariantIndex !== 'number' && !challenge.courseCompleted) {
        await this.requireAudio(() => this.challenge.startRound(true));
      }
    }

    this.setBanner('success', message);
  }

  async openView(view, options = {}) {
    if (view !== 'admin' && !Object.hasOwn(SECTION_HASHES, view)) view = 'explorer';
    if (view === 'admin') {
      this.goToAdminUrl();
      return;
    }

    if (this.route === 'admin') {
      this.setBanner('error', 'Use the learner page to open learner activities.');
      return;
    }

    if (!LEARNER_LOGIN_ENABLED && !this.store.hasActiveProfile()) {
      this.store.ensureLearnerSession();
    }

    if (LEARNER_LOGIN_ENABLED && !this.store.hasActiveProfile()) {
      if (view === 'home') {
        this.authModal = null;
        this.store.setActiveView('home');
        this.render();
        return;
      }

      const labels = {
        explorer: 'Learn',
        dragdrop: 'Test 1',
        challenge: 'Test 2',
        additionalLetters: 'More Letters'
      };

      this.openAuthModal('login', {
        message: `Login to keep your progress before opening ${labels[view] || 'this activity'}.`,
        redirectView: view
      });
      return;
    }

    this.audio.stop();
    this.clearPointerDrag();
    this.applyPracticeSelection(view === 'dragdrop'
      ? { view, part: 1, ...options.selection }
      : options.selection);
    this.store.setActiveView(view);
    if (this.audioReady) this.banner = { tone: 'info', text: '' };
    this.syncSectionUrl(view, options.history);

    if (view === 'challenge' && options.autoStart) {
      const { challenge } = this.store.getProgress();
      if (!challenge.targetSymbol && typeof challenge.unlockReadyVariantIndex !== 'number' && !challenge.courseCompleted) {
        await this.requireAudio(() => this.challenge.startRound(true));
        this.setBanner('info', 'The first challenge started. Listen and choose the matching symbol.');
        return;
      }
    }

    this.render();
  }

  async handleChange(event) {
    const action = event.target.dataset.action;
    if (action === 'family-select') {
      if (!this.familyLesson.selectFamily(Number(event.target.value))) return;
      this.audio.stop();
      this.banner = { tone: 'info', text: '' };
      this.render();
      return;
    }

    if (action === 'theme-select') {
      this.store.setTheme(event.target.value);
      this.render();
      return;
    }

    if (action === 'challenge-variant-select') {
      try {
        await this.requireAudio(() => this.challenge.openVariant(Number(event.target.value)));
        this.setBanner('info', 'Listen to the sound, then choose the matching symbol.');
      } catch (error) {
        this.setBanner('error', error.message);
      }
      return;
    }

    if (action === 'explorer-variant') {
      const part = this.explorer.selectVariant(Number(event.target.value));
      this.setBanner('info', `Explorer moved to ${part === 2 ? 'part 2' : 'part 1'}. Press any symbol to hear it.`);
    }
  }

  buildCopyPatch(formData) {
    const patch = {};
    this.store.getCopySections().forEach((section) => {
      section.fields.forEach((field) => {
        patch[field.key] = {
          default: String(formData.get(`${field.key}:default`) ?? ''),
          female: field.gendered ? String(formData.get(`${field.key}:female`) ?? '') : '',
          male: field.gendered ? String(formData.get(`${field.key}:male`) ?? '') : ''
        };
      });
    });
    return patch;
  }

  async handleSubmit(event) {
    const form = event.target;
    const action = form.dataset.action;
    if (!action) return;

    event.preventDefault();
    const data = new FormData(form);

    try {
      if (action === 'register-form') {
        this.store.registerProfile(data.get('name'), data.get('email'), data.get('pin'), data.get('sex'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.profileCreated', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'login-form') {
        this.store.loginProfile(data.get('profileId'), data.get('pin'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.loginRestored', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'guest-form') {
        this.store.continueAsGuest(data.get('name'), data.get('sex'));
        const profile = this.store.getActiveProfile();
        await this.completeLearnerAuthSuccess(
          this.store.getText('system.guestStarted', { name: profile.name }, profile)
        );
        return;
      }

      if (action === 'admin-setup-form') {
        this.audio.stop();
        this.store.setupAdmin(data.get('pin'));
        this.adminTab = 'copy';
        this.setBanner('success', 'Administrator access is ready on this device.');
        return;
      }

      if (action === 'admin-login-form') {
        this.audio.stop();
        this.store.loginAdmin(data.get('pin'));
        this.adminTab = 'copy';
        this.setBanner('success', 'Administrator access restored.');
        return;
      }

      if (action === 'admin-copy-form') {
        this.store.updateAdminCopy(this.buildCopyPatch(data));
        this.setBanner('success', 'Page text updated. Learners will see the new wording immediately on this device.');
        return;
      }

      if (action === 'admin-pin-form') {
        this.store.changeAdminPin(data.get('pin'));
        this.setBanner('success', 'The administrator PIN was updated.');
        return;
      }

      if (action === 'admin-profile-form') {
        const profileId = form.dataset.profileId;
        this.store.updateProfileDetails(profileId, {
          name: data.get('name'),
          email: data.get('email'),
          pin: data.get('pin'),
          sex: data.get('sex')
        });
        const updated = this.store.getProfiles().find((profile) => profile.id === profileId);
        this.setBanner('success', `Saved learner details for ${updated?.name || 'the learner'}.`);
        return;
      }
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  handleDragStart(event) {
    const element = event.target.closest('[data-action="dragdrop-bank"], [data-action="family-order-bank"]');
    if (!element) return;
    event.dataTransfer.setData('text/plain', element.dataset.symbol);
    event.dataTransfer.effectAllowed = 'move';
  }

  handleDragOver(event) {
    const slot = event.target.closest('[data-action="dragdrop-slot"], [data-action="family-order-slot"]');
    if (!slot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  async handleFamilyOrderPlacement(symbol, slotIndex) {
    try {
      const result = await this.familyLesson.placeOrderSymbol(symbol, slotIndex);
      const tone = result.ok ? 'success' : result.status === 'wrong-slot' ? 'error' : 'info';
      this.setBanner(tone, result.message || 'Choose an empty position.');
    } catch (error) {
      this.setBanner('error', error.message || 'The letter was placed, but its sound could not be played.');
    }
  }

  async handleDrop(event) {
    const familySlot = event.target.closest('[data-action="family-order-slot"]');
    if (familySlot) {
      event.preventDefault();
      const familySymbol = event.dataTransfer.getData('text/plain');
      if (familySymbol) await this.handleFamilyOrderPlacement(familySymbol, Number(familySlot.dataset.slot));
      return;
    }
    const dragdropSlot = event.target.closest('[data-action="dragdrop-slot"]');
    if (!dragdropSlot) return;

    event.preventDefault();
    const symbol = event.dataTransfer.getData('text/plain');
    if (!symbol) return;

    const result = await this.dragdrop.placeSymbol(symbol, Number(dragdropSlot.dataset.slot));
    await this.handleDragDropResult(result);
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;

    if (
      (action === 'additional-drag-bank' || action === 'additional-drag-slot'
        || action === 'family-order-bank' || action === 'family-order-slot')
      && Date.now() < this.suppressAdditionalClickUntil
    ) {
      return;
    }

    try {
      if (action === 'auth-link') {
        this.openAuthModal(button.dataset.mode || 'login', {
          message: button.dataset.message || '',
          redirectView: button.dataset.redirectView || null
        });
        return;
      }

      if (action === 'auth-switch') {
        this.openAuthModal(button.dataset.mode || 'login', {
          redirectView: button.dataset.redirectView || this.authModal?.redirectView || null
        });
        return;
      }

      if (action === 'close-auth-modal') {
        this.closeAuthModal();
        return;
      }

      if (action === 'navigate') {
        if (button.tagName === 'A' && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0)) return;
        event.preventDefault();
        await this.openView(button.dataset.view, {
          autoStart: button.dataset.view === 'challenge' && this.audioReady
        });
        return;
      }

      if (action === 'go-to-admin') {
        this.goToAdminUrl();
        return;
      }

      if (action === 'go-to-learner') {
        this.goToLearnerUrl();
        return;
      }

      if (action === 'admin-tab') {
        this.adminTab = button.dataset.tab || 'copy';
        this.render();
        return;
      }

      if (action === 'admin-logout') {
        this.store.logoutAdmin();
        this.adminTab = 'copy';
        this.setBanner('info', 'The administrator was logged out.');
        return;
      }

      if (action === 'admin-reset-copy') {
        const shouldReset = window.confirm('Restore all editable page text back to the built-in defaults for this device?');
        if (!shouldReset) return;
        this.store.resetAdminCopy();
        this.setBanner('info', 'Admin-managed page text was restored to the defaults.');
        return;
      }

      if (action === 'admin-reset-profile') {
        const profile = this.store.getProfiles().find((item) => item.id === button.dataset.profileId);
        const shouldReset = window.confirm(`Reset all saved progress for ${profile?.name || 'this learner'} on this device?`);
        if (!shouldReset) return;
        this.store.resetProfileProgress(button.dataset.profileId);
        this.setBanner('info', `${profile?.name || 'The learner'} now has a fresh start.`);
        return;
      }

      if (action === 'admin-delete-profile') {
        const profile = this.store.getProfiles().find((item) => item.id === button.dataset.profileId);
        const shouldDelete = window.confirm(`Delete ${profile?.name || 'this learner'} and remove the saved progress on this device?`);
        if (!shouldDelete) return;
        this.store.deleteProfile(button.dataset.profileId);
        this.setBanner('info', `${profile?.name || 'The learner'} was deleted from this device.`);
        return;
      }

      if (action === 'logout') {
        const activeProfile = this.store.getActiveProfile();
        const guestMode = this.store.isGuestProfile(activeProfile);
        this.audio.stop();
        this.store.logoutProfile();
        this.setBanner('info', guestMode
          ? `${activeProfile?.name || 'The local learner'} left the local session. Progress stays on this device.`
          : `${activeProfile?.name || 'The learner'} was logged out.`);
        return;
      }

      if (action === 'additional-set') {
        this.additionalLetters.selectGroup(button.dataset.groupId);
        this.render();
        return;
      }

      if (action === 'family-play') {
        await this.requireAudio(() => this.familyLesson.playSymbol(button.dataset.symbol));
        this.setBanner('success', `Played ${button.dataset.symbol}.`);
        return;
      }

      if (action === 'family-exercise-start') {
        await this.requireAudio(() => this.familyLesson.startExercise());
        this.setBanner('info', 'Listen to the sound, then choose the matching form.');
        return;
      }

      if (action === 'family-exercise-repeat') {
        await this.requireAudio(() => this.familyLesson.startExercise());
        this.setBanner('info', 'New random round started. Listen and choose the matching form.');
        return;
      }

      if (action === 'family-stage-previous' || action === 'family-stage-next') {
        if (!this.familyLesson.moveStage(action === 'family-stage-next' ? 1 : -1)) return;
        this.audio.stop();
        this.banner = { tone: 'info', text: '' };
        this.render();
        const heading = this.root.querySelector('.family-lesson > .panel-card .activity-title');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus();
        }
        return;
      }

      if (action === 'family-order-bank') {
        if (this.familyLesson.selectOrderSymbol(button.dataset.symbol)) {
          this.setBanner('info', `Selected ${button.dataset.symbol}. Now choose its position.`);
        }
        return;
      }

      if (action === 'family-order-slot') {
        const selected = this.familyLesson.orderSelected;
        if (selected) await this.handleFamilyOrderPlacement(selected, Number(button.dataset.slot));
        else this.setBanner('info', 'Select a letter first, then choose its position.');
        return;
      }

      if (action === 'family-order-restart') {
        this.familyLesson.restartOrdering();
        this.setBanner('info', 'The letters were shuffled again.');
        return;
      }

      if (action === 'family-exercise-prompt') {
        await this.requireAudio(() => this.familyLesson.playExercisePrompt());
        this.setBanner('info', 'Prompt played. Choose the matching form.');
        return;
      }

      if (action === 'family-exercise-answer') {
        const result = await this.familyLesson.answerExercise(button.dataset.symbol);
        this.setBanner(result === 'wrong' ? 'error' : result === 'correct' || result === 'complete' ? 'success' : 'info',
          result === 'wrong'
            ? 'Incorrect. The sound has been repeated; listen and try again.'
            : result === 'complete'
            ? 'All seven forms correct! Select Next when you are ready.'
            : result === 'correct'
            ? 'Correct! The next sound is playing.'
            : 'Try again: replay the prompt and choose another form.');
        return;
      }

      if (action === 'additional-tab') {
        this.additionalLetters.setTab(button.dataset.tab);
        this.render();
        return;
      }

      if (action === 'additional-play') {
        await this.requireAudio(async () => {
          const result = await this.additionalLetters.playSymbol(button.dataset.symbol);
          this.setBanner('info', result.message);
        });
        return;
      }

      if (action === 'additional-replay') {
        await this.requireAudio(() => this.additionalLetters.replayCurrent());
        this.setBanner('success', 'Replayed the current additional letter.');
        return;
      }

      if (action === 'additional-drag-reset') {
        this.additionalLetters.resetDragdrop();
        this.setBanner('info', 'The current additional-letter set was shuffled again.');
        return;
      }

      if (action === 'additional-drag-bank') {
        this.additionalLetters.selectDragSymbol(button.dataset.symbol);
        this.setBanner('info', `Selected ${button.dataset.symbol}. Now place it into the right position.`);
        return;
      }

      if (action === 'additional-drag-slot') {
        const slotIndex = Number(button.dataset.slot);
        const additionalState = this.store.getAdditionalLettersState();
        const selectedSymbol = additionalState.selectedDragSymbol;
        if (selectedSymbol) {
          const result = await this.additionalLetters.placeSymbol(selectedSymbol, slotIndex);
          await this.handleAdditionalLettersResult(result);
        } else if (additionalState.placedSymbols[slotIndex]) {
          this.additionalLetters.removeFromSlot(slotIndex);
          this.setBanner('info', 'The letter was removed from that slot.');
        }
        return;
      }

      if (action === 'explorer-open-second-part') {
        this.explorer.openSecondPart();
        this.setBanner('success', 'Explorer moved to the second part.');
        return;
      }

      if (action === 'explorer-review-first-part') {
        this.explorer.reviewFirstPart();
        this.setBanner('info', 'Explorer returned to the first part for review.');
        return;
      }

      if (action === 'explorer-symbol') {
        await this.requireAudio(async () => {
          const result = await this.explorer.playSymbol(button.dataset.symbol);
          this.setBanner(result.status === 'part-advanced' ? 'success' : 'info', result.message);
        });
        return;
      }

      if (action === 'explorer-replay') {
        await this.requireAudio(() => this.explorer.replayCurrent());
        this.setBanner('success', 'Replayed the current symbol.');
        return;
      }

      if (action === 'dragdrop-next-set') {
        this.dragdrop.goToNextSet();
        this.setBanner('success', 'Second set opened. Continue arranging the next families.');
        return;
      }

      if (action === 'dragdrop-restart-journey') {
        this.dragdrop.restartJourney();
        this.setBanner('info', 'The whole drag-and-drop journey restarted from the first set.');
        return;
      }

      if (action === 'dragdrop-restart-row') {
        const { dragdrop } = this.store.getProgress();
        if (dragdrop.completedSet) {
          this.dragdrop.restartJourney();
          this.setBanner('info', 'The whole drag-and-drop journey restarted from the first set.');
        } else {
          this.dragdrop.startRow(dragdrop.part, dragdrop.rowIndex);
          this.setBanner('info', 'This family was shuffled again for another try.');
        }
        return;
      }

      if (action === 'dragdrop-continue') {
        this.dragdrop.continueAfterCelebration();
        this.setBanner('info', 'Continue with the next family.');
        return;
      }

      if (action === 'dragdrop-bank') {
        this.dragdrop.selectSymbol(button.dataset.symbol);
        this.setBanner('info', `Selected ${button.dataset.symbol}. Now place it into the right position.`);
        return;
      }

      if (action === 'dragdrop-slot') {
        const slotIndex = Number(button.dataset.slot);
        const { dragdrop } = this.store.getProgress();
        const selectedSymbol = dragdrop.selectedSymbol;
        if (selectedSymbol) {
          const result = await this.dragdrop.placeSymbol(selectedSymbol, slotIndex);
          await this.handleDragDropResult(result);
        } else if (dragdrop.placedSymbols[slotIndex]) {
          this.dragdrop.removeFromSlot(slotIndex);
          this.setBanner('info', 'The letter was removed from that slot.');
        }
        return;
      }

      if (action === 'challenge-play') {
        await this.requireAudio(() => this.challenge.replayPrompt());
        this.setBanner('info', 'Prompt played. Choose the matching symbol.');
        return;
      }

      if (action === 'challenge-next') {
        await this.requireAudio(() => this.challenge.openNextVariant());
        this.setBanner('success', 'The next variant is now open and the first challenge has started.');
        return;
      }

      if (action === 'challenge-guess') {
        const result = await this.challenge.submitGuess(button.dataset.symbol);
        await this.handleChallengeResult(result);
        return;
      }

      if (action === 'reset-progress') {
        const shouldReset = window.confirm('Reset all learning progress in Learn, Test 1, Test 2, and More for this learner on this device? This gives the next learner a fresh start and cannot be undone.');
        if (!shouldReset) return;
        const view = this.store.getProgress().activeView;
        this.audio.stop();
        window.speechSynthesis?.cancel();
        this.clearPointerDrag();
        this.store.resetCurrentProfile();
        this.store.setActiveView(view);
        this.syncSectionUrl(view, 'replace');
        this.setBanner('success', 'All learning progress has been reset. Ready for a new learner.');
        return;
      }
    } catch (error) {
      this.setBanner('error', error.message || 'Something went wrong.');
    }
  }

  async handleDragDropResult(result) {
    if (!result) return;

    if (result.status === 'row-complete' || result.status === 'set-complete') {
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'wrong' || result.status === 'wrong-slot') {
      this.setBanner('error', result.message);
      return;
    }

    if (result.status === 'partial') {
      this.setBanner('info', result.message);
      return;
    }

    this.setBanner(result.ok ? 'success' : 'info', result.message || 'Drag-and-drop updated.');
  }

  async handleChallengeResult(result) {
    if (!result) return;

    if (result.status === 'continue' || result.status === 'part-advanced') {
      await this.requireAudio(() => this.challenge.startRound(true));
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'variant-complete') {
      await this.audio.playVariantUnlock();
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'course-complete') {
      await this.audio.playFinalCelebration();
      this.setBanner('success', result.message);
      return;
    }

    if (result.status === 'wrong') {
      this.setBanner('error', result.message);
      return;
    }

    if (result.status === 'prompt-started' || result.status === 'blocked') {
      this.setBanner('info', result.message);
      return;
    }

    this.setBanner(result.ok ? 'success' : 'info', result.message || 'Challenge updated.');
  }

  async requireAudio(task) {
    if (!this.audioReady) {
      throw new Error('Audio is not ready yet. Check sounds.json and the audio files first.');
    }
    await task();
  }

  applyTheme() {
    const activeThemeId = this.store.getTheme();
    document.body.dataset.theme = activeThemeId;
    const frameVars = getThemeFrameVars(activeThemeId);
    Object.entries(frameVars).forEach(([key, value]) => {
      document.body.style.setProperty(key, value);
    });
  }

  renderThemePicker() {
    const activeThemeId = this.store.getTheme();
    const activeTheme = THEME_OPTIONS.find((theme) => theme.id === activeThemeId) || THEME_OPTIONS[0];

    return `
      <section class='theme-panel' aria-label='Frame themes'>
        <label class='theme-inline'>
          <span class='theme-inline-label'>Your fav color</span>
          <select class='selector theme-select' data-action='theme-select' aria-label='Your fav color' style='--theme-label-color: ${activeTheme.textColor}'>
            ${THEME_OPTIONS.map((theme) => `
              <option value='${theme.id}' style='color: ${theme.textColor}' ${theme.id === activeThemeId ? 'selected' : ''}>${theme.label}</option>
            `).join('')}
          </select>
        </label>
      </section>
    `;
  }

  renderMenu() {
    const adminRoute = this.route === 'admin';
    const adminActive = adminRoute && this.store.isAdminAuthenticated();
    const activeProfile = adminRoute ? null : this.store.getActiveProfile();
    const activeView = this.store.getProgress().activeView;
    const items = [
      ['explorer', 'Learn'],
      ['dragdrop', 'Test 1'],
      ['challenge', 'Test 2'],
      ['additionalLetters', 'More'],
      ['home', 'Help']
    ];

    const navigation = adminRoute
      ? `
        <nav class='main-menu' aria-label='Admin menu'>
          <button class='menu-btn' type='button' data-action='go-to-learner'>Learner Page</button>
          ${adminActive ? `<button class='menu-btn is-active' type='button'>Admin</button>` : ''}
        </nav>
      `
      : `
        <nav class='main-menu' aria-label='Main menu'>
          ${items.map(([view, label]) => `
            <a class='menu-btn ${activeView === view ? 'is-active' : ''}' href='#${SECTION_HASHES[view]}' data-action='navigate' data-view='${view}' ${activeView === view ? "aria-current='page'" : ''}>${label}</a>
          `).join('')}
        </nav>
      `;

    const roleLabel = adminRoute
      ? this.store.getText('labels.adminRole', {}, null)
      : activeProfile
        ? this.getLearnerTypeLabel(activeProfile)
        : this.store.getText('labels.learnerType', {}, null);

    const profileName = adminRoute
      ? adminActive ? 'Content and learner controls' : 'Admin sign-in'
      : activeProfile
        ? LEARNER_LOGIN_ENABLED
          ? this.store.isGuestProfile(activeProfile) ? `${activeProfile.name} (Guest)` : activeProfile.name
          : 'Learner mode'
        : LEARNER_LOGIN_ENABLED ? 'Login, register, or continue as guest' : 'Learner mode';

    const actionButton = adminRoute
      ? adminActive ? `<button class='ghost-btn' type='button' data-action='admin-logout'>Log out admin</button>` : ''
      : LEARNER_LOGIN_ENABLED && activeProfile
        ? `<button class='ghost-btn' type='button' data-action='logout'>${this.store.isGuestProfile(activeProfile) ? 'Leave Guest Session' : 'Log Out'}</button>`
        : '';

    return `
      <header class='top-shell card'>
        <div class='brand-block'>
          <div class='eyebrow'>Tigrinya Fidel learning</div>
          <h1>Eritrean Language and Culture School Bern</h1>
          <p class='hero-copy'>${adminRoute
            ? this.store.getText('auth.adminIntro', {}, null)
            : 'Learn one alphabet family at a time with audio, exercises, and reading practice.'}</p>
        </div>
        <div class='menu-side'>
          ${navigation}
          ${adminRoute || LEARNER_LOGIN_ENABLED ? `<div class='profile-bar'>
            <div>
              <div class='profile-label'>${roleLabel}</div>
              <div class='profile-name'>${profileName}</div>
            </div>
            ${actionButton}
          </div>` : ''}
          <div class="learner-tools">
            <details class="appearance"><summary>Your fav color</summary>${this.renderThemePicker()}</details>
            ${!adminRoute && activeProfile ? `<button class="ghost-btn reset-progress-btn" type="button" data-action="reset-progress" title="Reset learning progress in all sections">Reset Progress</button>` : ''}
          </div>
        </div>
      </header>
    `;
  }

  renderBanner() {
    if (!this.banner.text) return '';

    return `
      <section role='status' aria-live='polite' class='banner-card card ${this.banner.tone === 'success' ? 'is-success' : this.banner.tone === 'error' ? 'is-error' : ''}'>
        <div class='message'>${this.banner.text}</div>
      </section>
    `;
  }

  renderAuthLauncher() {
    if (!LEARNER_LOGIN_ENABLED) return '';
    if (this.store.hasActiveProfile()) return '';

    return `
      <article class='card auth-entry-card'>
        <div class='activity-badge'>Start Here</div>
        <h2 class='section-title'>Login to keep your progress</h2>
        <div class='auth-link-row'>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='login' data-message='Login to keep your progress.'>Login</button>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='register'>Register</button>
          <button class='link-btn' type='button' data-action='auth-link' data-mode='guest'>Continue as Guest</button>
        </div>
      </article>
    `;
  }

  renderAuthModal() {
    if (!LEARNER_LOGIN_ENABLED) return '';
    if (!this.authModal) return '';

    const mode = this.authModal.mode || 'login';
    const redirectView = this.escapeAttribute(this.authModal.redirectView || '');
    const profiles = this.store.getProfiles();
    const guestProfile = this.store.getGuestProfile();
    const note = this.authModal.message
      ? `<div class='hint-box auth-modal-note'>${this.authModal.message}</div>`
      : '';

    let badge = 'Login';
    let title = this.store.getText('auth.loginTitle', {}, null);
    let intro = this.store.getText('auth.loginIntro', {}, null);
    let content = profiles.length
      ? `
          <form class='auth-form' data-action='login-form'>
            <label>
              <span class='field-label'>Learner</span>
              <select class='selector' name='profileId' required>
                ${profiles.map((profile) => `
                  <option value='${profile.id}'>${profile.name}${profile.email ? ` - ${profile.email}` : ''}</option>
                `).join('')}
              </select>
            </label>
            <label>
              <span class='field-label'>PIN</span>
              <input class='field-input' name='pin' type='password' placeholder='Enter learner PIN' required />
            </label>
            <button class='primary-btn' type='submit'>Log In</button>
          </form>
        `
      : `<div class='message-box'><div class='message'>No learner accounts have been created on this device yet.</div></div>`;

    if (mode === 'register') {
      badge = 'Register';
      title = this.store.getText('auth.registerTitle', {}, null);
      intro = this.store.getText('auth.registerIntro', {}, null);
      content = `
        <form class='auth-form' data-action='register-form'>
          <label>
            <span class='field-label'>Learner name</span>
            <input class='field-input' name='name' type='text' placeholder='Example: Meron' required />
          </label>
          <label>
            <span class='field-label'>M/F</span>
            <select class='selector' name='sex' required>
              <option value=''>Choose one</option>
              <option value='female'>Female</option>
              <option value='male'>Male</option>
            </select>
          </label>
          <label>
            <span class='field-label'>Simple PIN</span>
            <input class='field-input' name='pin' type='password' placeholder='4 digits or letters' required />
          </label>
          <button class='primary-btn' type='submit'>Create Account</button>
        </form>
      `;
    }

    if (mode === 'guest') {
      badge = 'Guest';
      title = this.store.getText('auth.guestTitle', {}, guestProfile);
      intro = this.store.getText('auth.guestIntro', {}, guestProfile);
      content = `
        ${guestProfile
          ? `<div class='hint-box'>${this.store.getText('auth.guestResumeNote', { name: guestProfile.name }, guestProfile)}</div>`
          : ''}
        <form class='auth-form' data-action='guest-form'>
          <label>
            <span class='field-label'>Local learner name</span>
            <input class='field-input' name='name' type='text' value='${this.escapeAttribute(guestProfile?.name || '')}' placeholder='Example: Meron' required />
          </label>
          <label>
            <span class='field-label'>M/F</span>
            <select class='selector' name='sex' required>
              <option value=''>Choose one</option>
              <option value='female' ${guestProfile?.sex === 'female' ? 'selected' : ''}>Female</option>
              <option value='male' ${guestProfile?.sex === 'male' ? 'selected' : ''}>Male</option>
            </select>
          </label>
          <button class='primary-btn' type='submit'>${guestProfile ? 'Continue as Guest' : 'Start Guest Session'}</button>
        </form>
      `;
    }

    return `
      <div class='auth-modal-layer'>
        <button class='modal-backdrop' type='button' data-action='close-auth-modal' aria-label='Close authentication dialog'></button>
        <section class='auth-modal-shell' role='dialog' aria-modal='true' aria-labelledby='auth-modal-title'>
          <article class='card auth-modal-card'>
            <button class='modal-close' type='button' data-action='close-auth-modal' aria-label='Close authentication dialog'>&times;</button>
            <div class='activity-badge'>${badge}</div>
            <h2 class='section-title' id='auth-modal-title'>${title}</h2>
            ${note}
            <p class='panel-copy'>${intro}</p>
            ${content}
            <div class='auth-switch-row'>
              <button class='chip-btn ${mode === 'login' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='login' data-redirect-view='${redirectView}'>Login</button>
              <button class='chip-btn ${mode === 'register' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='register' data-redirect-view='${redirectView}'>Register</button>
              <button class='chip-btn ${mode === 'guest' ? 'is-active' : ''}' type='button' data-action='auth-switch' data-mode='guest' data-redirect-view='${redirectView}'>Continue as Guest</button>
            </div>
          </article>
        </section>
      </div>
    `;
  }

  renderAdminAuthGate() {
    const hasAdminAccount = this.store.hasAdminAccount();

    return `
      <section class='auth-grid admin-auth-grid'>
        <article class='card auth-card'>
          <div class='activity-badge'>Admin</div>
          <h2 class='section-title'>${hasAdminAccount
            ? this.store.getText('auth.adminLoginTitle', {}, null)
            : this.store.getText('auth.adminSetupTitle', {}, null)}</h2>
          <p class='panel-copy'>${this.store.getText('auth.adminIntro', {}, null)}</p>
          ${hasAdminAccount
            ? `
              <form class='auth-form' data-action='admin-login-form'>
                <label>
                  <span class='field-label'>Administrator PIN</span>
                  <input class='field-input' name='pin' type='password' placeholder='Enter administrator PIN' required />
                </label>
                <button class='primary-btn' type='submit'>Open Admin</button>
              </form>
            `
            : `
              <form class='auth-form' data-action='admin-setup-form'>
                <label>
                  <span class='field-label'>Create administrator PIN</span>
                  <input class='field-input' name='pin' type='password' placeholder='At least 4 characters' required />
                </label>
                <button class='primary-btn' type='submit'>Create Admin Access</button>
              </form>
            `}
          <div class='activity-actions'>
            <button class='ghost-btn' type='button' data-action='go-to-learner'>Open Learner Page</button>
          </div>
        </article>
      </section>
    `;
  }

  renderHome() {
    const activeProfile = this.store.getActiveProfile();
    const { challenge } = this.store.getProgress();
    const summaries = VARIANT_NAMES.map((_, index) => this.store.getVariantSummary(index, this.audio.audioMap));
    const learnedTotal = summaries.reduce((total, item) => total + item.learnedCount, 0);
    const dragdropCompleted = this.store.getDragDropProgress(1).length + this.store.getDragDropProgress(2).length;
    const welcomeTitle = activeProfile
      ? this.store.getText('home.welcomeTitle', { name: activeProfile.name }, activeProfile)
      : '';
    const welcomeBody = activeProfile
      ? this.store.getText('home.welcomeBody', { name: activeProfile.name }, activeProfile)
      : '';
    const snapshotSummary = activeProfile
      ? this.store.getText('home.snapshotSummary', {
          learnerType: this.getLearnerTypeLabel(activeProfile),
          variantName: VARIANT_NAMES[challenge.variantIndex],
          part: challenge.part
        }, activeProfile)
      : '';

    return `
      <section class='home-grid'>
        <div class='home-main'>
          ${this.renderAuthLauncher()}
          <article class='card welcome-card'>
            <h2 class='section-title'>${this.store.getText('help.title', {}, activeProfile)}</h2>
            <p class='panel-copy learner-instructions'>${this.escapeTextarea(this.store.getText('help.gettingStarted', {}, activeProfile))}</p>
            <details class='help-adults'>
              <summary>For parents and teachers</summary>
              <p class='panel-copy learner-instructions'>${this.escapeTextarea(this.store.getText('help.adults', {}, activeProfile))}</p>
            </details>
            <div class='activity-badge'>${this.store.getText('home.pageBadge', {}, activeProfile)}</div>
            ${welcomeTitle ? `<h2 class='section-title'>${welcomeTitle}</h2>` : ''}
            ${welcomeTitle ? this.renderEnglishSupport('home.welcomeTitle', { name: activeProfile?.name || 'learner' }, activeProfile) : ''}
            ${welcomeBody ? `<p class='panel-copy'>${welcomeBody}</p>` : ''}
            ${welcomeBody ? this.renderEnglishSupport('home.welcomeBody', { name: activeProfile?.name || 'learner' }, activeProfile) : ''}
            <div class='activity-stack'>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.explorerTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.explorerTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.explorerCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.explorerCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='explorer'>Open Learn</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.dragdropTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.dragdropTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.dragdropCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.dragdropCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='dragdrop'>Open Test 1</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.challengeTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.challengeTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.challengeCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.challengeCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='challenge'>Open Test 2</button>
                </div>
              </article>
              <article class='activity-card'>
                <h3 class='activity-title'>${this.store.getText('home.additionalTitle', {}, activeProfile)}</h3>
                ${this.renderEnglishSupport('home.additionalTitle', {}, activeProfile)}
                <p class='activity-copy'>${this.store.getText('home.additionalCopy', {}, activeProfile)}</p>
                ${this.renderEnglishSupport('home.additionalCopy', {}, activeProfile)}
                <div class='activity-actions'>
                  <button class='primary-btn' type='button' data-action='navigate' data-view='additionalLetters'>${this.store.getText('home.additionalButtonLabel', {}, null)}</button>
                </div>
              </article>
            </div>
          </article>
        </div>

        <aside class='home-side'>
          <article class='card side-card'>
            <h2 class='section-title'>${this.store.getText('home.snapshotTitle', {}, activeProfile)}</h2>
            ${this.renderEnglishSupport('home.snapshotTitle', {}, activeProfile)}
            <div class='metrics two-up'>
              <div class='metric'>
                <div class='metric-value'>${learnedTotal}</div>
                <div class='metric-label'>Letters learned</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${this.store.getAccuracy()}%</div>
                <div class='metric-label'>Test 2 accuracy</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${dragdropCompleted}</div>
                <div class='metric-label'>Test 1 rows solved</div>
              </div>
              <div class='metric'>
                <div class='metric-value'>${this.store.getUnlockedCount()}/${VARIANT_NAMES.length}</div>
                <div class='metric-label'>Available variants</div>
              </div>
            </div>
            ${snapshotSummary ? `<p class='panel-copy'>${snapshotSummary}</p>` : ''}
            ${snapshotSummary ? this.renderEnglishSupport('home.snapshotSummary', {
              learnerType: this.getLearnerTypeLabel(activeProfile),
              variantName: VARIANT_NAMES[challenge.variantIndex],
              part: challenge.part
            }, activeProfile) : ''}
          </article>

          <article class='card roadmap-card'>
            <h2 class='section-title'>${this.store.getText('home.progressTitle', {}, activeProfile)}</h2>
            ${this.renderEnglishSupport('home.progressTitle', {}, activeProfile)}
            <div class='roadmap-stack'>
              ${summaries.map((summary) => `
                <div class='variant-summary ${summary.complete ? 'is-complete' : ''} ${summary.unlocked ? '' : 'is-locked'}'>
                  <div>
                    <strong>${summary.name}</strong>
                    <div class='roadmap-text'>${summary.learnedCount}/${summary.symbolCount} learned</div>
                  </div>
                  <div class='variant-meta'>${summary.complete ? 'Complete' : summary.unlocked ? 'Open' : 'Locked'}</div>
                </div>
              `).join('')}
            </div>
          </article>
        </aside>
      </section>
    `;
  }

  renderAdminTabs() {
    const tabs = [
      ['copy', 'Page Text'],
      ['users', 'Learners'],
      ['security', 'Security']
    ];

    return `
      <div class='admin-tabs'>
        ${tabs.map(([tab, label]) => `
          <button class='chip-btn ${this.adminTab === tab ? 'is-active' : ''}' type='button' data-action='admin-tab' data-tab='${tab}'>${label}</button>
        `).join('')}
      </div>
    `;
  }

  renderAdminCopyField(field, values) {
    const value = values[field.key] || { default: '', female: '', male: '' };

    if (!field.gendered) {
      return `
        <div class='admin-section'>
          <h3 class='activity-title'>${field.label}</h3>
          <p class='panel-copy'>${field.help}</p>
          <label class='admin-field'>
            <span class='field-label'>Text</span>
            <textarea class='field-input textarea-field' name='${field.key}:default' rows='4'>${this.escapeTextarea(value.default)}</textarea>
          </label>
        </div>
      `;
    }

    return `
      <div class='admin-section'>
        <h3 class='activity-title'>${field.label}</h3>
        <p class='panel-copy'>${field.help}</p>
        <div class='admin-copy-grid'>
          <label class='admin-field'>
            <span class='field-label'>Default wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:default' rows='4'>${this.escapeTextarea(value.default)}</textarea>
          </label>
          <label class='admin-field'>
            <span class='field-label'>Female wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:female' rows='4'>${this.escapeTextarea(value.female)}</textarea>
          </label>
          <label class='admin-field'>
            <span class='field-label'>Male wording</span>
            <textarea class='field-input textarea-field' name='${field.key}:male' rows='4'>${this.escapeTextarea(value.male)}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  renderAdminCopyPanel() {
    const copy = this.store.getCopyState();

    return `
      <article class='card panel-card admin-panel'>
        <div class='hint-box'>${this.store.getText('admin.copyHint', {}, null)}</div>
        <p class='panel-copy'>Edit the sections below in the same order as the learner menu. Saving preserves the wording in every section, including optional female and male versions. Changes are saved in this browser; they are not published to other devices by a GitHub push.</p>
        <details class='admin-site-guide'>
          <summary>Current site features and sharing</summary>
          <p class='panel-copy'>Learn has seven variants and two parts. Test 1 has two daily practice parts and plays each correctly placed letter. Test 2 lets learners choose any variant. More offers extra letter sets.</p>
          <p class='panel-copy'>To share practice, open the learner section, choose the part, variant, or set, then copy the address bar. Reset Progress is available in every learner section and clears all learning progress for the current profile, while keeping admin text and the selected color.</p>
        </details>
        <form class='auth-form' data-action='admin-copy-form'>
          <div class='activity-actions admin-save-bar'>
            <button class='primary-btn' type='submit'>Save Text Changes</button>
          </div>
          ${this.store.getCopySections().map((section) => `
            <details class='admin-copy-section' id='copy-${section.id}'>
              <summary>${section.title}</summary>
              <div>
                <p class='panel-copy'>${section.description}</p>
              </div>
              <div class='admin-user-list'>
                ${section.fields.map((field) => this.renderAdminCopyField(field, copy)).join('')}
              </div>
            </details>
          `).join('')}
          <div class='activity-actions'>
            <button class='primary-btn' type='submit'>Save Text Changes</button>
            <button class='ghost-btn' type='button' data-action='admin-reset-copy'>Restore Default Text</button>
          </div>
        </form>
      </article>
    `;
  }

  renderAdminUsersPanel() {
    const profiles = this.store.getProfiles();
    const femaleCount = profiles.filter((profile) => profile.sex === 'female').length;
    const maleCount = profiles.filter((profile) => profile.sex === 'male').length;

    return `
      <article class='card panel-card admin-panel'>
        <p class='panel-copy'>Learners currently practice without signing in. These controls manage previously registered accounts on this browser. Use Reset Progress on a learner page to clear the current local learner’s practice.</p>
        <div class='stat-strip'>
          <div class='stat-pill'><strong>${profiles.length}</strong>Learners</div>
          <div class='stat-pill'><strong>${femaleCount}</strong>Female profiles</div>
          <div class='stat-pill'><strong>${maleCount}</strong>Male profiles</div>
          <div class='stat-pill'><strong>${this.store.hasAdminAccount() ? 'Ready' : 'Not set'}</strong>Admin access</div>
        </div>
        ${profiles.length
          ? `
            <div class='admin-user-list'>
              ${profiles.map((profile) => `
                <form class='admin-user-card admin-section' data-action='admin-profile-form' data-profile-id='${profile.id}'>
                  <div>
                    <h3 class='activity-title'>${profile.name}</h3>
                    <div class='admin-meta'>${this.getLearnerTypeLabel(profile)}. ${profile.email || 'No email saved yet.'} Created ${this.formatTimestamp(profile.createdAt)}. Last login ${this.formatTimestamp(profile.lastLoginAt)}.</div>
                  </div>
                  <div class='admin-copy-grid'>
                    <label class='admin-field'>
                      <span class='field-label'>Learner name</span>
                      <input class='field-input' name='name' type='text' value="${this.escapeAttribute(profile.name)}" required />
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>Email</span>
                      <input class='field-input' name='email' type='email' value="${this.escapeAttribute(profile.email || '')}" />
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>M/F</span>
                      <select class='selector' name='sex' required>
                        <option value='female' ${profile.sex === 'female' ? 'selected' : ''}>Female</option>
                        <option value='male' ${profile.sex === 'male' ? 'selected' : ''}>Male</option>
                      </select>
                    </label>
                    <label class='admin-field'>
                      <span class='field-label'>PIN</span>
                      <input class='field-input' name='pin' type='password' value="${this.escapeAttribute(profile.pin)}" required />
                    </label>
                  </div>
                  <div class='activity-actions'>
                    <button class='primary-btn' type='submit'>Save Learner</button>
                    <button class='ghost-btn' type='button' data-action='admin-reset-profile' data-profile-id='${profile.id}'>Reset Progress</button>
                    <button class='secondary-btn' type='button' data-action='admin-delete-profile' data-profile-id='${profile.id}'>Delete Learner</button>
                  </div>
                </form>
              `).join('')}
            </div>
          `
          : `
            <div class='message-box'>
              <div class='message'>No learner accounts have been created on this device yet.</div>
            </div>
          `}
      </article>
    `;
  }

  renderAdminSecurityPanel() {
    const admin = this.store.getAdminState();

    return `
      <article class='card panel-card admin-panel'>
        <div class='hint-box'>${this.store.getText('admin.securityHint', {}, null)}</div>
        <div class='admin-user-list'>
          <section class='admin-section'>
            <div class='activity-badge'>Security</div>
            <h3 class='activity-title'>Change administrator PIN</h3>
            <p class='panel-copy'>Update the local PIN used to open the admin controls.</p>
            <form class='auth-form' data-action='admin-pin-form'>
              <label>
                <span class='field-label'>New administrator PIN</span>
                <input class='field-input' name='pin' type='password' placeholder='At least 4 characters' required />
              </label>
              <button class='primary-btn' type='submit'>Save New PIN</button>
            </form>
          </section>

          <section class='admin-section'>
            <div class='activity-badge'>Status</div>
            <h3 class='activity-title'>Administrator session</h3>
            <p class='panel-copy'>Last admin sign-in: ${this.formatTimestamp(admin.lastLoginAt)}.</p>
            <div class='activity-actions'>
              <button class='ghost-btn' type='button' data-action='admin-logout'>Log Out Admin</button>
            </div>
          </section>
        </div>
      </article>
    `;
  }

  renderAdminView() {
    let panel = this.renderAdminCopyPanel();
    if (this.adminTab === 'users') panel = this.renderAdminUsersPanel();
    if (this.adminTab === 'security') panel = this.renderAdminSecurityPanel();

    return `
      <section class='workspace'>
        <div class='workspace-top'>
          <div>
            <h2 class='view-title'>${this.store.getText('admin.title', {}, null)}</h2>
            <p class='panel-copy'>${this.store.getText('admin.intro', {}, null)}</p>
          </div>
        </div>
        ${this.renderAdminTabs()}
        ${panel}
      </section>
    `;
  }

  renderActiveLearnerView() {
    const activeProfile = this.store.getActiveProfile();
    const activeView = activeProfile ? this.store.getProgress().activeView : 'home';
    if (activeView === 'explorer' && activeProfile) return this.familyLesson.render();
    if (activeView === 'dragdrop' && activeProfile) return this.dragdrop.render();
    if (activeView === 'challenge' && activeProfile) return this.challenge.render(this.audioReady);
    if (activeView === 'additionalLetters' && activeProfile) return this.additionalLetters.render();
    return this.renderHome();
  }

  renderMainContent() {
    if (this.route === 'admin') {
      return this.store.isAdminAuthenticated() ? this.renderAdminView() : this.renderAdminAuthGate();
    }

    return this.renderActiveLearnerView();
  }

  render() {
    const previousView = document.body.dataset.view;
    const openDetails = new Set([...this.root.querySelectorAll('details[open]')].map(node => node.id || node.className));
    const focused = this.root.contains(document.activeElement) ? document.activeElement : null;
    const focusData = focused?.dataset.action ? { ...focused.dataset } : null;
    document.body.dataset.view = this.route === 'admin' ? 'admin' : this.store.getProgress().activeView;
    this.updateDocumentTitle();
    this.applyTheme();
    if (this.route !== 'admin') this.syncSectionUrl(this.store.getProgress().activeView);
    this.root.innerHTML = `
      <div class='app-frame'>
        <div class='studio-shell'>
          ${this.renderMenu()}
          ${this.renderBanner()}
          ${this.renderMainContent()}
        </div>
      </div>
      ${this.renderAuthModal()}
    `;
    this.root.querySelectorAll('.workspace-top > div:first-child').forEach(header => {
      const copy = [...header.querySelectorAll(':scope > p')];
      if (!copy.length) return;
      const details = document.createElement('details');
      details.className = 'practice-instructions';
      details.innerHTML = '<summary>Instructions</summary>';
      copy.forEach(node => details.append(node));
      header.append(details);
    });
    this.root.querySelectorAll('.workspace .stat-strip').forEach(stats => {
      const details = document.createElement('details');
      details.className = 'practice-progress';
      details.innerHTML = '<summary>Progress</summary>';
      stats.before(details);
      details.append(stats);
    });
    if (previousView === document.body.dataset.view) {
      this.root.querySelectorAll('details').forEach(node => { node.open = openDetails.has(node.id || node.className); });
    }
    if (focusData) {
      const replacement = [...this.root.querySelectorAll('[data-action]')].find((element) =>
        Object.entries(focusData).every(([key, value]) => element.dataset[key] === value));
      replacement?.focus({ preventScroll: true });
    }
  }
}

const app = new FidelatApp(document.getElementById('app'));
app.init();
