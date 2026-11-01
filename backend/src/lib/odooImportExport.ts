// Xuat file ket qua gui sua -> import NGUOC lai Odoo (yeu cau 09/10/2026, xem CLAUDE.md muc "Xuat file
// import Odoo"). File gom 4 cot dung ten truong Odoo: ID (External ID), Trang thai, Ngay hoan thanh, Ghi chu.
// CHOT voi nguoi dung 09/10/2026:
//  - Quy doi trang thai gui sua -> Odoo: cho_gui/dang_gui -> Chua tiep nhan; kho_da_nhan/dang_xu_ly -> Dang
//    sua chua; cho_tra/dang_tra -> Da sua xong; hoan_tat -> Hoan thanh; tu_choi -> Tu choi bao hanh;
//    khong_gui ("Huy don loi") -> Huy don bao hanh.
//  - Ghi chu = ghi chu dang co tren Odoo + " | [Sửa chữa 3T] ..." (khong lam mat ghi chu KTV). Phan
//    "[Sửa chữa 3T]" cua lan import truoc (da ve lai qua dvbh) duoc thay, khong noi chong.
//  - Ngay hoan thanh: Odoo de CHI DOC - van ghi cot (thoi diem ket thuc ben suachua), Odoo khong nhan thi
//    bo cot do luc import.

export const ODOO_STATE_FROM_SC: Record<string, string> = {
  cho_gui: "new",
  dang_gui: "new",
  kho_da_nhan: "repairing",
  dang_xu_ly: "repairing",
  cho_tra: "repaired",
  dang_tra: "repaired",
  hoan_tat: "done",
  tu_choi: "rejected",
  khong_gui: "cancelled",
};
export const ODOO_STATE_LABELS: Record<string, string> = {
  new: "Chưa tiếp nhận",
  repairing: "Đang sửa chữa",
  repaired: "Đã sửa xong",
  done: "Hoàn thành",
  cancelled: "Hủy đơn bảo hành",
  rejected: "Từ chối bảo hành",
};
const SC_LABELS: Record<string, string> = {
  cho_gui: "Chờ gửi",
  dang_gui: "Đang gửi",
  kho_da_nhan: "Kho đã nhận",
  dang_xu_ly: "Đang xử lý",
  cho_tra: "Chờ trả",
  dang_tra: "Đang trả",
  hoan_tat: "Hoàn tất",
  tu_choi: "Từ chối",
  khong_gui: "Hủy đơn lỗi",
};
const HUONG_XU_LY_LABELS: Record<string, string> = {
  sua_chua: "Sửa chữa",
  doi_moi: "Đổi mới",
  tra_lai_ktv: "Trả lại KTV",
  xac_nhan_tru_no: "Xác nhận linh kiện, trừ công nợ",
  dich_vu_tinh_phi: "Dịch vụ tính phí",
  tu_choi: "Huỷ đơn bảo hành",
  chuyen_kho: "Chuyển kho",
};
const TERMINAL_ODOO = new Set(["done", "rejected", "cancelled"]);
const NOTE_TAG = "[Sửa chữa 3T]";

export interface OdooImportRow {
  id: string; // External ID
  trang_thai: string; // nhan Odoo
  ngay_hoan_thanh: string;
  ghi_chu: string;
  // tham khao (sheet 2)
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  linh_kien: string;
  trang_thai_odoo_hien_tai: string;
  trang_thai_sua_chua: string;
  ma_phieu: string | null;
  cap_nhat_luc: string | null;
}

// Bo phan "[Sửa chữa 3T] ..." da import lan truoc khoi ghi chu Odoo.
export function baseOdooNote(note: string | null): string {
  const s = note ?? "";
  const i = s.indexOf(NOTE_TAG);
  return (i >= 0 ? s.slice(0, i) : s).replace(/[\s|]+$/, "").trim();
}

interface SrcRow {
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  ma_linh_kien: string | null;
  ten_linh_kien: string | null;
  odoo_tt: string | null;
  ghi_chu: string | null;
  ma_import_odoo: string | null;
  khong_gui_boi: string | null;
  khong_gui_luc: string | null;
  khong_gui_ly_do: string | null;
  last_status: string | null;
  last_detail: string | null;
  last_ma_phieu: string | null;
  last_sent_at: string | null;
  don_id: string | null;
}

