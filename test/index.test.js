import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHABET, capitalize, compare, equalsIgnoreCase, fold, includes, slugify, sort, suffix, titleCase,
  toLowerCase, toUpperCase,
} from '../src/index.js';

test('toLowerCase follows Turkish rules and leaves no combining dot', () => {
  assert.equal(toLowerCase('İSTANBUL'), 'istanbul');
  assert.equal(toLowerCase('İstanbul').length, 8);
  assert.equal(toLowerCase('IŞIK'), 'ışık');
  assert.equal(toLowerCase('İzmir'), 'izmir'); // decomposed İ
  assert.equal(toLowerCase('ÇĞÖŞÜ'), 'çğöşü');
});

test('toUpperCase follows Turkish rules', () => {
  assert.equal(toUpperCase('istanbul'), 'İSTANBUL');
  assert.equal(toUpperCase('ılık'), 'ILIK');
  assert.equal(toUpperCase('çiğköfte'), 'ÇİĞKÖFTE');
});

test('capitalize and titleCase', () => {
  assert.equal(capitalize('istanbul'), 'İstanbul');
  assert.equal(capitalize('IĞDIR'), 'Iğdır');
  assert.equal(capitalize(''), '');
  assert.equal(titleCase("ağrı dağı'nın eteği"), "Ağrı Dağı'nın Eteği");
  assert.equal(titleCase('İSTANBUL-izmir  hattı'), 'İstanbul-İzmir  Hattı');
});

test('equalsIgnoreCase', () => {
  assert.ok(equalsIgnoreCase('IRMAK', 'ırmak'));
  assert.ok(equalsIgnoreCase('İzmir', 'izmir'));
  assert.ok(!equalsIgnoreCase('IRMAK', 'irmak'));
});

test('fold reduces text for search', () => {
  assert.equal(fold('Işık Ağacı'), 'isik agaci');
  assert.equal(fold('İĞNE ÇÖŞÜ'), 'igne cosu');
  assert.equal(fold('Kâğıt'), 'kagit');
  assert.equal(fold('Łódź Straße Ærø'), 'lodz strasse aero');
});

test('includes ignores case and Turkish letters', () => {
  assert.ok(includes('Iğdır Ovası', 'igdir'));
  assert.ok(includes('istanbul', 'İSTANBUL'));
  assert.ok(includes('ŞİŞLİ', 'sisli'));
  assert.ok(!includes('Ankara', 'izmir'));
});

test('slugify keeps dotless ı and does not split words', () => {
  assert.equal(slugify('Işık'), 'isik');
  assert.equal(slugify('Iğdır'), 'igdir');
  assert.equal(slugify('Ağrı Dağı'), 'agri-dagi');
  assert.equal(slugify("Işık Sokağı'nda 3 ev"), 'isik-sokaginda-3-ev');
  assert.equal(slugify('  --Çok   güzel!!  '), 'cok-guzel');
  assert.equal(slugify('Şişli Belediyesi', { separator: '_' }), 'sisli_belediyesi');
  assert.equal(slugify('a.b', { separator: '.' }), 'a.b');
});

test('compare orders Turkish letters correctly', () => {
  assert.deepEqual(
    sort(['zebra', 'şeker', 'çay', 'cam', 'ılık', 'iğne', 'su', 'öykü', 'ozan', 'ğ', 'gül', 'üzüm', 'uçak']),
    ['cam', 'çay', 'gül', 'ğ', 'ılık', 'iğne', 'ozan', 'öykü', 'su', 'şeker', 'uçak', 'üzüm', 'zebra'],
  );
  assert.ok(compare('Irmak', 'ilik') < 0); // I is ı, which comes before i
  assert.ok(compare('İlik', 'Irmak') > 0);
  assert.equal(compare('kar', 'kar'), 0);
  assert.ok(compare('kar', 'Kar') < 0); // lowercase first on a tie
  assert.ok(compare('kar', 'kâr') < 0); // accent breaks the tie
  assert.ok(compare('kâr', 'kara') < 0); // but the accent alone does not move the word
});

test('sort with a key and without mutating input', () => {
  const people = [{ name: 'Şule' }, { name: 'Ceren' }, { name: 'Çağla' }];
  const sorted = sort(people, (p) => p.name);
  assert.deepEqual(sorted.map((p) => p.name), ['Ceren', 'Çağla', 'Şule']);
  assert.equal(people[0].name, 'Şule');
});

test('compare agrees with ICU Turkish collation on a word list', () => {
  const collator = new Intl.Collator('tr');
  const words = [];
  const letters = [...ALPHABET, ...'ÇĞIİÖŞÜâîû'];
  let seed = 7;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  for (let i = 0; i < 3000; i += 1) {
    const length = 1 + Math.floor(random() * 6);
    let word = '';
    for (let j = 0; j < length; j += 1) word += letters[Math.floor(random() * letters.length)];
    if (random() < 0.15) word += ' ' + letters[Math.floor(random() * letters.length)];
    words.push(word);
  }
  for (let i = 0; i + 1 < words.length; i += 1) {
    const a = words[i];
    const b = words[i + 1];
    assert.equal(Math.sign(compare(a, b)), Math.sign(collator.compare(a, b)), `${a} vs ${b}`);
  }
});

test('rejects non-strings clearly', () => {
  assert.throws(() => slugify(null), /Expected a string, got null/);
  assert.throws(() => toLowerCase(5), /Expected a string, got number/);
});

