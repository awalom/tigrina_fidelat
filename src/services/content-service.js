function learnerField(config) {
  return {
    gendered: true,
    femaleText: '',
    maleText: '',
    ...config
  };
}

function sharedField(config) {
  return {
    gendered: false,
    ...config
  };
}

const COPY_CATALOG = [
  {
    id: 'labels',
    title: 'Reusable Labels',
    description: 'Short labels that appear across learner and admin screens.',
    fields: [
      learnerField({
        key: 'labels.learnerType',
        label: 'Learner label',
        help: 'Used in profile summaries and can have different female and male wording.',
        defaultText: 'Learner',
        femaleText: 'Girl Learner',
        maleText: 'Boy Learner'
      }),
      sharedField({
        key: 'labels.adminRole',
        label: 'Admin label',
        help: 'Shown when the administrator is logged in.',
        defaultText: 'Administrator'
      })
    ]
  },
  {
    id: 'navigation',
    title: 'Top Banner',
    description: 'The welcome text that appears above the learner or admin workspace.',
    fields: [
      sharedField({
        key: 'menu.brandEyebrow',
        label: 'Small title',
        help: 'A short line above the main heading.',
        defaultText: 'Fidelat House'
      }),
      sharedField({
        key: 'menu.brandTitle',
        label: 'Main heading',
        help: 'The large headline shown at the top of the app.',
        defaultText: 'Learn in one place, step by step.'
      }),
      learnerField({
        key: 'menu.brandCopy',
        label: 'Top description',
        help: 'A short explanation under the top heading on the learner page.',
        defaultText: 'Explorer, drag-and-drop, and challenge work all live under one menu so the learner can stay in a familiar flow.'
      })
    ]
  },
  {
    id: 'auth',
    title: 'Optional Account Pages',
    description: 'Saved wording for optional learner sign-in screens and administrator sign-in. Learners currently start without signing in.',
    fields: [
      learnerField({
        key: 'auth.registerTitle',
        label: 'Create account title',
        help: 'The heading above the learner account registration form.',
        defaultText: 'Create a learner account'
      }),
      learnerField({
        key: 'auth.registerIntro',
        label: 'Create account description',
        help: 'Shown under the learner registration card.',
        defaultText: "This is a simple local registration system for tracing each learner's progress on this device before you publish online."
      }),
      learnerField({
        key: 'auth.loginTitle',
        label: 'Login title',
        help: 'The heading above the learner login card.',
        defaultText: 'Continue a learner account'
      }),
      learnerField({
        key: 'auth.loginIntro',
        label: 'Login description',
        help: 'Shown under the learner login card.',
        defaultText: 'Use the same learner name and PIN on this browser to reopen saved progress.'
      }),
      learnerField({
        key: 'auth.guestTitle',
        label: 'Guest title',
        help: 'The heading above the continue-without-account card.',
        defaultText: 'Continue without an account'
      }),
      learnerField({
        key: 'auth.guestIntro',
        label: 'Guest description',
        help: 'Explain that this option stays local to the current browser on this device.',
        defaultText: 'Stay on this device with a local-only learner profile. Progress is saved in this browser even without a learner account.'
      }),
      learnerField({
        key: 'auth.guestResumeNote',
        label: 'Guest resume note',
        help: 'Shown when a saved local learner already exists. You can use {name}.',
        defaultText: 'Local progress was last saved for {name} on this device.'
      }),
      sharedField({
        key: 'auth.adminSetupTitle',
        label: 'Admin setup title',
        help: 'The heading above the first-time admin setup form.',
        defaultText: 'Set up admin access'
      }),
      sharedField({
        key: 'auth.adminLoginTitle',
        label: 'Admin login title',
        help: 'The heading above the admin login form once admin access already exists.',
        defaultText: 'Open admin tools'
      }),
      sharedField({
        key: 'auth.adminIntro',
        label: 'Admin description',
        help: 'Shown under the admin card. Explain what the admin tools are for.',
        defaultText: 'Use the local admin tools to change learner-facing page text, set gender-specific wording, and manage learner accounts on this device.'
      })
    ]
  },
  {
    id: 'home',
    title: 'Help',
    description: 'Getting started, guidance for adults, activity cards, and progress summaries. Existing dashboard wording is preserved.',
    fields: [
      learnerField({
        key: 'help.title',
        label: 'Help page title',
        help: 'Main heading on the Help page at the end of the menu.',
        defaultText: 'Help: how to practice'
      }),
      learnerField({
        key: 'help.gettingStarted',
        label: 'Getting started',
        help: 'Simple guidance at the top of Help. Line breaks are preserved.',
        defaultText: 'Start in Learn: choose a variant and tap a letter to hear it. Listen and repeat as often as you like.\nTry Test 1: choose Part 1 or Part 2 and put each letter in its place. Tap a letter and then a spot, or drag it. A correct answer plays the sound.\nTry Test 2: choose any variant, listen, and tap the matching letter. Use the repeat button to hear it again.\nOpen More to practice extra letters. You can return to Learn at any time.'
      }),
      learnerField({
        key: 'help.adults',
        label: 'Guidance for parents and teachers',
        help: 'Expandable guidance on Help, including bookmarks, sound, and shared devices.',
        defaultText: 'Keep practice short and let the learner repeat familiar letters. In Learn, Part 2 opens after every letter in Part 1 has been heard. Review Part 1 starts another practice pass.\nTo share daily practice, select a part, variant, or set and copy the address from your browser. The link opens that practice directly.\nProgress is saved in this browser. Before another learner starts on the same device, use Reset Progress; it clears progress in all sections.\nIf you cannot hear a sound, check the device volume and tap a letter or the repeat button. Use Your fav color to choose a comfortable page color.'
      }),
      learnerField({
        key: 'home.pageBadge',
        label: 'Home badge',
        help: 'The small badge shown above the learner welcome panel.',
        defaultText: 'Learning Path'
      }),
      learnerField({
        key: 'home.welcomeTitle',
        label: 'Welcome heading',
        help: 'You can use {name}. Female and male fields override the default message.',
        defaultText: 'Welcome back, {name}.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'home.welcomeBody',
        label: 'Welcome description',
        help: 'A longer explanation on the learner Help page. You can use {name} and {learnerType}.',
        defaultText: 'Begin with Learn, practice letter order in Test 1, then listen and match in Test 2. Explore additional letters in More.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'home.explorerTitle',
        label: 'Explorer card title',
        help: 'Title shown above the Explorer activity card on the Help page.',
        defaultText: 'Learn'
      }),
      learnerField({
        key: 'home.explorerCopy',
        label: 'Explorer activity card',
        help: 'Text shown under the Explorer card on the Help page.',
        defaultText: 'Press letters and hear them as often as needed.'
      }),
      learnerField({
        key: 'home.dragdropTitle',
        label: 'Drag and drop card title',
        help: 'Title shown above the Drag and Drop activity card on the Help page.',
        defaultText: 'Test 1'
      }),
      learnerField({
        key: 'home.dragdropCopy',
        label: 'Drag and drop activity card',
        help: 'Text shown under the Drag and Drop card on the Help page.',
        defaultText: 'Arrange each family from the first variant to the seventh variant using drag-and-drop or tap-to-place, choosing Part 1 or Part 2 for daily practice.'
      }),
      learnerField({
        key: 'home.challengeTitle',
        label: 'Challenge card title',
        help: 'Title shown above the Challenge activity card on the Help page.',
        defaultText: 'Test 2'
      }),
      learnerField({
        key: 'home.challengeCopy',
        label: 'Challenge activity card',
        help: 'Text shown under the Challenge card on the Help page.',
        defaultText: 'Choose any of the seven variants from the dropdown and match each sound to its letter.'
      }),
      learnerField({
        key: 'home.additionalTitle',
        label: 'More letters card title',
        help: 'Title shown above the More Letters activity card on the Help page.',
        defaultText: 'Learn Additional Tigrinya Letters'
      }),
      learnerField({
        key: 'home.additionalCopy',
        label: 'More letters activity card',
        help: 'Text shown under the More Letters card on the Help page.',
        defaultText: 'Practice the extra Tigrinya letter sets one family at a time with Learn and Drag & Drop.'
      }),
      sharedField({
        key: 'home.additionalButtonLabel',
        label: 'More letters button label',
        help: 'Label shown on the Help-page button that opens the More Letters page.',
        defaultText: 'Open More Letters'
      }),
      learnerField({
        key: 'home.snapshotTitle',
        label: 'Snapshot title',
        help: 'The heading shown above the learner snapshot panel.',
        defaultText: 'Learner Snapshot'
      }),
      learnerField({
        key: 'home.snapshotSummary',
        label: 'Snapshot summary',
        help: 'Shown in the learner snapshot panel. You can use {learnerType}, {variantName}, and {part}.',
        defaultText: 'Current profile: {learnerType}. Current challenge focus: {variantName} - Part {part}.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'home.progressTitle',
        label: 'Progress title',
        help: 'The heading shown above the variant progress panel.',
        defaultText: 'Variant Progress'
      })
    ]
  },
  {
    id: 'learn',
    title: 'Learn',
    description: 'Choose a variant, hear letters in Parts 1 and 2, and review completed practice.',
    fields: [
      learnerField({
        key: 'explorer.title',
        label: 'Explorer title',
        help: 'Main title for the explorer page.',
        defaultText: 'Alphabet Explorer'
      }),
      learnerField({
        key: 'explorer.intro',
        label: 'Explorer introduction',
        help: 'You can use {name} and {learnerType} if needed.',
        defaultText: 'A gentle practice page for recognizing and hearing each letter before moving to drag-and-drop or challenge work.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'explorer.instructions',
        label: 'Learn instructions',
        help: 'Shown inside Instructions on Learn. Enter your own guidance here; line breaks are preserved. You can use {name}.',
        defaultText: 'Choose a variant from the dropdown, then tap each letter to hear its sound. Replay letters as often as you like.\nAfter you hear every letter in Part 1, Part 2 opens. Use Review Part 1 to practice again, or Open Part 2 to return to it.\nUse Reset Progress when a new learner uses this browser. This clears progress in all sections.'
      }),
      learnerField({
        key: 'explorer.helperIdle',
        label: 'Explorer starting instruction',
        help: 'Shown before the learner has selected a symbol in the current explorer part.',
        defaultText: 'Start by pressing any Fidelat button. Beginners can stay on this page as long as they need before moving to the next activity.'
      }),
      learnerField({
        key: 'explorer.helperActive',
        label: 'Explorer active instruction',
        help: 'Shown after the learner has selected at least one symbol in the current explorer part.',
        defaultText: 'Press another symbol to hear it again, or replay the current one while the learner studies the shape.'
      }),
      learnerField({
        key: 'explorer.partAdvanceMessage',
        label: 'Explorer part-advance message',
        help: 'Shown when the learner finishes the first explorer part for a variant. You can use {variantName}.',
        defaultText: 'The first part is complete. The second part is now open for {variantName}.'
      }),
    ]
  },
  {
    id: 'test1',
    title: 'Test 1',
    description: 'Two daily practice parts, beginning with ሀ. Arrange the seven variants; correct placements play their sounds.',
    fields: [
      learnerField({
        key: 'dragdrop.title',
        label: 'Drag and drop title',
        help: 'Main title for the drag and drop page.',
        defaultText: 'Drag And Drop Studio'
      }),
      learnerField({
        key: 'dragdrop.intro',
        label: 'Drag and drop introduction',
        help: 'You can use {name} and {learnerType} if needed.',
        defaultText: 'Arrange each shuffled family from the first variant to the seventh variant. Choose Part 1 or Part 2 for daily practice. Each correct placement plays the letter sound.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'dragdrop.instructions',
        label: 'Drag and drop instruction',
        help: 'Shown above the slots while a row is active. You can use {rowLabel} and {partLabel}.',
        defaultText: 'Drag each letter of the {rowLabel} family into the correct variant position.'
      }),
    ]
  },
  {
    id: 'more',
    title: 'More',
    description: 'Additional letter sets, with Learn and Drag & Drop practice.',
    fields: [
      learnerField({
        key: 'additional.title',
        label: 'More letters title',
        help: 'Main title for the More Letters page.',
        defaultText: 'More Letters'
      }),
      learnerField({
        key: 'additional.intro',
        label: 'More letters introduction',
        help: 'You can use {name} and {learnerType} if needed.',
        defaultText: 'Practice the extra Tigrinya letter sets one family at a time with a simple Learn mode and a lighter Drag & Drop review.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'additional.learnHelper',
        label: 'More letters learn helper',
        help: 'Shown under the current set in the Learn tab.',
        defaultText: 'Tap any letter in this set to hear it.'
      }),
      sharedField({
        key: 'additional.learnTabLabel',
        label: 'More letters Learn tab label',
        help: 'Label shown on the Learn tab button.',
        defaultText: 'Learn'
      }),
      sharedField({
        key: 'additional.dragdropTabLabel',
        label: 'More letters Drag & Drop tab label',
        help: 'Label shown on the Drag & Drop tab button.',
        defaultText: 'Drag & Drop'
      }),
      sharedField({
        key: 'additional.replayLabel',
        label: 'More letters replay button',
        help: 'Label shown on the replay button in the Learn tab.',
        defaultText: 'Replay Current'
      }),
      sharedField({
        key: 'additional.shuffleLabel',
        label: 'More letters shuffle button',
        help: 'Label shown on the shuffle button in the Drag & Drop tab.',
        defaultText: 'Shuffle Again'
      }),
    ]
  },
  {
    id: 'test2',
    title: 'Test 2',
    description: 'Listen and match. All seven variants are available from the dropdown, with two parts per variant.',
    fields: [
      learnerField({
        key: 'challenge.title',
        label: 'Challenge title',
        help: 'Main title for the challenge page.',
        defaultText: 'Listen And Match'
      }),
      learnerField({
        key: 'challenge.intro',
        label: 'Challenge introduction',
        help: 'You can use {name} and {learnerType} if needed.',
        defaultText: 'Choose any variant from the dropdown to begin a listening challenge. All seven variants are available from the start.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'challenge.loadingMessage',
        label: 'Challenge loading message',
        help: 'Shown while audio files are still loading.',
        defaultText: 'Audio files are still loading. The sound will play when they are ready.'
      }),
      learnerField({
        key: 'challenge.readyMessage',
        label: 'Challenge ready instruction',
        help: 'Shown while a prompt is ready and waiting for a response.',
        defaultText: 'Listen to the prompt, then choose the matching Fidelat symbol below.'
      }),
      learnerField({
        key: 'challenge.waitingMessage',
        label: 'Challenge waiting instruction',
        help: 'Shown when no prompt is currently active.',
        defaultText: 'Listen to the sound, or use the repeat button to hear it again.'
      }),
      learnerField({
        key: 'challenge.promptReady',
        label: 'Challenge prompt-ready message',
        help: 'Shown inside the message box while a prompt is active.',
        defaultText: 'Prompt is ready. Tap the right symbol after listening.'
      }),
      learnerField({
        key: 'challenge.unlockBody',
        label: 'Challenge completion panel',
        help: 'Shown when a variant is complete. You can use {nextVariantName}.',
        defaultText: 'Well done! Choose any variant from the dropdown, or continue with {nextVariantName} below.'
      }),
      learnerField({
        key: 'challenge.finalBody',
        label: 'Challenge final panel',
        help: 'Shown when all variants are complete.',
        defaultText: 'The learner finished every variant. You can review any variant from the dropdown, or reset progress for a fresh start.'
      })
    ]
  },
  {
    id: 'admin',
    title: 'Admin Pages',
    description: 'The headings and guidance shown inside the admin route.',
    fields: [
      sharedField({
        key: 'admin.title',
        label: 'Admin title',
        help: 'Main title for the admin page.',
        defaultText: 'Admin Studio'
      }),
      sharedField({
        key: 'admin.intro',
        label: 'Admin introduction',
        help: 'Short description shown under the admin title.',
        defaultText: 'Adjust learner-facing page text, provide gender-specific wording, and manage learner accounts on this device.'
      }),
      sharedField({
        key: 'admin.copyHint',
        label: 'Admin copy hint',
        help: 'Shown above the page-text editor.',
        defaultText: 'Use placeholders like {name}, {learnerType}, {variantName}, and {part}. Leave female or male text empty when the default wording already works for everyone.'
      }),
      sharedField({
        key: 'admin.securityHint',
        label: 'Admin security hint',
        help: 'Shown above the admin security panel.',
        defaultText: 'Administrator changes are stored locally in this browser on this device. Learner text updates and learner account updates appear immediately after saving.'
      })
    ]
  },
  {
    id: 'system',
    title: 'System Messages',
    description: 'Short banner messages that appear after learner actions.',
    fields: [
      learnerField({
        key: 'system.profileCreated',
        label: 'Profile created banner',
        help: 'Shown after a new learner account is created. You can use {name} and {learnerType}.',
        defaultText: '{learnerType} profile created for {name}.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'system.loginRestored',
        label: 'Login restored banner',
        help: 'Shown after a learner logs back in. You can use {name} and {learnerType}.',
        defaultText: 'Welcome back, {name}. {learnerType} profile restored.',
        femaleText: '',
        maleText: ''
      }),
      learnerField({
        key: 'system.guestStarted',
        label: 'Guest started banner',
        help: 'Shown after a learner continues without an account. You can use {name} and {learnerType}.',
        defaultText: '{learnerType} local session is ready for {name}.',
        femaleText: '',
        maleText: ''
      })
    ]
  }
];

