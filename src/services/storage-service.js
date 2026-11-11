import { applyCopyPatch, createDefaultCopyState, mergeCopyWithDefaults, resolveCopy } from './content-service.js?v=test2-1';
import { DEFAULT_THEME_ID, normalizeThemeId } from './theme-service.js';
import { ADDITIONAL_LETTER_GROUPS, createDefaultAdditionalLettersState, createEmptyMastery, VARIANT_NAMES } from '../data/fidelat-data.js';

const SESSION_KEY = 'fidelat-studio-session-v1';
const ADMIN_KEY = 'fidelat-studio-admin-v1';
const LEGACY_KEY = 'geez-fidelat-progress-v10';
const PROFILE_PROGRESS_PREFIX = 'fidelat-studio-progress-v2';
const GUEST_PROFILE_ID = 'guest-local';
const DEFAULT_LOCAL_LEARNER_NAME = 'Learner';
const ACTIVE_VIEWS = new Set(['home', 'explorer', 'dragdrop', 'challenge', 'additionalLetters']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createEmptyProgressMastery() {
  return createEmptyMastery().map((entry) => ({
    part1: [...entry.part1],
    part2: [...entry.part2]
  }));
}

function normalizeArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeMasteryState(mastery) {
  if (!Array.isArray(mastery) || mastery.length !== VARIANT_NAMES.length) {
    return createEmptyProgressMastery();
  }

  return mastery.map((entry) => ({
    part1: normalizeArray(entry?.part1),
    part2: normalizeArray(entry?.part2)
  }));
}

function mergeMasteryStates(primary, secondary) {
  const first = normalizeMasteryState(primary);
  const second = normalizeMasteryState(secondary);

  return first.map((entry, index) => ({
    part1: [...new Set([...entry.part1, ...second[index].part1])],
    part2: [...new Set([...entry.part2, ...second[index].part2])]
  }));
}

function clampVariantIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < VARIANT_NAMES.length ? value : 0;
}

function normalizePart(value) {
  return value === 2 ? 2 : 1;
}

function normalizeAdditionalLettersTab(value) {
  return value === 'dragdrop' ? 'dragdrop' : 'learn';
}

function normalizeAdditionalLettersGroupId(value) {
  return ADDITIONAL_LETTER_GROUPS.some((group) => group.id === value)
    ? value
    : (ADDITIONAL_LETTER_GROUPS[0]?.id || null);
}

function normalizeAdditionalLettersHeardSets(heardSets) {
  const defaults = Object.fromEntries(ADDITIONAL_LETTER_GROUPS.map((group) => [group.id, []]));
  if (!heardSets || typeof heardSets !== 'object') return defaults;

  ADDITIONAL_LETTER_GROUPS.forEach((group) => {
    defaults[group.id] = normalizeArray(heardSets[group.id]);
  });

  return defaults;
}

export function createDefaultProgressState() {
  return {
    activeView: 'explorer',
    explorer: {
      variantIndex: 0,
      part: 1,
      selectedSymbol: null,
      lastPlayedSymbol: null,
      reviewSymbols: null,
      mastery: createEmptyProgressMastery()
    },
    dragdrop: {
      part: 1,
      rowIndex: 0,
      shuffledSymbols: [],
      placedSymbols: [],
      selectedSymbol: null,
      completedRows: {
        part1: [],
        part2: []
      },
      lastOutcome: null,
      completedSet: false,
      celebrationText: ''
    },
    challenge: {
      variantIndex: 0,
      part: 1,
      score: 0,
      rounds: 0,
      correctStreak: 0,
      targetSymbol: null,
      currentChoices: [],
      mastery: createEmptyProgressMastery(),
      lastOutcome: null,
      unlockReadyVariantIndex: null,
      courseCompleted: false,
      celebrationText: ''
    },
    additionalLetters: createDefaultAdditionalLettersState()
  };
}

function createDefaultSession() {
  return {
    profiles: [],
    guestProfile: null,
    activeProfileId: null,
    themeId: DEFAULT_THEME_ID
  };
}

function createDefaultAdminState() {
  return {
    pin: '',
    loggedIn: false,
    lastLoginAt: null,
    copy: createDefaultCopyState()
  };
}

