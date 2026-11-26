/**
 * Utility to convert any Thai numerals (๐-๙) to Arabic numerals (0-9).
 * Ensures all certificate numbers ("เลขที่") display uniformly in Arabic numerals.
 */
export function toArabicNumerals(str: string | undefined | null): string {
  if (!str) return '';
  const thaiToEng: Record<string, string> = {
    '๐': '0',
    '๑': '1',
    '๒': '2',
    '๓': '3',
    '๔': '4',
    '๕': '5',
    '๖': '6',
    '๗': '7',
    '๘': '8',
    '๙': '9',
  };
  return str.replace(/[๐-๙]/g, (ch) => thaiToEng[ch] || ch);
}