// Keep field keys stable so reorganizing the editor preserves saved manual wording.
const SECTION_ORDER = ['learn', 'test1', 'test2', 'more', 'home', 'navigation', 'labels', 'admin', 'auth', 'system'];
function currentActivityNames(text) {
  return text.replace(/Explorer|explorer/g, 'Learn')
    .replace(/Drag and drop|drag and drop/g, 'Test 1')
    .replace(/Challenge|challenge/g, 'Test 2');
}
export const COPY_SECTIONS = SECTION_ORDER.map(id => {
  const section = COPY_CATALOG.find(section => section.id === id);
  return {
    ...section,
    fields: section.fields.map(field => ({ ...field,
      label: currentActivityNames(field.label),
      help: currentActivityNames(field.help)
    }))
  };
});

function createCopyEntry(field) {
  return {
    default: field.defaultText || '',
    female: field.gendered ? field.femaleText || '' : '',
    male: field.gendered ? field.maleText || '' : ''
  };
}

export function createDefaultCopyState() {
  return COPY_SECTIONS.reduce((copy, section) => {
    section.fields.forEach((field) => {
      copy[field.key] = createCopyEntry(field);
    });
    return copy;
  }, {});
}

export function mergeCopyWithDefaults(copyState) {
  const defaults = createDefaultCopyState();
  const merged = {};

  Object.entries(defaults).forEach(([key, value]) => {
    const incoming = copyState?.[key];
    if (typeof incoming === 'string') {
      merged[key] = {
        ...value,
        default: incoming
      };
      return;
    }

    merged[key] = {
      default: typeof incoming?.default === 'string' ? incoming.default : value.default,
      female: typeof incoming?.female === 'string' ? incoming.female : value.female,
      male: typeof incoming?.male === 'string' ? incoming.male : value.male
    };
  });

  return merged;
}

