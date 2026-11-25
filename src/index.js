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

// ---------------------------------------------------------------------------
// Case suffixes after an apostrophe: "İstanbul'da", "Kars'ta", "2026'da", "ABD'ye".

const BACK_VOWELS = 'aıou';
const VOWELS = 'aıoueiöü';
const VOICELESS = 'çfhkpsşt';
const CIRCUMFLEX = { â: 'a', î: 'i', û: 'u' };

// How each letter is read on its own, for abbreviations such as "ABD" or "TBMM".
const LETTER_NAMES = {
  a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'ge', h: 'he',
  ı: 'ı', i: 'i', j: 'je', k: 'ke', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe',
  q: 'kü', r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've', w: 've', x: 'iks',
  y: 'ye', z: 'ze',
};

const UNITS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const GROUPS = ['', 'bin', 'milyon', 'milyar', 'trilyon', 'katrilyon', 'kentilyon'];

// Two consonants a Turkish word may end in: Kars, Türk, kalp, üst.
const FINAL_PAIR_FIRST = 'lrnsş';

// Suffix shapes. A = a/e, I = ı/i/u/ü, D = d/t, and the buffer letter used after a vowel.
const SUFFIXES = {
  locative: { shape: 'DA' },
  ablative: { shape: 'DAn' },
  dative: { shape: 'A', buffer: 'y' },
  accusative: { shape: 'I', buffer: 'y' },
  genitive: { shape: 'In', buffer: 'n' },
  instrumental: { shape: 'lA', buffer: 'y' },
  plural: { shape: 'lAr' },
};
const ALIASES = {
  de: 'locative', da: 'locative', te: 'locative', ta: 'locative',
  den: 'ablative', dan: 'ablative', ten: 'ablative', tan: 'ablative',
  e: 'dative', a: 'dative', ye: 'dative', ya: 'dative',
  i: 'accusative', ı: 'accusative', u: 'accusative', ü: 'accusative',
  in: 'genitive', ın: 'genitive', un: 'genitive', ün: 'genitive', nin: 'genitive', nın: 'genitive',
  le: 'instrumental', la: 'instrumental', yle: 'instrumental', yla: 'instrumental', ile: 'instrumental',
  ler: 'plural', lar: 'plural',
};

// The last word you would say when reading an integer aloud: 2026 → "altı", 1000 → "bin".
function lastSpokenWordOfInteger(digits) {
  const reversed = [...digits].reverse().map(Number);
  if (reversed[0]) return UNITS[reversed[0]];
  if (reversed[1]) return TENS[reversed[1]];
  if (reversed[2]) return 'yüz';
  for (let group = 1; group * 3 < reversed.length; group += 1) {
    if (reversed.slice(group * 3, group * 3 + 3).some(Boolean)) {
      return GROUPS[Math.min(group, GROUPS.length - 1)];
    }
  }
  return UNITS[0];
}

// "1.000" and "1,000" are thousands; "3,5" and "2.75" are decimals, read as "üç virgül beş".
function lastSpokenWordOfNumber(number) {
  const parts = number.split(/[.,]/);
  if (parts.length > 1) {
    const tail = parts[parts.length - 1];
    const thousands = parts.slice(1).every((part) => part.length === 3);
    if (!thousands) return lastSpokenWordOfInteger(tail);
  }
  return lastSpokenWordOfInteger(parts.join(''));
}

function readAsLetters(word) {
  const letters = [...word].filter((char) => /\p{L}/u.test(char));
  if (letters.length < 2 || !letters.some((char) => VOWELS.includes(char))) return true;
  const isVowel = (char) => VOWELS.includes(char);
  if (!isVowel(letters[0]) && !isVowel(letters[1])) return true; // TBMM, CHP
  const [beforeLast, last] = letters.slice(-2);
  if (!isVowel(beforeLast) && !isVowel(last) && !FINAL_PAIR_FIRST.includes(beforeLast)) return true; // ABD
  for (let i = 0; i + 2 < letters.length; i += 1) {
    if (!letters.slice(i, i + 3).some(isVowel)) return true;
  }
  return false;
}

// Reduces the end of a word to the sounds that decide the suffix.
function spokenEnding(word) {
  const number = word.match(/\d+(?:[.,]\d+)*$/u);
  if (number) return lastSpokenWordOfNumber(number[0]);

  const letters = word.match(/[\p{L}\p{M}]+$/u);
  if (!letters) throw new RangeError(`Cannot add a suffix to "${word}": it does not end in a letter or digit`);
  const written = letters[0].normalize('NFC');
  // Keep Turkish letters, reduce others (é, ä, â…) to their base letter.
  const lower = [...toLowerCase(written)]
    .map((char) => (LETTER_NAMES[char] ? char : CIRCUMFLEX[char] ?? fold(char)))
    .join('');
  const allCaps = written === toUpperCase(written) && written !== lower;
  if ((allCaps && readAsLetters(lower)) || ![...lower].some((char) => VOWELS.includes(char))) {
    return [...lower].map((char) => LETTER_NAMES[char] ?? char).join('');
  }
  return lower;
}

function build(shape, buffer, ending) {
  const vowels = [...ending].filter((char) => VOWELS.includes(char));
  const lastVowel = vowels[vowels.length - 1] ?? 'e';
  const back = BACK_VOWELS.includes(lastVowel);
  const rounded = 'ouöü'.includes(lastVowel);
  const lastSound = ending[ending.length - 1];
  const endsInVowel = VOWELS.includes(lastSound);

  let out = endsInVowel && buffer ? buffer : '';
  for (const part of shape) {
    if (part === 'A') out += back ? 'a' : 'e';
    else if (part === 'I') out += back ? (rounded ? 'u' : 'ı') : (rounded ? 'ü' : 'i');
    else if (part === 'D') out += VOICELESS.includes(lastSound) ? 't' : 'd';
    else out += part;
  }
  return out;
}

/**
 * Adds a case suffix after an apostrophe, choosing the form by Turkish vowel harmony and
 * consonant rules: suffix("Kars", "locative") → "Kars'ta", suffix("2026", "de") → "2026'da",
 * suffix("ABD", "e") → "ABD'ye". Numbers and abbreviations are read the way they are spoken.
 * Pass `say` when a name is not pronounced as written: suffix("Michael", "e", { say: "maykıl" }).
 */
export function suffix(word, kind, options = {}) {
  const value = text(word).trim();
  const name = SUFFIXES[kind] ? kind : ALIASES[toLowerCase(text(kind))];
  if (!name) {
    throw new RangeError(`Unknown suffix "${kind}". Use one of: ${Object.keys(SUFFIXES).join(', ')}`);
  }
  const ending = spokenEnding(options.say === undefined ? value : text(options.say).trim());
  const { shape, buffer } = SUFFIXES[name];
  return `${value}'${build(shape, buffer, ending)}`;
}
