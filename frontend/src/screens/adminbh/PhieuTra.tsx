import { useEffect, useMemo, useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Input, Select } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, KHACH_LE_KEY, doiTacKeyFromName } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { useClientPage } from "../../hooks/useClientPage";
import type { AppUser, PhieuTra } from "../../lib/types";
import { displayName } from "../../hooks/useUserNames";
import { ReturnUnitTable, UnitFilterBar, useFilteredUnits, nguoiNhanLabel, EMPTY_LOC, type ReturnUnit, type UnitLoc } from "./ReturnUnitTable";

// Man "Tao & quan ly phieu tra bao hanh" (Admin BH).
// Thiet ke lai 19/10/2026 (nguyen van: "o danh sach don cho tra: hien danh sach theo dang list KTV (x123)
// -> don 1 (cac cot lien quan), don 2... co the tich chon 1 don hoac nhieu don de tao phieu tra" + "bo
// sung them cac cong cu filter, tim kiem phu hop"):
//  - Don cho tao phieu tra: bang nhom theo KTV nhan, tich chon tung don / ca nhom / tat ca dang loc,
//    "Tao phieu tra" tu dong tach 1 phieu cho moi to hop (KTV, loai doi tru); bo loc 6 tieu chi.
//  - Danh sach phieu tra: loc trang thai / loai doi tru / nguoi nhan / mien + tim (ma phieu, ma DH, MISA,
//    van don, KTV, ma don vi, case, linh kien) o server.

const TT_GROUPS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "nhap,cho_ke_toan_duyet", label: "Đang sửa được (Nháp + Chờ KT)" },
  ...Object.entries(TRANG_THAI_PHIEU_TRA_LABELS).map(([value, label]) => ({ value, label })),
  { value: "ket_thuc_khong_gui", label: "Kết thúc, không gửi" },
];

