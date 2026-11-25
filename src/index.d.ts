/** The Turkish alphabet in dictionary order, with q, w and x in their Latin places. */
export declare const ALPHABET: string;
/** Lowercases with Turkish rules: "I" → "ı", "İ" → "i". */
export declare function toLowerCase(value: string): string;
/** Uppercases with Turkish rules: "i" → "İ", "ı" → "I". */
export declare function toUpperCase(value: string): string;
/** "istanbul" → "İstanbul" */
export declare function capitalize(value: string): string;
/** "ağrı dağı'nın eteği" → "Ağrı Dağı'nın Eteği" */
export declare function titleCase(value: string): string;
/** Equality ignoring case under Turkish rules. */
export declare function equalsIgnoreCase(a: string, b: string): boolean;
/** "Işık Ağacı" → "isik agaci" */
export declare function fold(value: string): string;
/** Case- and accent-insensitive contains. */
export declare function includes(haystack: string, needle: string): boolean;
export interface SlugifyOptions {
  /** Defaults to "-". */
  separator?: string;
}
/** "Işık Sokağı'nda 3 ev" → "isik-sokaginda-3-ev" */
export declare function slugify(value: string, options?: SlugifyOptions): string;
/** Turkish dictionary order. Returns a negative number, zero or a positive number. */
export declare function compare(a: string, b: string): number;
/** Sorted copy in Turkish dictionary order. */
export declare function sort(items: readonly string[]): string[];
export declare function sort<T>(items: readonly T[], key: (item: T) => string): T[];
export type SuffixKind =
  | 'locative' | 'ablative' | 'dative' | 'accusative' | 'genitive' | 'instrumental' | 'plural'
  | 'de' | 'da' | 'den' | 'dan' | 'e' | 'a' | 'i' | 'ı' | 'u' | 'ü' | 'in' | 'ın' | 'un' | 'ün'
  | 'le' | 'la' | 'ile' | 'ler' | 'lar'
  | (string & {});
export interface SuffixOptions {
  /** How the word is pronounced, when it differs from the spelling: { say: 'maykıl' } for "Michael". */
  say?: string;
}
/** "Kars" + locative → "Kars'ta", "2026" + "de" → "2026'da", "ABD" + "e" → "ABD'ye". */
export declare function suffix(word: string, kind: SuffixKind, options?: SuffixOptions): string;
