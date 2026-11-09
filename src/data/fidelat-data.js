export const VARIANT_NAMES = ['ግእዝ', 'ካዕብ', 'ሣልስ', 'ራብዕ', 'ኀምስ', 'ሳድስ', 'ሳብዕ'];

export const PRIMARY_ROWS = [
  ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'],
  ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'],
  ['ሐ', 'ሑ', 'ሒ', 'ሓ', 'ሔ', 'ሕ', 'ሖ'],
  ['መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ'],
  ['ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ'],
  ['ረ', 'ሩ', 'ሪ', 'ራ', 'ሬ', 'ር', 'ሮ'],
  ['ሸ', 'ሹ', 'ሺ', 'ሻ', 'ሼ', 'ሽ', 'ሾ'],
  ['ቀ', 'ቁ', 'ቂ', 'ቃ', 'ቄ', 'ቅ', 'ቆ'],
  ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ'],
  ['ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ'],
  ['ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ'],
  ['አ', 'ኡ', 'ኢ', 'ኣ', 'ኤ', 'እ', 'ኦ'],
  ['ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ'],
  ['ጸ', 'ጹ', 'ጺ', 'ጻ', 'ጼ', 'ጽ', 'ጾ']
];

export const SECONDARY_ROWS = [
  ['ሠ', 'ሡ', 'ሢ', 'ሣ', 'ሤ', 'ሥ', 'ሦ'],
  ['ኀ', 'ኁ', 'ኂ', 'ኃ', 'ኄ', 'ኅ', 'ኆ'],
  ['ፀ', 'ፁ', 'ፂ', 'ፃ', 'ፄ', 'ፅ', 'ፆ'],
  ['ዘ', 'ዙ', 'ዚ', 'ዛ', 'ዜ', 'ዝ', 'ዞ'],
  ['ዠ', 'ዡ', 'ዢ', 'ዣ', 'ዤ', 'ዥ', 'ዦ'],
  ['የ', 'ዩ', 'ዪ', 'ያ', 'ዬ', 'ይ', 'ዮ'],
  ['ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ'],
  ['ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ'],
  ['ጠ', 'ጡ', 'ጢ', 'ጣ', 'ጤ', 'ጥ', 'ጦ'],
  ['ጨ', 'ጩ', 'ጪ', 'ጫ', 'ጬ', 'ጭ', 'ጮ'],
  ['ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ'],
  ['ዐ', 'ዑ', 'ዒ', 'ዓ', 'ዔ', 'ዕ', 'ዖ'],
  ['ፈ', 'ፉ', 'ፊ', 'ፋ', 'ፌ', 'ፍ', 'ፎ']
];

export function createEmptyMastery() {
  return VARIANT_NAMES.map(() => ({ part1: [], part2: [] }));
}

export function getSymbolsForVariant(variantIndex, part) {
  const rows = part === 1 ? PRIMARY_ROWS : SECONDARY_ROWS;
  return rows.map((row) => row[variantIndex]).filter(Boolean);
}

export function getAllSymbolsForVariant(variantIndex) {
  return [...getSymbolsForVariant(variantIndex, 1), ...getSymbolsForVariant(variantIndex, 2)];
}

export function countPlayableSymbols(symbols, audioMap) {
  return symbols.filter((symbol) => typeof audioMap[symbol] === 'string' && audioMap[symbol].trim()).length;
}

export function isVariantComplete(mastery, variantIndex) {
  const variant = mastery[variantIndex];
  if (!variant) return false;

  return (
    variant.part1.length >= getSymbolsForVariant(variantIndex, 1).length &&
    variant.part2.length >= getSymbolsForVariant(variantIndex, 2).length
  );
}

export function getHighestUnlockedVariant(mastery) {
  let highest = 0;
  for (let index = 0; index < VARIANT_NAMES.length - 1; index += 1) {
    if (isVariantComplete(mastery, index)) highest = index + 1;
    else break;
  }
  return highest;
}

export const ADDITIONAL_LETTER_GROUPS = [
  { id: 'group-qe', symbols: ['\u1250', '\u1251', '\u1252', '\u1253', '\u1254', '\u1255', '\u1256'] },
  { id: 'group-kxe', symbols: ['\u12b8', '\u12b9', '\u12ba', '\u12bb', '\u12bc', '\u12bd', '\u12be'] },
  { id: 'group-ve', symbols: ['\u1268', '\u1269', '\u126a', '\u126b', '\u126c', '\u126d', '\u126e'] },
  { id: 'group-che', symbols: ['\u1278', '\u1279', '\u127a', '\u127b', '\u127c', '\u127d', '\u127e'] },
  { id: 'group-nye', symbols: ['\u1298', '\u1299', '\u129a', '\u129b', '\u129c', '\u129d', '\u129e'] },
  { id: 'group-je', symbols: ['\u1300', '\u1301', '\u1302', '\u1303', '\u1304', '\u1305', '\u1306'] },
  { id: 'group-phe', symbols: ['\u1330', '\u1331', '\u1332', '\u1333', '\u1334', '\u1335', '\u1336'] },
  { id: 'group-pe', symbols: ['\u1350', '\u1351', '\u1352', '\u1353', '\u1354', '\u1355', '\u1356'] },
  { id: 'group-qwe', symbols: ['\u1248', '\u124a', '\u124b', '\u124c', '\u124d'] },
  { id: 'group-qhwe', symbols: ['\u1258', '\u125a', '\u125b', '\u125c', '\u125d'] },
  { id: 'group-kwe', symbols: ['\u12b0', '\u12b2', '\u12b3', '\u12b4', '\u12b5'] },
  { id: 'group-xwe', symbols: ['\u12c0', '\u12c2', '\u12c3', '\u12c4', '\u12c5'] },
  { id: 'group-gwe', symbols: ['\u1310', '\u1312', '\u1313', '\u1314', '\u1315'] }
];


export function getAdditionalLetterGroup(groupId) {
  return ADDITIONAL_LETTER_GROUPS.find((group) => group.id === groupId) || ADDITIONAL_LETTER_GROUPS[0];
}

export function createEmptyAdditionalHeardMap() {
  return Object.fromEntries(ADDITIONAL_LETTER_GROUPS.map((group) => [group.id, []]));
}

export function createDefaultAdditionalLettersState() {
  return {
    groupId: ADDITIONAL_LETTER_GROUPS[0]?.id || null,
    tab: 'learn',
    selectedSymbol: null,
    lastPlayedSymbol: null,
    heardSets: createEmptyAdditionalHeardMap(),
    shuffledSymbols: [],
    placedSymbols: [],
    selectedDragSymbol: null,
    completedGroupIds: [],
    lastOutcome: null,
    celebrationText: ''
  };
}