export async function buildOdooImportRows(
  db: D1Database,
  opts: { tu?: string; den?: string; chiCanCapNhat: boolean; chiXong?: boolean },
): Promise<{ rows: OdooImportRow[]; thieu_id: number }> {
  const where: string[] = ["(s.last_status IS NOT NULL OR o.khong_gui_boi IS NOT NULL)"];
  const binds: string[] = [];
  const tg = "COALESCE(s.last_sent_at, o.khong_gui_luc)";
  if (opts.tu) {
    where.push(`${tg} >= ?`);
    binds.push(`${opts.tu} 00:00:00`);
  }
  if (opts.den) {
    where.push(`${tg} <= ?`);
    binds.push(`${opts.den} 23:59:59`);
  }
  const { results } = await db
    .prepare(
      `SELECT o.odoo_id, o.ma_don, o.case_id, o.ma_linh_kien, o.ten_linh_kien, o.trang_thai AS odoo_tt, o.ghi_chu,
              o.ma_import_odoo, o.khong_gui_boi, o.khong_gui_luc, o.khong_gui_ly_do,
              s.last_status, s.last_detail, s.last_ma_phieu, s.last_sent_at, p.id AS don_id
       FROM don_bh_odoo o
       LEFT JOIN odoo_status_sync s ON s.odoo_id = o.odoo_id
       LEFT JOIN phieu_sua_chua_bh p ON p.odoo_id = o.odoo_id
       WHERE ${where.join(" AND ")}
       ORDER BY ${tg} DESC, o.odoo_id DESC`,
    )
    .bind(...binds)
    .all<SrcRow>();

  // Huong xu ly + ly do tu choi cua tung linh kien (don con) - de ghi vao Ghi chu.
  const donIds = [...new Set(results.map((r) => r.don_id).filter((x): x is string => !!x))];
  const units = new Map<string, { huong: string | null; ly_do: string | null }[]>();
  for (let i = 0; i < donIds.length; i += 90) {
    const chunk = donIds.slice(i, i + 90);
    const { results: us } = await db
      .prepare(
        `SELECT parent_id, huong_xu_ly, ly_do_tu_choi FROM phieu_sua_chua_bh_ct WHERE parent_id IN (${chunk.map(() => "?").join(",")}) ORDER BY so_thu_tu`,
      )
      .bind(...chunk)
      .all<{ parent_id: string; huong_xu_ly: string | null; ly_do_tu_choi: string | null }>();
    for (const u of us) {
      const arr = units.get(u.parent_id) ?? [];
      arr.push({ huong: u.huong_xu_ly, ly_do: u.ly_do_tu_choi });
      units.set(u.parent_id, arr);
    }
  }

  let thieuId = 0;
  const rows: OdooImportRow[] = [];
  for (const r of results) {
    const sc = r.khong_gui_boi && !r.don_id ? "khong_gui" : r.last_status;
    if (!sc) continue;
    const state = ODOO_STATE_FROM_SC[sc];
    if (!state) continue;
    // 01/11/2026: chi xuat don da xu ly xong (Da sua xong / Hoan thanh / Tu choi / Huy) - viec import Odoo
    // thuong lam sau khi don da xu ly xong.
    if (opts.chiXong && !["repaired", "done", "rejected", "cancelled"].includes(state)) continue;
    let suffix: string;
    if (sc === "khong_gui") {
      suffix = `${NOTE_TAG} Hủy đơn lỗi${r.khong_gui_ly_do ? `: ${r.khong_gui_ly_do}` : ""}`;
    } else {
      const us = units.get(r.don_id ?? "") ?? [];
      const huong = [...new Set(us.map((u) => (u.huong ? (HUONG_XU_LY_LABELS[u.huong] ?? u.huong) : "")).filter(Boolean))].join(", ");
      const lyDo = [...new Set(us.map((u) => (u.ly_do ?? "").trim()).filter(Boolean))].join("; ");
      suffix =
        `${NOTE_TAG} ${r.last_ma_phieu ?? r.don_id ?? ""}: ${SC_LABELS[sc] ?? sc}` +
        (r.last_detail ? ` (${r.last_detail})` : "") +
        (huong ? `; Hướng xử lý: ${huong}` : "") +
        (lyDo ? `; Lý do: ${lyDo}` : "");
    }
    const base = baseOdooNote(r.ghi_chu);
    const note = base ? `${base} | ${suffix}` : suffix;
    if (opts.chiCanCapNhat && r.odoo_tt === state && (r.ghi_chu ?? "").trim() === note) continue;
    if (!r.ma_import_odoo) {
      thieuId++;
      continue;
    }
    const ketThuc = TERMINAL_ODOO.has(state) ? (sc === "khong_gui" ? r.khong_gui_luc : r.last_sent_at) : null;
    rows.push({
      id: r.ma_import_odoo,
      trang_thai: ODOO_STATE_LABELS[state],
      ngay_hoan_thanh: ketThuc ?? "",
      ghi_chu: note,
      odoo_id: r.odoo_id,
      ma_don: r.ma_don,
      case_id: r.case_id,
      linh_kien: [r.ten_linh_kien, r.ma_linh_kien ? `(${r.ma_linh_kien})` : ""].filter(Boolean).join(" "),
      trang_thai_odoo_hien_tai: ODOO_STATE_LABELS[r.odoo_tt ?? ""] ?? r.odoo_tt ?? "",
      trang_thai_sua_chua: SC_LABELS[sc] ?? sc,
      ma_phieu: r.last_ma_phieu,
      cap_nhat_luc: r.last_sent_at ?? r.khong_gui_luc,
    });
  }
  return { rows, thieu_id: thieuId };
}
