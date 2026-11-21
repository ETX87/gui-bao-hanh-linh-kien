import { useState } from "react";
import { Card, Badge, Input } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName, displayName, useUserNames } from "../../hooks/useUserNames";
import { fmtDate } from "../../lib/format";
import { withQuery } from "../../ui/FilterBar";
import { ExcelExportButton, type ExportCol } from "../../ui/ExcelExport";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { CongNoTag, LoaiKhacGoiY, XAC_KQ_TIEU_HAO_NHAN } from "../shared/TruCongNo";
import type { AppUser, DeXuatLk } from "../../lib/types";

// 16/11/2026 - nguyen van: "Toàn luồng quy trình cần minh bạch và dễ quản lý, nv sửa chữa có thể tự quản lý các lk mình đã xử dụng, tình trạng
// đối từ công nợ hiện tại...". Moi lan cap linh kien (don CÔNG NỢ SỬA CHỮA ben app Dat linh kien) co 4 con so Nhận – Dùng – Trả kho – Đã trừ.
// NV: cua chinh minh; Admin BH / Ke toan / qtri: chon NV (chip). Backend GET /api/de-xuat/cua-nv.

type Tong = Record<"dang_cap" | "da_nhan" | "dang_giu" | "da_dung" | "cho_tru" | "da_tru" | "phai_tra" | "da_tra" | "that_lac_giu" | "loi" | "cong_no", number>;

const NHOM = [
  { key: "", label: "Tất cả" },
  { key: "dang_cap", label: "Đang cấp" },
  { key: "dang_giu", label: "Đang giữ (chờ Admin xác nhận)" },
  { key: "cho_tru", label: "Chờ trừ / chờ trả kho" },
  { key: "xong", label: "Đã trừ xong" },
  { key: "that_lac", label: "Xác thất lạc — chưa trừ" },
];

function KpiO({ label, value, tone, hint, onClick, on }: { label: string; value: number; tone: string; hint?: string; onClick?: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`rounded-xl border px-3 py-2 text-left ${on ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)]"} ${value ? "" : "opacity-60"}`}
    >
      <span className="block text-[11px] font-semibold text-[var(--ink-soft)]">{label}</span>
      <span className={`block text-xl font-bold ${tone}`}>{value}</span>
    </button>
  );
}

