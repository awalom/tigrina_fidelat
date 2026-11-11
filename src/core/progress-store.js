import {
  ADDITIONAL_LETTER_GROUPS,
  countPlayableSymbols,
  createEmptyMastery,
  getSymbolsForVariant,
  isVariantComplete,
  VARIANT_NAMES
} from '../data/fidelat-data.js';
import { COPY_SECTIONS, mergeCopyWithDefaults, resolveCopy } from '../services/content-service.js?v=test2-1';
import { createDefaultProgressState } from '../services/storage-service.js?v=test2-3';

export class ProgressStore {
  constructor(storage) {
    this.storage = storage;
    this.state = storage.load();
  }

  getState() {
    return this.state;
  }

  getProgress() {
    return this.state.progress;
  }

  getProfiles() {
    return this.state.session.profiles;
  }

  getGuestProfile() {
    return this.state.session.guestProfile || null;
  }

  getAdminState() {
    return this.state.admin;
  }

  getCopyState() {
    return this.state.admin.copy;
  }

  getCopySections() {
    return COPY_SECTIONS;
  }

  getActiveProfile() {
    return this.storage.getActiveProfile(this.state);
  }

  hasActiveProfile() {
    return Boolean(this.getActiveProfile());
  }

  isGuestProfile(profile) {
    return Boolean(profile && (profile.kind === 'guest' || profile.localOnly === true));
  }

  hasAdminAccount() {
    return Boolean(this.state.admin.pin);
  }

  isAdminAuthenticated() {
    return Boolean(this.state.admin.pin && this.state.admin.loggedIn);
  }

  getTheme() {
    return this.state.session.themeId;
  }

  setTheme(themeId) {
    this.state = this.storage.updateTheme(themeId, this.state);
  }

  ensureLearnerSession() {
    this.state = this.storage.ensureLearnerSession(this.state);
  }

  getText(key, variables = {}, profile = this.getActiveProfile()) {
    return this.storage.getText(this.state, key, profile, variables);
  }

  getDefaultText(key, variables = {}, profile = this.getActiveProfile()) {
    const copy = mergeCopyWithDefaults(this.state.admin.copy);
    const defaultOnlyCopy = Object.fromEntries(
      Object.entries(copy).map(([entryKey, entry]) => [entryKey, {
        ...entry,
        female: '',
        male: ''
      }])
    );

    return resolveCopy(defaultOnlyCopy, key, profile, variables);
  }

  getEnglishSupportText(key, variables = {}, profile = this.getActiveProfile()) {
    const current = this.getText(key, variables, profile).trim();
    const fallback = this.getDefaultText(key, variables, profile).trim();
    if (!fallback || fallback === current) {
      return '';
    }
    return fallback;
  }

  registerProfile(name, email, pin, sex) {
    this.state = this.storage.registerProfile({ name, email, pin, sex }, this.state);
  }

  loginProfile(profileId, pin) {
    this.state = this.storage.loginProfile({ profileId, pin }, this.state);
  }

  continueAsGuest(name, sex) {
    this.state = this.storage.continueAsGuest({ name, sex }, this.state);
  }

  logoutProfile() {
    this.state = this.storage.logout(this.state);
  }

  setupAdmin(pin) {
    this.state = this.storage.setupAdmin({ pin }, this.state);
  }

  loginAdmin(pin) {
    this.state = this.storage.loginAdmin({ pin }, this.state);
  }

  logoutAdmin() {
    this.state = this.storage.logoutAdmin(this.state);
  }

  changeAdminPin(pin) {
    this.state = this.storage.changeAdminPin({ pin }, this.state);
  }

  updateAdminCopy(copyPatch) {
    this.state = this.storage.updateAdminCopy(copyPatch, this.state);
  }

  resetAdminCopy() {
    this.state = this.storage.resetAdminCopy(this.state);
  }

  updateProfileDetails(profileId, patch) {
    this.state = this.storage.updateProfile({ profileId, ...patch }, this.state);
  }

  deleteProfile(profileId) {
    this.state = this.storage.deleteProfile(profileId, this.state);
  }

  resetProfileProgress(profileId) {
    this.state = this.storage.resetProfileProgress(profileId, this.state);
  }

  save() {
    this.storage.save(this.state);
  }

  setActiveView(view) {
    this.state.progress.activeView = view;
    this.save();
  }

  updateExplorer(patch) {
    this.state.progress.explorer = {
      ...this.state.progress.explorer,
      ...patch
    };
    this.save();
  }

  updateDragDrop(patch) {
    this.state.progress.dragdrop = {
      ...this.state.progress.dragdrop,
      ...patch,
      completedRows: {
        ...this.state.progress.dragdrop.completedRows,
        ...(patch.completedRows || {})
      }
    };
    this.save();
  }

  updateChallenge(patch) {
    this.state.progress.challenge = {
      ...this.state.progress.challenge,
      ...patch
    };
    this.save();
  }

