// Chuan hoa chuoi tieng Viet de tim kieu "khong dau / co dau deu ra" (05/10/2026 muc 8): tach dau
// (NFD) roi bo cac dau thanh/dau mu (khoang U+0300-U+036F), doi d/Đ thanh d, chu thuong.
const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

export function normalizeVi(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS, "").replace(/[đĐ]/g, "d").toLowerCase();
}