export function applyCopyPatch(copyState, patch) {
  const merged = mergeCopyWithDefaults(copyState);
  if (!patch || typeof patch !== 'object') return merged;

  Object.entries(patch).forEach(([key, value]) => {
    if (!merged[key]) return;

    if (typeof value === 'string') {
      merged[key] = {
        ...merged[key],
        default: value
      };
      return;
    }

    merged[key] = {
      ...merged[key],
      default: typeof value?.default === 'string' ? value.default : merged[key].default,
      female: typeof value?.female === 'string' ? value.female : merged[key].female,
      male: typeof value?.male === 'string' ? value.male : merged[key].male
    };
  });

  return mergeCopyWithDefaults(merged);
}

function pickText(entry, sex) {
  if (sex === 'female' && entry.female) return entry.female;
  if (sex === 'male' && entry.male) return entry.male;
  return entry.default;
}

function interpolate(template, variables) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key] ?? '');
    }
    return '';
  });
}

export function resolveCopy(copyState, key, profile, variables = {}) {
  const merged = mergeCopyWithDefaults(copyState);
  const entry = merged[key];
  if (!entry) return '';

  const resolved = {
    ...variables,
    name: variables.name ?? profile?.name ?? 'learner'
  };

  if (key !== 'labels.learnerType') {
    const learnerTypeEntry = merged['labels.learnerType'];
    resolved.learnerType = resolved.learnerType
      ?? interpolate(pickText(learnerTypeEntry, profile?.sex), resolved);
  }

  return interpolate(pickText(entry, profile?.sex), resolved);
}