export function LinhKienCuaToiScreen({ user }: { user: AppUser }) {
  useUserNames();
  const { nameOf } = useLkName();
  const xemTatCa = !!(user.la_admin_bh || user.la_ke_toan || user.la_qtri || user.la_giam_sat || user.la_view);
  const [nv, setNv] = useState<string>(xemTatCa ? "" : user.email);
  const [nhom, setNhom] = useState("");
  const [q, setQ] = useState("");
  const [mo, setMo] = useState<string | null>(null);
  const qs = new URLSearchParams();
  if (xemTatCa && nv) qs.set("nv", nv);
  if (nhom) qs.set("nhom", nhom);
  if (q.trim().length >= 2) qs.set("q", q.trim());
  const path = withQuery("/de-xuat/cua-nv", qs.toString());
  const { items, total, page, pageCount, setPage, raw, reload } = usePagedApi<DeXuatLk>(path, "de_xuat");
  const tong = (raw.tong as Tong | undefined) ?? ({} as Tong);
  const theoNv = (raw.theo_nv as { nv: string | null; n: number; dang_giu: number }[] | undefined) ?? [];
  const n = (k: keyof Tong) => Number(tong[k] ?? 0);

  const cols: Column<DeXuatLk>[] = [
    { key: "id", header: "Lần cấp", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "tt", header: "Tình trạng", render: (r) => (r.lk_buoc !== "xong" ? <Badge tone="blue">{r.lk_nhan || "Đang cấp"}</Badge> : <CongNoTag d={r} />) },
    { key: "lk", header: "Linh kiện", render: (r) => <span className="flex items-center gap-1"><span className="block max-w-[260px] truncate" title={nameOf(r.ma_lk)}>{nameOf(r.ma_lk)}</span><LoaiKhacGoiY d={r} /></span> },
    { key: "sl", header: "Nhận", render: (r) => <b>{r.so_luong}</b> },
    { key: "unit", header: "Đơn BH · case", render: (r) => <span className="text-xs"><span className="font-mono">{r.unit_id}</span>{r.case_id ? ` · ${r.case_id}` : ""}</span> },
    ...(xemTatCa && !nv ? [{ key: "nv", header: "NV sửa chữa", render: (r: DeXuatLk) => (r.nguoi_sua_chua ? <UserName email={r.nguoi_sua_chua} /> : "—") } as Column<DeXuatLk>] : []),
    { key: "ddh", header: "Đơn Đặt LK", render: (r) => <span className="font-mono text-xs">{r.lk_ddh_id}</span> },
    { key: "tao", header: "Ngày cấp", render: (r) => <span className="text-xs">{fmtDate(r.created_at)}</span> },
  ];
  const exportCols: ExportCol<DeXuatLk>[] = [
    { header: "Lần cấp", value: (r) => r.id, width: 14 },
    { header: "Đơn Đặt LK", value: (r) => r.lk_ddh_id, width: 14 },
    { header: "Trạng thái cấp", value: (r) => r.lk_nhan, width: 24 },
    { header: "NV sửa chữa", value: (r) => (r.nguoi_sua_chua ? displayName(r.nguoi_sua_chua) : ""), width: 26 },
    { header: "Đơn bảo hành", value: (r) => r.unit_id, width: 16 },
    { header: "Mã case", value: (r) => r.case_id, width: 16 },
    { header: "Mã LK", value: (r) => r.ma_lk, width: 14 },
    { header: "Linh kiện", value: (r) => nameOf(r.ma_lk), width: 34 },
    { header: "Nhận", value: (r) => r.so_luong, width: 7 },
    { header: "Đã dùng", value: (r) => r.sl_dung, width: 8 },
    { header: "Trả kho", value: (r) => r.sl_tra, width: 8 },
    { header: "Trừ công nợ", value: (r) => r.sl_tru, width: 10 },
    { header: "Xác", value: (r) => (r.xac_kq ? XAC_KQ_TIEU_HAO_NHAN[r.xac_kq] : ""), width: 18 },
    { header: "Đơn trừ CN", value: (r) => (r.tru_ddh_id ? `${r.tru_ddh_id} · ${r.tru_nhan ?? ""}` : ""), width: 30 },
    { header: "Đơn trả kho", value: (r) => (r.tra_ddh_id ? `${r.tra_ddh_id} · ${r.tra_nhan ?? ""}` : ""), width: 30 },
    { header: "Admin xác nhận", value: (r) => (r.xn_boi ? `${displayName(r.xn_boi)} · ${fmtDate(r.xn_luc)}` : ""), width: 28 },
    { header: "Ngày cấp", value: (r) => fmtDate(r.created_at), width: 16 },
  ];

  return (
    <Card className="p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🧰 {xemTatCa && nv !== user.email ? "Linh kiện NV sửa chữa" : "Linh kiện của tôi"}</h3>
        <span className="text-xs text-[var(--ink-soft)]">Linh kiện được cấp qua app Đặt linh kiện (công nợ ký gửi) — dùng bao nhiêu, trả kho bao nhiêu, đã trừ công nợ chưa.</span>
      </div>
      {xemTatCa && theoNv.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setNv("")} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${!nv ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)]"}`}>Tất cả NV</button>
          {theoNv.map((x) => (
            <button key={x.nv ?? "_"} type="button" onClick={() => setNv(x.nv ?? "")} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${nv === x.nv ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)]"}`}>
              {x.nv ? displayName(x.nv) : "Chưa gán NV"} · {x.n}{x.dang_giu ? <span className="ml-1 text-[var(--red-700,#b91c1c)]">({x.dang_giu} giữ)</span> : null}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiO label="Công nợ hiện tại (linh kiện)" value={n("cong_no")} tone="text-[var(--ink)]" hint="Đã nhận − đã trừ công nợ − đã trả kho" onClick={() => setNhom("")} on={!nhom} />
        <KpiO label="Đang cấp" value={n("dang_cap")} tone="text-[var(--blue-700)]" onClick={() => setNhom("dang_cap")} on={nhom === "dang_cap"} />
        <KpiO label="Đang giữ — chờ Admin xác nhận" value={n("dang_giu")} tone="text-[var(--amber-700)]" onClick={() => setNhom("dang_giu")} on={nhom === "dang_giu"} />
        <KpiO label="Chờ Kế toán trừ" value={n("cho_tru")} tone="text-[var(--amber-700)]" hint="Đơn trừ công nợ đã tạo, Kế toán chưa chốt" onClick={() => setNhom("cho_tru")} on={nhom === "cho_tru"} />
        <KpiO label="Phải trả kho" value={n("phai_tra")} tone="text-[var(--red-700,#b91c1c)]" hint="Linh kiện dư chưa trả xong" onClick={() => setNhom("cho_tru")} />
        <KpiO label="Đã trừ công nợ" value={n("da_tru")} tone="text-[var(--green-700)]" onClick={() => setNhom("xong")} on={nhom === "xong"} />
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        Đã nhận {n("da_nhan")} · đã dùng {n("da_dung")} · đã trả kho {n("da_tra")}
        {n("that_lac_giu") ? <> · <span className="text-[var(--red-700,#b91c1c)]">xác thất lạc chưa trừ {n("that_lac_giu")}</span></> : null}
        {n("loi") ? <> · <span className="text-[var(--red-700,#b91c1c)]">⚠ {n("loi")} lần cấp chưa tạo được đơn bên app Đặt LK</span></> : null}
      </p>
      <div className="flex flex-col md:flex-row md:items-center gap-1.5">
        <div className="flex flex-wrap gap-1">
          {NHOM.map((x) => (
            <button key={x.key} type="button" onClick={() => setNhom(x.key)} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${nhom === x.key ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)]"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="md:ml-auto flex gap-1.5">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Mã cấp, linh kiện, đơn, case…" className="md:!w-64" />
          <ExcelExportButton file="linh-kien-sua-chua" disabled={!total} sources={[{ path, itemsKey: "de_xuat", sheet: "Linh kien sua chua", cols: exportCols }]} />
        </div>
      </div>
      <Table columns={cols} rows={items} rowKey={(r) => r.id} onRowClick={(r) => setMo(r.unit_id)} emptyText="Chưa có linh kiện nào được cấp qua app Đặt linh kiện." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {mo && <UnitDetailModal unitId={mo} user={user} onClose={() => setMo(null)} onChanged={reload} />}
    </Card>
  );
}