function createProfileId() {
  return 'learner-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function normalizeSex(value) {
  if (value === 'female' || value === 'male') return value;
  return 'unspecified';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(email) {
  return EMAIL_PATTERN.test(email);
}

function normalizeRegisteredProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const normalized = {
    id: String(profile.id || createProfileId()),
    name: String(profile.name || '').trim(),
    email: normalizeEmail(profile.email),
    pin: String(profile.pin || ''),
    sex: normalizeSex(profile.sex),
    createdAt: profile.createdAt || new Date().toISOString(),
    lastLoginAt: profile.lastLoginAt || null,
    kind: 'account',
    localOnly: false
  };

  if (!normalized.name || !normalized.pin) {
    return null;
  }

  return normalized;
}

function normalizeGuestProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const normalized = {
    id: GUEST_PROFILE_ID,
    name: String(profile.name || '').trim(),
    email: '',
    pin: '',
    sex: normalizeSex(profile.sex),
    createdAt: profile.createdAt || new Date().toISOString(),
    lastLoginAt: profile.lastLoginAt || null,
    kind: 'guest',
    localOnly: true
  };

  if (normalized.name.length < 2) {
    return null;
  }

  return normalized;
}

export class StorageService {
  load() {
    const session = this.loadSession();
    const admin = this.loadAdmin();
    const activeProfile = this.getActiveProfileFromSession(session);
    const progress = activeProfile ? this.loadProfileProgress(activeProfile.id) : createDefaultProgressState();
    return { session, admin, progress };
  }

  loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return createDefaultSession();
      return this.normalizeSession(JSON.parse(raw));
    } catch {
      return createDefaultSession();
    }
  }

  loadAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_KEY);
      if (!raw) return createDefaultAdminState();
      return this.normalizeAdmin(JSON.parse(raw));
    } catch {
      return createDefaultAdminState();
    }
  }

  normalizeSession(session) {
    const safe = createDefaultSession();
    if (!session || typeof session !== 'object') return safe;

    safe.profiles = Array.isArray(session.profiles)
      ? session.profiles
          .map((profile) => normalizeRegisteredProfile(profile))
          .filter(Boolean)
      : [];

    safe.guestProfile = normalizeGuestProfile(session.guestProfile);
    safe.activeProfileId = typeof session.activeProfileId === 'string' ? session.activeProfileId : null;
    const storedThemeId = typeof session.themeId === 'string' ? session.themeId : '';
    safe.themeId = normalizeThemeId(storedThemeId === 'orange' ? 'green' : storedThemeId);

    if (safe.activeProfileId === GUEST_PROFILE_ID) {
      if (!safe.guestProfile) safe.activeProfileId = null;
      return safe;
    }

    if (!safe.profiles.some((profile) => profile.id === safe.activeProfileId)) {
      safe.activeProfileId = null;
    }

    return safe;
  }

  normalizeAdmin(admin) {
    const safe = createDefaultAdminState();
    if (!admin || typeof admin !== 'object') return safe;

    safe.pin = typeof admin.pin === 'string' ? admin.pin : '';
    safe.loggedIn = Boolean(admin.loggedIn) && Boolean(safe.pin);
    safe.lastLoginAt = admin.lastLoginAt || null;
    safe.copy = mergeCopyWithDefaults(admin.copy);
    return safe;
  }

  getGuestProfileFromSession(session) {
    return session.guestProfile || null;
  }

  getActiveProfileFromSession(session) {
    if (session.activeProfileId === GUEST_PROFILE_ID) {
      return this.getGuestProfileFromSession(session);
    }

    return session.profiles.find((profile) => profile.id === session.activeProfileId) || null;
  }

  getActiveProfile(state) {
    return this.getActiveProfileFromSession(state.session);
  }

  getText(state, key, profile, variables = {}) {
    const admin = this.normalizeAdmin(state?.admin || this.loadAdmin());
    return resolveCopy(admin.copy, key, profile, variables);
  }

  save(state) {
    this.saveSession(state.session);
    this.saveAdmin(state.admin);
    const activeProfile = this.getActiveProfile(state);
    if (activeProfile) {
      this.saveProfileProgress(activeProfile.id, state.progress);
    }
  }

  saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.normalizeSession(session)));
    } catch {
      // Ignore persistence errors.
    }
  }

  saveAdmin(admin) {
    try {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(this.normalizeAdmin(admin)));
    } catch {
      // Ignore persistence errors.
    }
  }

  updateTheme(themeId, currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    session.themeId = normalizeThemeId(themeId);

    const state = {
      session,
      admin,
      progress: this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState())
    };
    this.save(state);
    return state;
  }

  ensureLearnerSession(currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const activeProfile = this.getActiveProfileFromSession(session);

    if (activeProfile) {
      const state = {
        session,
        admin,
        progress: currentState?.progress
          ? this.mergeProgressWithDefaults(currentState.progress)
          : this.loadProfileProgress(activeProfile.id)
      };
      this.save(state);
      return state;
    }

    const now = new Date().toISOString();
    const previousGuest = session.guestProfile;
    session.guestProfile = {
      id: GUEST_PROFILE_ID,
      name: previousGuest?.name || DEFAULT_LOCAL_LEARNER_NAME,
      email: '',
      pin: '',
      sex: previousGuest?.sex || 'unspecified',
      createdAt: previousGuest?.createdAt || now,
      lastLoginAt: now,
      kind: 'guest',
      localOnly: true
    };
    session.activeProfileId = GUEST_PROFILE_ID;
    admin.loggedIn = false;

    const state = {
      session,
      admin,
      progress: this.loadProfileProgress(GUEST_PROFILE_ID)
    };
    this.save(state);
    return state;
  }

  registerProfile({ name, email, pin, sex }, currentState) {
    const trimmedName = String(name || '').trim();
    const safeEmail = normalizeEmail(email);
    const safePin = String(pin || '').trim();
    const safeSex = normalizeSex(sex);

    if (trimmedName.length < 2) {
      throw new Error('Learner name should be at least 2 characters.');
    }

    if (safeEmail && !validateEmail(safeEmail)) {
      throw new Error('Enter a valid email address for the learner.');
    }

    if (safePin.length < 4) {
      throw new Error('Use a simple PIN with at least 4 characters.');
    }

    if (safeSex === 'unspecified') {
      throw new Error('Choose male or female for the learner.');
    }

    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const duplicateName = session.profiles.find(
      (profile) => profile.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      throw new Error('That learner name already exists. Please choose a different one.');
    }

    if (safeEmail) {
      const duplicateEmail = session.profiles.find((profile) => profile.email && profile.email === safeEmail);
      if (duplicateEmail) {
        throw new Error('That learner email already exists. Please choose a different one.');
      }
    }

    const now = new Date().toISOString();
    const profile = {
      id: createProfileId(),
      name: trimmedName,
      email: safeEmail,
      pin: safePin,
      sex: safeSex,
      createdAt: now,
      lastLoginAt: now,
      kind: 'account',
      localOnly: false
    };

    session.profiles = [...session.profiles, profile];
    session.activeProfileId = profile.id;
    admin.loggedIn = false;

    const progress = session.profiles.length === 1
      ? this.loadLegacy() || createDefaultProgressState()
      : createDefaultProgressState();

    const state = { session, admin, progress };
    this.save(state);
    return state;
  }

  continueAsGuest({ name, sex }, currentState) {
    const trimmedName = String(name || '').trim();
    const safeSex = normalizeSex(sex);

    if (trimmedName.length < 2) {
      throw new Error('Give the local learner a name with at least 2 characters.');
    }

    if (safeSex === 'unspecified') {
      throw new Error('Choose male or female for the local learner.');
    }

    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const now = new Date().toISOString();
    const previousGuest = session.guestProfile;

    session.guestProfile = {
      id: GUEST_PROFILE_ID,
      name: trimmedName,
      email: '',
      pin: '',
      sex: safeSex,
      createdAt: previousGuest?.createdAt || now,
      lastLoginAt: now,
      kind: 'guest',
      localOnly: true
    };
    session.activeProfileId = GUEST_PROFILE_ID;
    admin.loggedIn = false;

    const state = {
      session,
      admin,
      progress: this.loadProfileProgress(GUEST_PROFILE_ID)
    };
    this.save(state);
    return state;
  }

  loginProfile({ profileId, pin }, currentState) {
    const safePin = String(pin || '').trim();
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const profile = session.profiles.find((item) => item.id === profileId);

    if (!profile) {
      throw new Error('Choose a learner profile first.');
    }

    if (profile.pin !== safePin) {
      throw new Error('The PIN is not correct for that learner.');
    }

    const updatedProfile = {
      ...profile,
      lastLoginAt: new Date().toISOString()
    };

    session.profiles = session.profiles.map((item) => (item.id === profileId ? updatedProfile : item));
    session.activeProfileId = profileId;
    admin.loggedIn = false;

    const state = {
      session,
      admin,
      progress: this.loadProfileProgress(profileId)
    };
    this.save(state);
    return state;
  }

  logout(currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    session.activeProfileId = null;
    admin.loggedIn = false;

    const state = {
      session,
      admin,
      progress: createDefaultProgressState()
    };
    this.save(state);
    return state;
  }

  setupAdmin({ pin }, currentState) {
    const safePin = String(pin || '').trim();
    if (safePin.length < 4) {
      throw new Error('Use an administrator PIN with at least 4 characters.');
    }

    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    if (admin.pin) {
      throw new Error('An administrator profile already exists on this device.');
    }

    session.activeProfileId = null;
    admin.pin = safePin;
    admin.loggedIn = true;
    admin.lastLoginAt = new Date().toISOString();

    const state = {
      session,
      admin,
      progress: createDefaultProgressState()
    };
    this.save(state);
    return state;
  }

  loginAdmin({ pin }, currentState) {
    const safePin = String(pin || '').trim();
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());

    if (!admin.pin) {
      throw new Error('Set up the administrator PIN first.');
    }

    if (admin.pin !== safePin) {
      throw new Error('The administrator PIN is not correct.');
    }

    session.activeProfileId = null;
    admin.loggedIn = true;
    admin.lastLoginAt = new Date().toISOString();

    const state = {
      session,
      admin,
      progress: createDefaultProgressState()
    };
    this.save(state);
    return state;
  }

  logoutAdmin(currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    admin.loggedIn = false;

    const state = {
      session,
      admin,
      progress: createDefaultProgressState()
    };
    this.save(state);
    return state;
  }

  changeAdminPin({ pin }, currentState) {
    const safePin = String(pin || '').trim();
    if (safePin.length < 4) {
      throw new Error('Use an administrator PIN with at least 4 characters.');
    }

    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    if (!admin.pin) {
      throw new Error('Set up the administrator PIN first.');
    }

    admin.pin = safePin;

    const state = {
      session,
      admin,
      progress: this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState())
    };
    this.save(state);
    return state;
  }

  updateAdminCopy(copyPatch, currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    admin.copy = applyCopyPatch(admin.copy, copyPatch);

    const state = {
      session,
      admin,
      progress: this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState())
    };
    this.save(state);
    return state;
  }

  resetAdminCopy(currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    admin.copy = createDefaultCopyState();

    const state = {
      session,
      admin,
      progress: this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState())
    };
    this.save(state);
    return state;
  }

  updateProfile({ profileId, name, email, pin, sex }, currentState) {
    const trimmedName = String(name || '').trim();
    const safeEmail = normalizeEmail(email);
    const safePin = String(pin || '').trim();
    const safeSex = normalizeSex(sex);
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const existing = session.profiles.find((profile) => profile.id === profileId);

    if (!existing) {
      throw new Error('That learner profile no longer exists.');
    }

    if (trimmedName.length < 2) {
      throw new Error('Learner name should be at least 2 characters.');
    }

    if (safeEmail && !validateEmail(safeEmail)) {
      throw new Error('Enter a valid email address for the learner.');
    }

    if (safePin.length < 4) {
      throw new Error('Use a simple PIN with at least 4 characters.');
    }

    if (safeSex === 'unspecified') {
      throw new Error('Choose male or female for the learner.');
    }

    const duplicateName = session.profiles.find(
      (profile) => profile.id !== profileId && profile.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicateName) {
      throw new Error('That learner name already exists. Please choose a different one.');
    }

    if (safeEmail) {
      const duplicateEmail = session.profiles.find(
        (profile) => profile.id !== profileId && profile.email && profile.email === safeEmail
      );
      if (duplicateEmail) {
        throw new Error('That learner email already exists. Please choose a different one.');
      }
    }

    session.profiles = session.profiles.map((profile) => (
      profile.id === profileId
        ? {
            ...profile,
            name: trimmedName,
            email: safeEmail,
            pin: safePin,
            sex: safeSex
          }
        : profile
    ));

    const activeProfile = this.getActiveProfileFromSession(session);
    const progress = activeProfile
      ? this.loadProfileProgress(activeProfile.id)
      : this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState());

    const state = { session, admin, progress };
    this.save(state);
    return state;
  }

  deleteProfile(profileId, currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const existing = session.profiles.find((profile) => profile.id === profileId);

    if (!existing) {
      throw new Error('That learner profile no longer exists.');
    }

    session.profiles = session.profiles.filter((profile) => profile.id !== profileId);
    if (session.activeProfileId === profileId) {
      session.activeProfileId = null;
    }

    try {
      localStorage.removeItem(this.getProgressKey(profileId));
    } catch {
      // Ignore delete failures.
    }

    const activeProfile = this.getActiveProfileFromSession(session);
    const progress = activeProfile
      ? this.loadProfileProgress(activeProfile.id)
      : createDefaultProgressState();

    const state = { session, admin, progress };
    this.save(state);
    return state;
  }

  resetProfileProgress(profileId, currentState) {
    const session = this.normalizeSession(currentState?.session || this.loadSession());
    const admin = this.normalizeAdmin(currentState?.admin || this.loadAdmin());
    const existing = session.profiles.find((profile) => profile.id === profileId);

    if (!existing) {
      throw new Error('That learner profile no longer exists.');
    }

    try {
      localStorage.removeItem(this.getProgressKey(profileId));
    } catch {
      // Ignore reset failures.
    }

    const progress = session.activeProfileId === profileId
      ? createDefaultProgressState()
      : this.mergeProgressWithDefaults(currentState?.progress || createDefaultProgressState());

    const state = { session, admin, progress };
    this.save(state);
    return state;
  }

  resetProgressForProfile(profileId) {
    try {
      localStorage.removeItem(this.getProgressKey(profileId));
    } catch {
      // Ignore reset failures.
    }
    return createDefaultProgressState();
  }

  loadProfileProgress(profileId) {
    try {
      const raw = localStorage.getItem(this.getProgressKey(profileId));
      if (!raw) return createDefaultProgressState();
      return this.mergeProgressWithDefaults(JSON.parse(raw));
    } catch {
      return createDefaultProgressState();
    }
  }

  saveProfileProgress(profileId, progress) {
    try {
      localStorage.setItem(this.getProgressKey(profileId), JSON.stringify(this.mergeProgressWithDefaults(progress)));
    } catch {
      // Ignore persistence errors.
    }
  }

  getProgressKey(profileId) {
    return PROFILE_PROGRESS_PREFIX + ':' + profileId;
  }

  loadLegacy() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const progress = createDefaultProgressState();
      const mastery = Array.isArray(parsed.mastery) && parsed.mastery.length === VARIANT_NAMES.length
        ? parsed.mastery.map((entry) => ({
            part1: Array.isArray(entry.part1) ? entry.part1 : [],
            part2: Array.isArray(entry.part2) ? entry.part2 : []
          }))
        : createEmptyMastery();

      progress.challenge.variantIndex = clampVariantIndex(parsed.currentVariant);
      progress.challenge.part = normalizePart(parsed.currentPart);
      progress.challenge.score = Number.isFinite(parsed.score) ? parsed.score : 0;
      progress.challenge.rounds = Number.isFinite(parsed.rounds) ? parsed.rounds : 0;
      progress.challenge.mastery = normalizeMasteryState(mastery);
      progress.explorer.variantIndex = progress.challenge.variantIndex;
      progress.explorer.part = progress.challenge.part;
      progress.explorer.mastery = normalizeMasteryState(mastery);
      return progress;
    } catch {
      return null;
    }
  }

  mergeProgressWithDefaults(progress) {
    const defaults = createDefaultProgressState();
    const merged = {
      ...defaults,
      ...progress,
      explorer: {
        ...defaults.explorer,
        ...(progress?.explorer || {})
      },
      dragdrop: {
        ...defaults.dragdrop,
        ...(progress?.dragdrop || {}),
        completedRows: {
          ...defaults.dragdrop.completedRows,
          ...(progress?.dragdrop?.completedRows || {})
        }
      },
      challenge: {
        ...defaults.challenge,
        ...(progress?.challenge || {})
      },
      additionalLetters: {
        ...defaults.additionalLetters,
        ...(progress?.additionalLetters || {}),
        heardSets: {
          ...defaults.additionalLetters.heardSets,
          ...(progress?.additionalLetters?.heardSets || {})
        }
      }
    };

    merged.activeView = ACTIVE_VIEWS.has(merged.activeView) ? merged.activeView : 'explorer';
    merged.explorer.variantIndex = clampVariantIndex(merged.explorer.variantIndex);
    merged.explorer.part = normalizePart(merged.explorer.part);
    merged.explorer.selectedSymbol = merged.explorer.selectedSymbol || null;
    merged.explorer.lastPlayedSymbol = merged.explorer.lastPlayedSymbol || null;

    merged.dragdrop.part = normalizePart(merged.dragdrop.part);
    merged.dragdrop.rowIndex = Number.isInteger(merged.dragdrop.rowIndex) && merged.dragdrop.rowIndex >= 0
      ? merged.dragdrop.rowIndex
      : 0;
    merged.dragdrop.shuffledSymbols = Array.isArray(merged.dragdrop.shuffledSymbols) ? merged.dragdrop.shuffledSymbols : [];
    merged.dragdrop.placedSymbols = Array.isArray(merged.dragdrop.placedSymbols) ? merged.dragdrop.placedSymbols : [];
    merged.dragdrop.completedRows = {
      part1: Array.isArray(merged.dragdrop.completedRows.part1) ? merged.dragdrop.completedRows.part1 : [],
      part2: Array.isArray(merged.dragdrop.completedRows.part2) ? merged.dragdrop.completedRows.part2 : []
    };

    merged.additionalLetters.groupId = normalizeAdditionalLettersGroupId(merged.additionalLetters.groupId);
    merged.additionalLetters.tab = normalizeAdditionalLettersTab(merged.additionalLetters.tab);
    merged.additionalLetters.selectedSymbol = merged.additionalLetters.selectedSymbol || null;
    merged.additionalLetters.lastPlayedSymbol = merged.additionalLetters.lastPlayedSymbol || null;
    merged.additionalLetters.heardSets = normalizeAdditionalLettersHeardSets(merged.additionalLetters.heardSets);
    merged.additionalLetters.shuffledSymbols = Array.isArray(merged.additionalLetters.shuffledSymbols)
      ? merged.additionalLetters.shuffledSymbols
      : [];
    merged.additionalLetters.placedSymbols = Array.isArray(merged.additionalLetters.placedSymbols)
      ? merged.additionalLetters.placedSymbols
      : [];
    merged.additionalLetters.selectedDragSymbol = merged.additionalLetters.selectedDragSymbol || null;
    merged.additionalLetters.completedGroupIds = normalizeArray(merged.additionalLetters.completedGroupIds)
      .filter((groupId) => ADDITIONAL_LETTER_GROUPS.some((group) => group.id === groupId));
    merged.additionalLetters.lastOutcome = merged.additionalLetters.lastOutcome || null;
    merged.additionalLetters.celebrationText = merged.additionalLetters.celebrationText || '';

    merged.challenge.variantIndex = clampVariantIndex(merged.challenge.variantIndex);
    merged.challenge.part = normalizePart(merged.challenge.part);
    merged.challenge.score = Number.isFinite(merged.challenge.score) ? merged.challenge.score : 0;
    merged.challenge.rounds = Number.isFinite(merged.challenge.rounds) ? merged.challenge.rounds : 0;
    merged.challenge.currentChoices = Array.isArray(merged.challenge.currentChoices) ? merged.challenge.currentChoices : [];

    const challengeMastery = normalizeMasteryState(merged.challenge.mastery);
    const explorerMastery = normalizeMasteryState(merged.explorer.mastery);
    merged.challenge.mastery = challengeMastery;
    merged.explorer.mastery = mergeMasteryStates(explorerMastery, challengeMastery);

    return merged;
  }
}
