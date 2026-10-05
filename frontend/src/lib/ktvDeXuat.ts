import { LOAI_DOI_TRU_LABELS } from "./constants";

// 05/10/2026: "De xuat cua KTV chi la de xuat, con thao tac Admin bao hanh moi tinh la chot => nen co
// the se hien canh bao viec thao tac nay se lam thay doi de xuat goc cua KTV, ban co chac chan khong?"
// Gom cac diem Admin dang chot KHAC de xuat goc cua KTV (loai doi tru, linh kien) roi hoi xac nhan 1
// lan truoc khi gui. Don khach le (khong co KTV) khong co de xuat -> bo qua.

interface UnitLike {
  id: string;
  phieu_gui_id?: string | null;
  ma_lk?: string | null;
  loai_doi_tru_de_xuat?: string | null;
}

/**
 * @param loaiDoiTru loai doi tru Admin chot; null = "theo de xuat cua KTV" (khong doi gi).
 * @param maLkThucTe linh kien Admin chot (chi form don le); undefined = khong xet.
 * @param lkName ham hien "Ten (ma)" cho thong bao.
 */
export function ktvChangeLines(units: UnitLike[], loaiDoiTru: string | null, maLkThucTe?: string, lkName?: (ma: string) => string): string[] {
  const lines: string[] = [];
  const ktvUnits = units.filter((u) => !!u.phieu_gui_id);
  if (loaiDoiTru) {
    const lech = ktvUnits.filter((u) => u.loai_doi_tru_de_xuat && u.loai_doi_tru_de_xuat !== loaiDoiTru);
    if (lech.length > 0) {
      const tu = [...new Set(lech.map((u) => LOAI_DOI_TRU_LABELS[u.loai_doi_tru_de_xuat!] || u.loai_doi_tru_de_xuat))].join(" / ");
      const pre = units.length > 1 ? `${lech.length}/${units.length} đơn: ` : "";
      lines.push(`${pre}Loại đối trừ KTV đề xuất "${tu}" → Admin chốt "${LOAI_DOI_TRU_LABELS[loaiDoiTru] || loaiDoiTru}"`);
    }
  }
  if (maLkThucTe !== undefined && ktvUnits.length === 1) {
    const goc = ktvUnits[0].ma_lk || "";
    if (maLkThucTe && goc && maLkThucTe !== goc) {
      const n = lkName || ((m: string) => m);
      lines.push(`Linh kiện KTV khai "${n(goc)}" → Admin chốt "${n(maLkThucTe)}"`);
    }
  }
  return lines;
}

/** Tra ve true neu khong lech gi, hoac Admin bam OK o hop thoai xac nhan. */
export function confirmKtvChange(lines: string[]): boolean {
  if (lines.length === 0) return true;
  return window.confirm(`Thao tác này sẽ làm thay đổi đề xuất gốc của KTV:\n\n• ${lines.join("\n• ")}\n\nBạn có chắc chắn không?`);
}