  resetCurrentProfile() {
    const activeProfile = this.getActiveProfile();
    if (!activeProfile) {
      this.state.progress = createDefaultProgressState();
      return;
    }

    if (this.isGuestProfile(activeProfile)) {
      this.state.progress = createDefaultProgressState();
      this.save();
      return;
    }

    this.state.progress = this.storage.resetProgressForProfile(activeProfile.id);
    this.save();
  }

  getAccuracy() {
    const { score, rounds } = this.state.progress.challenge;
    if (!rounds) return 0;
    return Math.round((score / rounds) * 100);
  }

  getUnlockedCount() {
    return VARIANT_NAMES.length;
  }

  isVariantUnlocked(variantIndex) {
    return Number.isInteger(variantIndex) && variantIndex >= 0 && variantIndex < VARIANT_NAMES.length;
  }

  isVariantCompleteByIndex(variantIndex) {
    return isVariantComplete(this.state.progress.challenge.mastery, variantIndex);
  }

  getVariantSummary(variantIndex, audioMap) {
    const mastery = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    const symbols = [
      ...getSymbolsForVariant(variantIndex, 1),
      ...getSymbolsForVariant(variantIndex, 2)
    ];
    const learnedCount = mastery.part1.length + mastery.part2.length;
    return {
      name: VARIANT_NAMES[variantIndex],
      symbolCount: symbols.length,
      learnedCount,
      playableCount: countPlayableSymbols(symbols, audioMap),
      complete: this.isVariantCompleteByIndex(variantIndex),
      unlocked: this.isVariantUnlocked(variantIndex)
    };
  }

  getVariantSymbols(variantIndex, part) {
    return getSymbolsForVariant(variantIndex, part);
  }

  getAdditionalLettersState() {
    return this.state.progress.additionalLetters;
  }

  getAdditionalLetterGroup(groupId = this.state.progress.additionalLetters.groupId) {
    return ADDITIONAL_LETTER_GROUPS.find((group) => group.id === groupId) || ADDITIONAL_LETTER_GROUPS[0];
  }

  getAdditionalLetterHeard(groupId) {
    return this.state.progress.additionalLetters.heardSets[groupId] || [];
  }

  isAdditionalLettersGroupComplete(groupId) {
    return this.state.progress.additionalLetters.completedGroupIds.includes(groupId);
  }

  updateAdditionalLetters(patch) {
    this.state.progress.additionalLetters = {
      ...this.state.progress.additionalLetters,
      ...patch,
      heardSets: {
        ...this.state.progress.additionalLetters.heardSets,
        ...(patch.heardSets || {})
      }
    };
    this.save();
  }

  markAdditionalLetterHeard(groupId, symbol) {
    const heard = this.getAdditionalLetterHeard(groupId);
    if (heard.includes(symbol)) return;

    this.updateAdditionalLetters({
      heardSets: {
        [groupId]: [...heard, symbol]
      }
    });
  }

  markAdditionalLettersGroupComplete(groupId) {
    const completed = this.state.progress.additionalLetters.completedGroupIds;
    if (completed.includes(groupId)) return;

    this.updateAdditionalLetters({
      completedGroupIds: [...completed, groupId]
    });
  }

  getExplorerProgress(variantIndex, part) {
    const mastery = this.state.progress.explorer.mastery[variantIndex] || { part1: [], part2: [] };
    return part === 1 ? mastery.part1 : mastery.part2;
  }

  isExplorerPartComplete(variantIndex, part) {
    return this.getExplorerProgress(variantIndex, part).length >= this.getVariantSymbols(variantIndex, part).length;
  }

  markExplorerSymbolHeard(variantIndex, part, symbol) {
    const key = part === 1 ? 'part1' : 'part2';
    const mastery = [...this.state.progress.explorer.mastery];
    const variant = mastery[variantIndex] || { part1: [], part2: [] };

    if (variant[key].includes(symbol)) {
      return;
    }

    mastery[variantIndex] = {
      ...variant,
      [key]: [...variant[key], symbol]
    };

    this.state.progress.explorer = {
      ...this.state.progress.explorer,
      mastery
    };
    this.save();
  }

  getPartProgress(variantIndex, part) {
    const mastery = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    return part === 1 ? mastery.part1 : mastery.part2;
  }

  markSymbolLearned(variantIndex, part, symbol) {
    const variant = this.state.progress.challenge.mastery[variantIndex] || { part1: [], part2: [] };
    const key = part === 1 ? 'part1' : 'part2';
    if (!variant[key].includes(symbol)) {
      variant[key] = [...variant[key], symbol];
      this.state.progress.challenge.mastery[variantIndex] = variant;
      this.save();
    }
  }

  getDragDropProgress(part) {
    const key = part === 2 ? 'part2' : 'part1';
    return this.state.progress.dragdrop.completedRows[key] || [];
  }

  markDragDropRowComplete(part, rowIndex) {
    const key = part === 2 ? 'part2' : 'part1';
    const rows = this.getDragDropProgress(part);
    if (!rows.includes(rowIndex)) {
      this.state.progress.dragdrop.completedRows[key] = [...rows, rowIndex];
      this.save();
    }
  }
}
