import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHABET, capitalize, compare, equalsIgnoreCase, fold, includes, slugify, sort, titleCase,
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