export function AdminPhieuTraScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [sanSang, setSanSang] = useState<ReturnUnit[] | null>(null);
  const [loc, setLoc] = useState<UnitLoc>(EMPTY_LOC);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bo loc danh sach phieu tra (server).
  const [tt, setTt] = useState("");
  const [loaiPt, setLoaiPt] = useState("");
  const [nhanPt, setNhanPt] = useState("");
  const [mienPt, setMienPt] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  const listPath = useMemo(() => {
    const p = new URLSearchParams();
    if (tt) p.set("trang_thai", tt);
    if (loaiPt) p.set("loai_doi_tru", loaiPt);
    if (nhanPt) p.set("nguoi_nhan", nhanPt);
    if (mienPt) p.set("mien", mienPt);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/phieu-tra${s ? `?${s}` : ""}`;
  }, [tt, loaiPt, nhanPt, mienPt, q]);
  const { items: list, total: listTotal, page: listPage, pageCount: listPageCount, setPage: setListPage, loading: loadingList, reload: reloadList } = usePagedApi<PhieuTra>(listPath, "phieu_tra");
  const soLocPt = [tt, loaiPt, nhanPt, mienPt, q].filter(Boolean).length;

  const loadSanSang = () => api.get<{ don_vi: ReturnUnit[] }>("/phieu-tra/san-sang").then((r) => setSanSang(r.don_vi));
  useEffect(() => {
    loadSanSang();
  }, []);

  const afterChange = () => {
    setSelected(new Set());
    loadSanSang();
    reloadList();
    refresh();
  };

  const all = sanSang ?? [];
  const filtered = useFilteredUnits(all, loc);
  // Nhom theo KTV nhan, 20 nhom / trang.
  const groups = useMemo(() => {
    const m = new Map<string, ReturnUnit[]>();
    for (const u of filtered) {
      const k = u.ktv_key || KHACH_LE_KEY;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return [...m.entries()];
  }, [filtered]);
  const groupPg = useClientPage(groups);
  const pageUnits = useMemo(() => groupPg.pageItems.flatMap(([, us]) => us), [groupPg.pageItems]);

  // Bo chon cac don khong con hien thi sau khi doi bo loc.
  useEffect(() => {
    setSelected((s) => {
      const vis = new Set(filtered.map((u) => u.id));
      const n = new Set([...s].filter((id) => vis.has(id)));
      return n.size === s.size ? s : n;
    });
  }, [filtered]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMany = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

  const selUnits = all.filter((u) => selected.has(u.id));
  const soPhieu = new Set(selUnits.map((u) => `${u.ktv_key}::${u.loai_doi_tru || "doi_tra"}`)).size;
  const soKtv = new Set(selUnits.map((u) => u.ktv_key)).size;

  const taoPhieu = async (ids: string[], doiTacKey?: string) => {
    if (!ids.length) return;
    const us = all.filter((u) => ids.includes(u.id));
    const n = doiTacKey ? new Set(us.map((u) => u.loai_doi_tru || "doi_tra")).size : new Set(us.map((u) => `${u.ktv_key}::${u.loai_doi_tru || "doi_tra"}`)).size;
    if (n > 1 && !confirm(`${ids.length} đơn sẽ được tách thành ${n} phiếu trả (mỗi KTV × loại đối trừ 1 phiếu). Tiếp tục?`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ phieu_tra_ids: string[]; bo_qua: string[] }>("/phieu-tra/tao-nhieu", { unit_ids: ids, doi_tac_key: doiTacKey });
      toast(`Đã tạo ${r.phieu_tra_ids.length} phiếu trả: ${r.phieu_tra_ids.join(", ")}${r.bo_qua.length ? ` · bỏ qua ${r.bo_qua.length} đơn không còn sẵn sàng` : ""}.`, "ok");
      afterChange();
      if (r.phieu_tra_ids.length === 1) setDetailId(r.phieu_tra_ids[0]);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // "Tra xac cho doi tac" (chot 2026-09-08) - Admin go ten doi tac, sinh khoa ktv_nhan ao on dinh.
  const taoChoDoiTac = async () => {
    const ten = window.prompt("Tên đối tác nhận trả xác (vd: Công ty ABC):")?.trim();
    if (!ten) return;
    await taoPhieu([...selected], doiTacKeyFromName(ten));
  };

  const autoGom = async () => {
    if (!confirm("Tự động gộp phiếu trả cho TẤT CẢ đơn đang chờ? Mỗi KTV × loại đối trừ 1 phiếu (gộp vào phiếu nháp sẵn có nếu có). Mỗi phiếu vẫn cần bổ sung mã và gửi duyệt Kế toán.")) return;
    setBusy(true);
    try {
      const r = await api.post<{ so_phieu_tao: number; so_phieu_gop_them?: number }>("/phieu-tra/tu-dong-gom");
      const gop = r.so_phieu_gop_them || 0;
      toast(`Đã tạo ${r.so_phieu_tao} phiếu trả mới${gop ? `, gộp thêm vào ${gop} phiếu nháp sẵn có` : ""}.`, "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!sanSang && loadingList) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <StatusBadge kind="tra" value={r.trang_thai} /> },
    { key: "ktv", header: "Người nhận", render: (r) => nguoiNhanLabel(r.ktv_nhan) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
    { key: "vd", header: "Vận đơn", render: (r) => r.ma_van_don || "—" },
    { key: "up", header: "Cập nhật", render: (r) => <span className="text-xs whitespace-nowrap">{fmtDate(r.updated_at)}</span> },
    {
      key: "dn",
      header: "Ghi chú",
      render: (r) =>
        r.ly_do_day_nguoc && r.trang_thai === "nhap" ? <Badge tone="red">↩ {r.day_nguoc_vai_tro === "kho" ? "Kho" : "KT"} đẩy ngược</Badge> : r.ly_do_tu_choi_kt && r.trang_thai === "nhap" ? <Badge tone="amber">KT từ chối</Badge> : "",
    },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">
            Đơn chờ tạo phiếu trả ({filtered.length}
            {filtered.length !== all.length ? `/${all.length}` : ""} đơn · {groups.length} người nhận)
          </h3>
          {all.length > 0 && (
            <Btn variant="secondary" disabled={busy} onClick={autoGom}>
              ⚡ Tự động gộp tất cả
            </Btn>
          )}
        </div>
        <UnitFilterBar value={loc} onChange={(v) => { setLoc(v); groupPg.setPage(0); }} units={all} />

        {/* Thanh thao tac: chon / tao phieu */}
        <div className={`flex flex-wrap items-center gap-2 mb-2 rounded-lg px-2.5 py-1.5 ${selected.size ? "bg-[var(--brand-50)] border border-[var(--brand-200)]" : ""}`}>
          <Btn size="sm" variant="ghost" disabled={!filtered.length} onClick={() => toggleMany(filtered.map((u) => u.id), true)}>
            ☑ Chọn tất cả đang lọc ({filtered.length})
          </Btn>
          {selected.size > 0 && (
            <>
              <span className="text-sm font-semibold text-[var(--ink)]">
                Đã chọn {selected.size} đơn · {soKtv} người nhận → {soPhieu} phiếu
              </span>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Bỏ chọn
              </Btn>
              <span className="ml-auto flex gap-1.5">
                <Btn size="sm" variant="secondary" disabled={busy} onClick={taoChoDoiTac}>
                  Trả xác cho đối tác…
                </Btn>
                <Btn size="sm" variant="primary" disabled={busy} onClick={() => taoPhieu([...selected])}>
                  ＋ Tạo phiếu trả ({selected.size})
                </Btn>
              </span>
            </>
          )}
        </div>

        {sanSang === null ? (
          <Spinner />
        ) : (
          <>
            <ReturnUnitTable
              units={pageUnits}
              grouped
              selected={selected}
              onToggle={toggle}
              onToggleMany={toggleMany}
              onOpen={(u) => setOpenUnit(u.id)}
              emptyText={all.length ? "Không có đơn nào khớp bộ lọc." : "Không có đơn nào đang chờ tạo phiếu trả."}
              groupAction={(key, us) => {
                const ids = us.filter((u) => selected.has(u.id)).map((u) => u.id);
                const dung = ids.length ? ids : us.map((u) => u.id);
                return (
                  <Btn size="sm" variant="primary" disabled={busy} onClick={() => taoPhieu(dung)} title={`Tạo phiếu trả cho ${key === KHACH_LE_KEY ? "Khách lẻ" : displayName(key)}`}>
                    Tạo phiếu ({dung.length}{ids.length ? " đã chọn" : " đơn"})
                  </Btn>
                );
              }}
            />
            <Pagination page={groupPg.page} pageCount={groupPg.pageCount} total={groupPg.total} onChange={groupPg.setPage} />
          </>
        )}
      </Card>

      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">Danh sách phiếu trả ({listTotal})</h3>
        <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-3 gap-y-1.5 items-center">
            <div className="col-span-2 lg:col-span-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 [&>*:last-child]:flex-1">
              <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)]">Tìm</span>
              <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Mã phiếu, mã ĐH, MISA, vận đơn, KTV, mã đơn, case…" />
            </div>
            <LocSelect label="Trạng thái" value={tt} onChange={setTt} options={TT_GROUPS} />
            <LocSelect label="Đối trừ" value={loaiPt} onChange={setLoaiPt} options={[{ value: "", label: "Tất cả" }, ...Object.entries(LOAI_DOI_TRU_LABELS).map(([value, label]) => ({ value, label }))]} />
            <LocSelect label="Người nhận" value={nhanPt} onChange={setNhanPt} options={[{ value: "", label: "Tất cả" }, { value: "ktv", label: "KTV" }, { value: "khach_le", label: "Khách lẻ" }, { value: "doi_tac", label: "Đối tác (trả xác)" }]} />
            <LocSelect label="Miền" value={mienPt} onChange={setMienPt} options={[{ value: "", label: "Tất cả" }, { value: "MB", label: "Miền Bắc" }, { value: "MN", label: "Miền Nam" }, { value: "none", label: "Chưa khai báo" }]} />
          </div>
          {soLocPt > 0 && (
            <div className="flex justify-end mt-1.5">
              <button type="button" className="text-xs font-semibold text-[var(--link)] hover:underline" onClick={() => { setTt(""); setLoaiPt(""); setNhanPt(""); setMienPt(""); setQInput(""); setQ(""); }}>
                ✕ Xoá lọc ({soLocPt})
              </button>
            </div>
          )}
        </div>
        <Table columns={cols} rows={list} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={soLocPt ? "Không có phiếu trả nào khớp bộ lọc." : "Chưa có phiếu trả nào."} />
        <Pagination page={listPage} pageCount={listPageCount} total={listTotal} onChange={setListPage} />
      </Card>

      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={afterChange} />}
    </div>
  );
}

function LocSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:min-w-0">
      <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)] whitespace-nowrap">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
