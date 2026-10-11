import { refreshLinhKien } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
import { Table } from "../../ui/Table";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Input, Field } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { Modal } from "../../ui/Modal";
import type { LinhKien } from "../../lib/types";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { readSheetFile } from "../../lib/xlsxRead";
import { normalizeVi } from "../../lib/normalizeVi";
import { useAuth } from "../../auth/AuthContext";

// Danh muc linh kien - HYBRID dong bo (nguon_du_lieu='dong_bo', tu linh-kien-app) + tao them noi bo
// (nguon_du_lieu='noi_bo'). Dong dong bo CHI sua duoc 2 cot rieng cua bao hanh (so_thang_bao_hanh,
// duoc_dung_bao_hanh) - server da tu chan sua cac cot khac, UI khoa luon de ro rang (port dung yeu
// cau goc "cho phep tao them, sua thong tin, tat bat danh sach su dung trong bao hanh").
// Phan trang THAT o tang server (05/09/2026, nang cap tu ban chi phan trang o client cua "QA vong 3"
// - ban cu van tai het ~400+ dong ve may truoc khi cat, khong dung tinh than yeu cau "han che load qua
// nhieu du lieu ve may nguoi dung") - "q" loc bang SQL LIKE tren backend (xem routes/linhKien.ts).

export function LinhKienScreen() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);
  const { items, total, page, pageCount, setPage, loading, reload } = usePagedApi<LinhKien>(`/linh-kien${search ? `?q=${encodeURIComponent(search)}` : ""}`, "linh_kien");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user : null;
  const canEdit = !!me && (me.la_admin_bh || me.la_qtri);
  // Goi y Phan loai + so dong chua day duoc sang linh-kien-app (2026-10-11).
  const [pl, setPl] = useState<{ phan_loai: { v: string; n: number }[]; cho_day: number }>({ phan_loai: [], cho_day: 0 });
  const loadPl = () => {
    api.get<typeof pl>("/linh-kien/phan-loai").then(setPl).catch(() => undefined);
  };
  useEffect(loadPl, []);
  const reloadAll = () => {
    reload();
    loadPl();
    refreshLinhKien();
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const r = await api.get<{ linh_kien: LinhKien[] }>("/linh-kien");
      const rows = [
        ["Mã linh kiện", "Tên linh kiện", "Phân loại", "Tháng BH", "Dùng trong BH", "Nguồn"],
        ...r.linh_kien.map((lk) => [lk.ma_lk, lk.ten_lk, lk.don_vi ?? "", lk.so_thang_bao_hanh == null ? "" : String(lk.so_thang_bao_hanh), lk.duoc_dung_bao_hanh ? "Có" : "Không", lk.nguon_du_lieu === "noi_bo" ? "Nội bộ" : "Đồng bộ"]),
      ];
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      downloadBlob(buildXlsx([{ name: "Linh kien", rows, widths: [18, 50, 18, 10, 14, 10] }]), `danh-muc-linh-kien_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xlsx`);
      toast(`Đã tải ${r.linh_kien.length} linh kiện. Sửa cột "Tháng BH" / "Phân loại" rồi Import lại.`, "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setExporting(false);
    }
  };

  const dayLai = async () => {
    try {
      const r = await api.post<{ da_day: number; loi?: string; con_lai: number }>("/linh-kien/phan-loai/day-lai");
      toast(r.loi ? `Chưa gửi được (${r.loi}). Hệ thống sẽ tự gửi lại sau.` : `Đã đồng bộ ${r.da_day} phân loại sang linh-kien-app.`, r.loi ? "error" : "ok");
      reloadAll();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const patch = async (ma: string, body: Partial<LinhKien>) => {
    try {
      await api.patch(`/linh-kien/${encodeURIComponent(ma)}`, body);
      reloadAll();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🔩 Danh mục linh kiện ({total})</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm theo mã/tên…" className="sm:!w-52" />
          <Btn onClick={exportXlsx} disabled={exporting} title="Tải toàn bộ danh mục (xlsx) - sửa cột Tháng BH / Phân loại rồi Import lại">
            ⬇ Tải danh sách
          </Btn>
          {canEdit && (
            <Btn onClick={() => setImportOpen(true)} title="Import tháng bảo hành / phân loại từ file xlsx hoặc csv">
              ⬆ Import
            </Btn>
          )}
          {canEdit && (
            <Btn variant="primary" onClick={() => setAddOpen(true)}>
              + Thêm linh kiện (nội bộ)
            </Btn>
          )}
        </div>
      </div>
      {pl.cho_day > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--amber-50)] px-3 py-1.5 text-xs text-[var(--amber-800)]">
          ⏳ {pl.cho_day} phân loại đã sửa chưa đồng bộ được sang linh-kien-app (hệ thống tự gửi lại mỗi 15 phút).
          {canEdit && (
            <Btn size="sm" onClick={dayLai}>
              Gửi lại ngay
            </Btn>
          )}
        </div>
      )}
      <datalist id="lk_phan_loai_options">
        {pl.phan_loai.map((x) => (
          <option key={x.v} value={x.v} />
        ))}
      </datalist>
      <Table
        rows={loading ? [] : items}
        rowKey={(lk) => lk.ma_lk}
        emptyText={loading ? "Đang tải…" : "Không có linh kiện nào khớp."}
        columns={[
          { key: "ten", header: "Tên", render: (lk) => <span className="block max-w-[460px] truncate font-semibold text-[var(--ink)]" title={lk.ten_lk}>{lk.ten_lk}</span> },
          { key: "ma", header: "Mã", render: (lk) => <span className="font-mono text-xs">{lk.ma_lk}</span> },
          {
            key: "phanloai",
            header: "Phân loại",
            render: (lk) =>
              canEdit ? (
                <span className="inline-flex items-center gap-1">
                  <Input
                    key={`${lk.ma_lk}|${lk.don_vi ?? ""}`}
                    list="lk_phan_loai_options"
                    defaultValue={lk.don_vi ?? ""}
                    placeholder="—"
                    className="!w-36"
                    title={lk.nguon_du_lieu === "dong_bo" ? "Sửa phân loại - tự đồng bộ ngược về linh-kien-app" : "Sửa phân loại"}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (lk.don_vi ?? "").trim()) patch(lk.ma_lk, { don_vi: v });
                    }}
                  />
                  {!!lk.don_vi_cho_day && (
                    <span title="Chưa đồng bộ được sang linh-kien-app - sẽ tự gửi lại" className="text-xs">
                      ⏳
                    </span>
                  )}
                </span>
              ) : lk.don_vi?.trim() ? (
                <Badge tone="gray">{lk.don_vi}</Badge>
              ) : (
                <span className="text-[var(--ink-faint)]">—</span>
              ),
          },
          { key: "nguon", header: "Nguồn", render: (lk) => <Badge tone={lk.nguon_du_lieu === "dong_bo" ? "blue" : "gray"}>{lk.nguon_du_lieu === "dong_bo" ? "Đồng bộ" : "Nội bộ"}</Badge> },
          {
            key: "thang",
            header: "Tháng BH",
            render: (lk) => (
              <Input
                type="number"
                defaultValue={lk.so_thang_bao_hanh ?? ""}
                className="!w-24"
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== lk.so_thang_bao_hanh) patch(lk.ma_lk, { so_thang_bao_hanh: v ?? undefined });
                }}
              />
            ),
          },
          {
            key: "dung",
            header: "Dùng trong BH",
            render: (lk) => (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={lk.duoc_dung_bao_hanh} onChange={(e) => patch(lk.ma_lk, { duoc_dung_bao_hanh: e.target.checked })} />
                <span className="text-xs text-[var(--ink-soft)]">{lk.duoc_dung_bao_hanh ? "Đang bật" : "Đang tắt"}</span>
              </label>
            ),
          },
        ]}
      />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {addOpen && <AddLinhKienModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); reload(); }} />}
      {importOpen && <ImportLinhKienModal onClose={() => setImportOpen(false)} onDone={reloadAll} />}
    </Card>
  );
}

function AddLinhKienModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ma, setMa] = useState("");
  const [ten, setTen] = useState("");
  const [thangBh, setThangBh] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/linh-kien", { ma_lk: ma.trim(), ten_lk: ten.trim(), so_thang_bao_hanh: thangBh ? Number(thangBh) : undefined });
      toast("Đã thêm linh kiện.", "ok");
      refreshLinhKien();
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Thêm linh kiện nội bộ"
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!ma.trim() || !ten.trim() || busy} onClick={submit}>
            Thêm
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mã linh kiện" required>
          <Input value={ma} onChange={(e) => setMa(e.target.value)} />
        </Field>
        <Field label="Tên linh kiện" required>
          <Input value={ten} onChange={(e) => setTen(e.target.value)} />
        </Field>
        <Field label="Số tháng bảo hành">
          <Input type="number" value={thangBh} onChange={(e) => setThangBh(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// Import thang bao hanh / phan loai tu file (2026-10-11). Doc file ngay tren may (xlsx/csv), tu nhan cot
// theo tieu de: "Ma linh kien" (bat buoc), "Thang BH", "Phan loai". O trong = giu nguyen gia tri cu.
type ImportRow = { ma_lk: string; so_thang_bao_hanh: number | null; don_vi: string | null };

function findCol(header: string[], tests: ((h: string) => boolean)[]): number {
  const hs = header.map((h) => normalizeVi(String(h || "")).replace(/[^a-z0-9_ ]/g, " ").replace(/\s+/g, " ").trim());
  for (const t of tests) {
    const i = hs.findIndex(t);
    if (i >= 0) return i;
  }
  return -1;
}

function ImportLinhKienModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [kq, setKq] = useState<{ tong: number; doi_thang: number; doi_phan_loai: number; khong_thay: string[]; loi_thang: string[] } | null>(null);

  const onFile = async (f: File | undefined) => {
    setRows(null);
    setKq(null);
    setInfo("");
    if (!f) return;
    try {
      const data = await readSheetFile(f);
      // Dong tieu de = dong dau tien co cot "Ma linh kien" (bo qua tieu de phu o tren).
      let hi = -1;
      let cMa = -1;
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        cMa = findCol(data[i], [(h) => h === "ma linh kien" || h === "ma lk" || h === "ma_lk", (h) => h.startsWith("ma linh kien") || h.startsWith("ma lk"), (h) => h === "ma"]);
        if (cMa >= 0) {
          hi = i;
          break;
        }
      }
      if (hi < 0) {
        setInfo('Không tìm thấy cột "Mã linh kiện" trong 10 dòng đầu.');
        return;
      }
      const h = data[hi];
      const cThang = findCol(h, [(x) => x.includes("thang bh") || x.includes("thang bao hanh") || x === "so_thang_bao_hanh"]);
      const cPl = findCol(h, [(x) => x.startsWith("phan loai") || x === "don vi" || x === "don_vi"]);
      if (cThang < 0 && cPl < 0) {
        setInfo('Không tìm thấy cột "Tháng BH" hoặc "Phân loại".');
        return;
      }
      const out: ImportRow[] = [];
      let loi = 0;
      for (const r of data.slice(hi + 1)) {
        const ma = String(r[cMa] ?? "").trim();
        if (!ma) continue;
        const tRaw = cThang >= 0 ? String(r[cThang] ?? "").trim() : "";
        const thang = tRaw === "" ? null : Number(tRaw.replace(",", "."));
        if (thang !== null && !Number.isFinite(thang)) {
          loi++;
          continue;
        }
        const plv = cPl >= 0 ? String(r[cPl] ?? "").trim() : "";
        if (thang === null && !plv) continue;
        out.push({ ma_lk: ma, so_thang_bao_hanh: thang, don_vi: plv || null });
      }
      setRows(out);
      setInfo(
        `Đọc được ${out.length} dòng có dữ liệu · cột: Mã${cThang >= 0 ? " · Tháng BH" : ""}${cPl >= 0 ? " · Phân loại" : ""}${loi ? ` · ${loi} dòng tháng BH không phải số (bỏ qua)` : ""}.`,
      );
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setInfo(m === "XLS_CU" ? "File .xls cũ chưa hỗ trợ - mở bằng Excel rồi lưu lại dạng .xlsx." : "Không đọc được file. Hãy dùng file .xlsx hoặc .csv.");
    }
  };

  const submit = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try {
      const r = await api.post<NonNullable<typeof kq>>("/linh-kien/import", { rows });
      setKq(r);
      toast(`Đã cập nhật ${r.doi_thang} tháng BH, ${r.doi_phan_loai} phân loại.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Import tháng bảo hành / phân loại"
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>{kq ? "Đóng" : "Huỷ"}</Btn>
          {!kq && (
            <Btn variant="primary" disabled={!rows?.length || busy} onClick={submit}>
              Cập nhật {rows?.length ?? 0} dòng
            </Btn>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-xs text-[var(--ink-soft)]">
          File .xlsx hoặc .csv, dòng tiêu đề có cột <b>Mã linh kiện</b> và ít nhất 1 trong 2 cột <b>Tháng BH</b>, <b>Phân loại</b> (dùng luôn file "⬇ Tải danh sách"). Ô để
          trống = giữ nguyên giá trị cũ. Phân loại của linh kiện đồng bộ sẽ được đồng bộ ngược về linh-kien-app.
        </p>
        <Field label="Chọn file">
          <input type="file" accept=".xlsx,.csv" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm" />
        </Field>
        {info && <p className="text-xs text-[var(--ink-soft)]">{info}</p>}
        {kq && (
          <div className="rounded-lg bg-[var(--surface-2)] p-2 text-xs space-y-1">
            <p>
              ✔ Đổi tháng BH: <b>{kq.doi_thang}</b> · Đổi phân loại: <b>{kq.doi_phan_loai}</b> (các dòng còn lại không thay đổi)
            </p>
            {kq.khong_thay.length > 0 && (
              <p className="text-[var(--amber-800)]" title={kq.khong_thay.join(", ")}>
                {kq.khong_thay.length} mã không có trong danh mục: {kq.khong_thay.slice(0, 8).join(", ")}
                {kq.khong_thay.length > 8 ? "…" : ""}
              </p>
            )}
            {kq.loi_thang.length > 0 && <p className="text-[var(--red-600)]">{kq.loi_thang.length} dòng tháng BH ngoài khoảng 0–240: {kq.loi_thang.slice(0, 8).join(", ")}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
