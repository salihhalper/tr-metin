// tr-metin: Turkish-aware text helpers with no dependencies.
// Results do not depend on Intl, ICU data or the runtime's default locale.

/** The Turkish alphabet in dictionary order, with q, w and x in their Latin places. */
export const ALPHABET = 'abcçdefgğhıijklmnoöpqrsştuüvwxyz';

const WEIGHT = new Map([...ALPHABET].map((letter, index) => [letter, index]));

// Letters that have no Unicode decomposition, so stripping marks cannot reduce them to ASCII.
const NO_DECOMPOSITION = {
  ı: 'i', ł: 'l', đ: 'd', ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ð: 'd', þ: 'th', ħ: 'h', ŀ: 'l',
};

const MARKS = /\p{M}/gu;
const APOSTROPHES = /['’`´]/gu;

function text(value) {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected a string, got ${value === null ? 'null' : typeof value}`);
  }
  // NFC turns "I" + U+0307 into "İ" so the rules below see a single letter.
  return value.normalize('NFC');
}

/**
 * Lowercases with Turkish rules: "I" → "ı", "İ" → "i".
 * Unlike `"İ".toLowerCase()`, it never leaves a stray combining dot behind.
 */
export function toLowerCase(value) {
  return text(value).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/** Uppercases with Turkish rules: "i" → "İ", "ı" → "I". */
export function toUpperCase(value) {
  return text(value).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** Uppercases the first letter and lowercases the rest: "istanbul" → "İstanbul". */
export function capitalize(value) {
  const [first = '', ...rest] = text(value);
  return toUpperCase(first) + toLowerCase(rest.join(''));
}

/**
 * Capitalizes every word. Words are split on whitespace and hyphens only, so
 * suffixes after an apostrophe stay lowercase: "istanbul'da" → "İstanbul'da".
 */
export function titleCase(value) {
  return text(value)
    .split(/([\s-]+)/u)
    .map((part) => (/^[\s-]+$/u.test(part) ? part : capitalize(part)))
    .join('');
}

/** True when the two strings are equal ignoring case under Turkish rules. */
export function equalsIgnoreCase(a, b) {
  return toLowerCase(a) === toLowerCase(b);
}

/**
 * Reduces text to lowercase ASCII-ish letters for search and comparison:
 * "Işık Ağacı" → "isik agaci". Also handles letters such as ł, ø, ß.
 */
export function fold(value) {
  return [...toLowerCase(value).normalize('NFD').replace(MARKS, '')]
    .map((char) => NO_DECOMPOSITION[char] ?? char)
    .join('');
}

/** Case- and accent-insensitive "contains": includes("Iğdır Ovası", "igdir") → true. */
export function includes(haystack, needle) {
  return fold(haystack).includes(fold(needle));
}

/**
 * Makes a URL slug without dropping or splitting on letters like "ı":
 * "Işık Sokağı'nda 3 ev" → "isik-sokaginda-3-ev".
 */
export function slugify(value, options = {}) {
  const separator = options.separator ?? '-';
  const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return fold(text(value).replace(APOSTROPHES, ''))
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^(?:${escaped})+|(?:${escaped})+$`, 'g'), '');
}

// Sort key for one character: [group, primary, secondary, tertiary].
// Groups follow CLDR root order: whitespace, punctuation, digits, letters, everything else.
function charKey(char) {
  const lower = toLowerCase(char);
  const tertiary = lower === char ? 0 : 1; // lowercase first, as in ICU
  if (WEIGHT.has(lower)) return [3, WEIGHT.get(lower), 0, tertiary];

  const base = lower.normalize('NFD').replace(MARKS, '');
  if (base.length === 1 && WEIGHT.has(base)) return [3, WEIGHT.get(base), 1, tertiary];

  const code = char.codePointAt(0);
  if (/\s/u.test(char)) return [0, code, 0, 0];
  if (/\p{N}/u.test(char)) return [2, Number.isNaN(Number(char)) ? code : Number(char), 0, 0];
  if (/[\p{P}\p{S}]/u.test(char)) return [1, code, 0, 0];
  return [4, code, 0, tertiary];
}

function compareLevel(keysA, keysB, level) {
  const length = Math.min(keysA.length, keysB.length);
  for (let i = 0; i < length; i += 1) {
    if (level === 1 && keysA[i][0] !== keysB[i][0]) return keysA[i][0] < keysB[i][0] ? -1 : 1;
    if (keysA[i][level] !== keysB[i][level]) return keysA[i][level] < keysB[i][level] ? -1 : 1;
  }
  return level === 1 && keysA.length !== keysB.length ? (keysA.length < keysB.length ? -1 : 1) : 0;
}

/**
 * Compares two strings in Turkish dictionary order (ç after c, ı before i, ş after s…).
 * Case and accents only break ties. Use it with Array.prototype.sort.
 */
export function compare(a, b) {
  const keysA = [...text(a)].map(charKey);
  const keysB = [...text(b)].map(charKey);
  for (const level of [1, 2, 3]) {
    const result = compareLevel(keysA, keysB, level);
    if (result !== 0) return result;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Returns a sorted copy in Turkish dictionary order. Pass `key` to sort objects:
 * sort(users, (user) => user.name).
 */
export function sort(items, key) {
  const pick = key ?? ((item) => item);
  return [...items].sort((x, y) => compare(pick(x), pick(y)));
}
