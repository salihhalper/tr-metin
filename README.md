# tr-metin

**Turkish text that just works:** lowercase, uppercase, sorting, slugs, search and case suffixes
(`İstanbul'da`, `Kars'ta`, `2026'da`, `ABD'ye`) for the letters `ı İ ç ğ ö ş ü`. Zero dependencies, about 4 KB gzipped, and the results are the same on every runtime because nothing relies on `Intl`, ICU data or the default locale.

[Türkçe açıklama aşağıda ↓](#türkçe)

## Why

JavaScript's built-ins get Turkish wrong in ways that are easy to miss:

| You write | Built-in result | `tr-metin` |
|---|---|---|
| `"İstanbul".toLowerCase()` | `"i̇stanbul"` (9 characters, a stray dot) | `toLowerCase("İstanbul")` → `"istanbul"` |
| `"istanbul".toUpperCase()` | `"ISTANBUL"` (dotless capital) | `toUpperCase("istanbul")` → `"İSTANBUL"` |
| `["çay", "cam", "zebra"].sort()` | `cam, zebra, çay` | `sort(...)` → `cam, çay, zebra` |
| A typical slug library on `"Işık"` | `"is-k"` (the `ı` is dropped and the word splits) | `slugify("Işık")` → `"isik"` |
| Searching `"igdir"` in `"Iğdır"` | not found | `includes("Iğdır", "igdir")` → `true` |
| `` `${city}'da` `` with `city = "Kars"` | `"Kars'da"` (should be `'ta`) | `suffix(city, 'de')` → `"Kars'ta"` |

`toLocaleLowerCase("tr")` and `Intl.Collator("tr")` fix some of this, but only where the runtime ships full ICU data. Node builds with small ICU, some React Native setups and older browsers silently fall back to English rules. `tr-metin` gives the same answer everywhere.

### Case suffixes

Turkish writes a suffix after an apostrophe on names, numbers and abbreviations, and the suffix changes with
the word: `İstanbul'da`, `Kars'ta`, `İzmir'de`, `Ankara'ya`, `Ayşe'ye`, `2026'da`, `ABD'ye`. A template like
`` `${city}'da` `` is wrong for many inputs, so apps fall back to awkward text such as "Şehir: Kars".
`suffix` picks the right form:

- vowel harmony (`'da` / `'de`, `'ı` / `'i` / `'u` / `'ü`),
- `d` → `t` after `ç f h k p s ş t` (`Kars'ta`, `Ahmet'ten`),
- the buffer letter after a vowel (`Ankara'ya`, `Ankara'nın`, `Ayşe'yle`),
- numbers as they are read aloud (`2026` → "…altı" → `'da`, `1000` → "bin" → `'de`, `3,5` → "…beş" → `'e`),
- abbreviations letter by letter when they cannot be read as a word (`ABD'ye`, `TBMM'nin`, `CHP'ye`) and as a word when they can (`NATO'ya`, `TÜBİTAK'a`, `YÖK'e`).

## Install

```sh
npm install tr-metin
```

## Use

```js
import {
  toLowerCase, toUpperCase, capitalize, titleCase, equalsIgnoreCase,
  compare, sort, slugify, fold, includes, suffix,
} from 'tr-metin';

toLowerCase('IŞIK');                 // 'ışık'
toUpperCase('çiğköfte');             // 'ÇİĞKÖFTE'
capitalize('istanbul');              // 'İstanbul'
titleCase("ağrı dağı'nın eteği");    // "Ağrı Dağı'nın Eteği"  (suffix after ' stays lowercase)
equalsIgnoreCase('IRMAK', 'ırmak');  // true

sort(['şeker', 'su', 'ılık', 'iğne']);          // ['ılık', 'iğne', 'su', 'şeker']
users.sort((a, b) => compare(a.name, b.name));  // or: sort(users, (u) => u.name)

slugify("Işık Sokağı'nda 3 ev");     // 'isik-sokaginda-3-ev'
slugify('Şişli Belediyesi', { separator: '_' }); // 'sisli_belediyesi'

fold('Işık Ağacı');                  // 'isik agaci'
includes('Iğdır Ovası', 'IGDIR');    // true

suffix('Kars', 'de');                // "Kars'ta"
suffix('Ankara', 'e');               // "Ankara'ya"
suffix('İzmir', 'den');              // "İzmir'den"
suffix('2026', 'de');                // "2026'da"
suffix('ABD', 'e');                  // "ABD'ye"
suffix('Ayşe', 'genitive');          // "Ayşe'nin"
suffix('Michael', 'e', { say: 'maykıl' }); // "Michael'a"
```

## API

| Function | What it does |
|---|---|
| `toLowerCase(text)` | Turkish lowercase: `I → ı`, `İ → i`. |
| `toUpperCase(text)` | Turkish uppercase: `i → İ`, `ı → I`. |
| `capitalize(text)` | First letter up, the rest down. |
| `titleCase(text)` | Capitalizes each word. Splits on spaces and hyphens, not apostrophes. |
| `equalsIgnoreCase(a, b)` | Case-insensitive equality with Turkish rules. |
| `compare(a, b)` | Turkish dictionary order for `Array.prototype.sort`. Case and accents (`â`, `î`, `û`) only break ties. |
| `sort(items, key?)` | Sorted copy. Pass `key` to sort objects. |
| `slugify(text, { separator })` | URL slug. Apostrophes are removed, not turned into separators. |
| `fold(text)` | Lowercase, no accents, ASCII letters. For search indexes and keys. |
| `includes(haystack, needle)` | `fold(haystack).includes(fold(needle))`. |
| `suffix(word, kind, { say })` | Adds a case suffix after an apostrophe. `kind` is `locative`, `ablative`, `dative`, `accusative`, `genitive`, `instrumental` or `plural`, or the Turkish form: `de`, `den`, `e`, `i`, `in`, `le` (or `ile`), `ler`. `say` gives the pronunciation when it differs from the spelling. |
| `ALPHABET` | `'abcçdefgğhıijklmnoöpqrsştuüvwxyz'` |

`suffix` follows the spelling, so names that are not pronounced as written need `say`: foreign names
(`Michael`, `iPhone`) and the few Turkish names whose last syllable takes front suffixes, such as `Kemal'e`
(`{ say: 'kemel' }`). Common nouns that change before a suffix (`kitap` → `kitabı`) are not handled; Turkish uses
the apostrophe only for names, numbers and abbreviations, which keep their spelling.

`fold`, `slugify` and `includes` also handle other letters that have no Unicode decomposition: `ł đ ø æ œ ß ð þ`.

## How it is tested

Besides hand-written cases, the test suite checks the suffix for every number from 0 to 2,099 against the number spelled out in words, and sorts thousands of random Turkish strings to check that `compare` agrees with ICU's Turkish collation (`Intl.Collator('tr')`) on every pair. Run it with `npm test`. Node 18 or newer, no install step.

## Contributing

Bug reports with a short example are very welcome. Please open an issue first for new functions so we can agree on the shape. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Türkçe

**Türkçe metin için doğru çalışan küçük araçlar:** büyük-küçük harf, alfabetik sıralama, adres (slug), arama ve kesme işaretinden sonra gelen ekler. Bağımlılığı yok. Çalıştığı ortamın dil ayarına bakmaz, her yerde aynı sonucu verir.

Neyi düzeltir?
- `"İstanbul".toLowerCase()` sonunda görünmez bir nokta bırakır; `toLowerCase` bırakmaz.
- `"istanbul".toUpperCase()` "ISTANBUL" verir; `toUpperCase` "İSTANBUL" verir.
- Normal sıralama `ç`, `ş`, `ı` gibi harfleri listenin sonuna atar; `sort` sözlük sırasına koyar.
- Birçok slug kütüphanesi "Işık"ı "is-k" yapar; `slugify` "isik" yapar.
- "igdir" araması "Iğdır"ı bulmaz; `includes` bulur.
- `` `${sehir}'da` `` yazınca "Kars'da" çıkar; `suffix(sehir, 'de')` doğru eki seçer: "Kars'ta", "İzmir'de", "2026'da", "ABD'ye".

Hata bulursanız kısa bir örnekle [issue açın](https://github.com/salihhalper/tr-metin/issues). Türkçe yazabilirsiniz.

## License

MIT