test('suffix follows vowel harmony and consonant rules', () => {
  assert.equal(suffix('İstanbul', 'locative'), "İstanbul'da");
  assert.equal(suffix('Kars', 'locative'), "Kars'ta");
  assert.equal(suffix('Kars', 'ablative'), "Kars'tan");
  assert.equal(suffix('İzmir', 'ablative'), "İzmir'den");
  assert.equal(suffix('Ankara', 'dative'), "Ankara'ya");
  assert.equal(suffix('Ankara', 'accusative'), "Ankara'yı");
  assert.equal(suffix('Ankara', 'genitive'), "Ankara'nın");
  assert.equal(suffix('Ankara', 'instrumental'), "Ankara'yla");
  assert.equal(suffix('Ahmet', 'instrumental'), "Ahmet'le");
  assert.equal(suffix('Ayşe', 'genitive'), "Ayşe'nin");
  assert.equal(suffix('Bolu', 'accusative'), "Bolu'yu");
  assert.equal(suffix('Ordu', 'genitive'), "Ordu'nun");
  assert.equal(suffix('Ürgüp', 'accusative'), "Ürgüp'ü");
  assert.equal(suffix('Türk', 'dative'), "Türk'e");
  assert.equal(suffix('Kâzım', 'dative'), "Kâzım'a");
  assert.equal(suffix('Ahmet', 'plural'), "Ahmet'ler");
});

test('suffix accepts Turkish names for the suffix', () => {
  assert.equal(suffix('Kars', 'de'), "Kars'ta");
  assert.equal(suffix('Kars', 'DA'), "Kars'ta");
  assert.equal(suffix('Ankara', 'e'), "Ankara'ya");
  assert.equal(suffix('Ankara', 'ile'), "Ankara'yla");
  assert.throws(() => suffix('Ankara', 'ki'), /Unknown suffix "ki"/);
});

test('suffix reads numbers aloud', () => {
  assert.equal(suffix('2026', 'de'), "2026'da");
  assert.equal(suffix('1990', 'ler'), "1990'lar");
  assert.equal(suffix('2000', 'ler'), "2000'ler");
  assert.equal(suffix('3', 'de'), "3'te");
  assert.equal(suffix('5', 'e'), "5'e");
  assert.equal(suffix('6', 'e'), "6'ya");
  assert.equal(suffix('10', 'i'), "10'u");
  assert.equal(suffix('40', 'de'), "40'ta");
  assert.equal(suffix('100', 'e'), "100'e");
  assert.equal(suffix('1.000.000', 'e'), "1.000.000'a");
  assert.equal(suffix('3,5', 'e'), "3,5'e");
  assert.equal(suffix('0,06', 'e'), "0,06'ya");
  assert.equal(suffix('%50', 'e'), "%50'ye");
  assert.equal(suffix('Windows 11', 'e'), "Windows 11'e");
  assert.equal(suffix('COVID-19', 'e'), "COVID-19'a");
});

test('suffix reads the last spoken word of every number correctly', () => {
  const units = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const tens = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  const below1000 = (n) => [n >= 100 ? `${n >= 200 ? units[Math.floor(n / 100)] : ''}yüz` : '', tens[Math.floor(n / 10) % 10], units[n % 10]].join('');
  const spell = (n) => {
    if (n === 0) return 'sıfır';
    const parts = [];
    for (const [size, name] of [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']]) {
      const count = Math.floor(n / size) % 1000;
      if (count) parts.push(count === 1 && name === 'bin' ? 'bin' : below1000(count) + name);
    }
    parts.push(below1000(n % 1000));
    return parts.join('');
  };
  const vowelSuffix = (word) => {
    const last = [...word].filter((c) => 'aıoueiöü'.includes(c)).pop();
    return ('aıou'.includes(last) ? 'a' : 'e');
  };
  for (const n of [...Array(2100).keys(), 10000, 20000, 100000, 1000000, 3000000, 1000000000, 2147483647]) {
    const word = spell(n);
    const ending = 'aıoueiöü'.includes(word.at(-1)) ? 'y' : '';
    assert.equal(suffix(String(n), 'e'), `${n}'${ending}${vowelSuffix(word)}`, `${n} (${word})`);
  }
});

test('suffix reads abbreviations letter by letter unless they read as a word', () => {
  assert.equal(suffix('ABD', 'e'), "ABD'ye");
  assert.equal(suffix('ABD', 'de'), "ABD'de");
  assert.equal(suffix('TBMM', 'in'), "TBMM'nin");
  assert.equal(suffix('CHP', 'e'), "CHP'ye");
  assert.equal(suffix('THY', 'de'), "THY'de");
  assert.equal(suffix('ÖSYM', 'e'), "ÖSYM'ye");
  assert.equal(suffix('İETT', 'e'), "İETT'ye");
  assert.equal(suffix('NATO', 'e'), "NATO'ya");
  assert.equal(suffix('TÜBİTAK', 'e'), "TÜBİTAK'a");
  assert.equal(suffix('YÖK', 'e'), "YÖK'e");
  assert.equal(suffix('MEB', 'e'), "MEB'e");
  assert.equal(suffix('KARS', 'de'), "KARS'ta");
});

test('suffix uses `say` for names not pronounced as written', () => {
  assert.equal(suffix('Michael', 'e', { say: 'maykıl' }), "Michael'a");
  assert.equal(suffix('iPhone', 'de', { say: 'ayfon' }), "iPhone'da");
  assert.equal(suffix('Kemal', 'e', { say: 'kemel' }), "Kemal'e");
  assert.throws(() => suffix('', 'e'), /does not end in a letter or digit/);
});
