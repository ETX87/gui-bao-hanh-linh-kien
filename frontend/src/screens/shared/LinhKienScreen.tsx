import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Badge, Input, Field } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import type { LinhKien } from "../../lib/types";

// Danh muc linh kien - HYBRID dong bo (nguon_du_lieu='dong_bo', tu linh-kien-app) + tao them noi bo
// (nguon_du_lieu='noi_bo'). Dong dong bo CHI sua duoc 2 cot rieng cua bao hanh (so_thang_bao_hanh,
// duoc_dung_bao_hanh) - server da tu chan sua cac cot khac, UI khoa luon de ro rang (port dung yeu
// cau goc "cho phep tao them, sua thong tin, tat bat danh sach su dung trong bao hanh").
// Phan trang 20 linh kien/bang (yeu cau bo sung "QA vong 2") - danh sach that co the dai ~400+ dong
// (theo linh-kien-app), 1 bang phang khong gioi han se rat kho keo/tim; ket hop them o tim kiem theo
// ten/ma de khong phai lat qua nhieu trang khi biet ro dang tim gi.

const PAGE_SIZE = 20;

export function LinhKienScreen() {
  const toast = useToast();
  const [items, setItems] = useState<LinhKien[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = () => api.get<{ linh_kien: LinhKien[] }>("/linh-kien").then((r) => setItems(r.linh_kien));
  useEffect(() => {
    load();
  }, []);

  const patch = async (ma: string, body: Partial<LinhKien>) => {
    try {
      await api.patch(`/linh-kien/${encodeURIComponent(ma)}`, body);
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((lk) => lk.ten_lk.toLowerCase().includes(q) || lk.ma_lk.toLowerCase().includes(q));
  }, [items, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const pageItems = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">🔩 Danh mục linh kiện ({items.length})</h3>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã/tên…"
            className="!py-1.5 !w-52"
          />
          <Btn variant="primary" onClick={() => setAddOpen(true)}>
            + Thêm linh kiện (nội bộ)
          </Btn>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--surface-100)] border-b border-[var(--line)]">
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Mã</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Tên</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Nguồn</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Tháng BH</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Dùng trong BH</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--ink-400)]">
                  Không có linh kiện nào khớp.
                </td>
              </tr>
            )}
            {pageItems.map((lk) => (
              <tr key={lk.ma_lk} className="border-b border-[var(--line)] last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{lk.ma_lk}</td>
                <td className="px-3 py-2">{lk.ten_lk}</td>
                <td className="px-3 py-2">
                  <Badge tone={lk.nguon_du_lieu === "dong_bo" ? "blue" : "gray"}>{lk.nguon_du_lieu === "dong_bo" ? "Đồng bộ" : "Nội bộ"}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    defaultValue={lk.so_thang_bao_hanh ?? ""}
                    className="!py-1 !w-20"
                    onBlur={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      if (v !== lk.so_thang_bao_hanh) patch(lk.ma_lk, { so_thang_bao_hanh: v ?? undefined });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={lk.duoc_dung_bao_hanh} onChange={(e) => patch(lk.ma_lk, { duoc_dung_bao_hanh: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-[var(--ink-600)]">
          <span>
            Trang {pageClamped}/{pageCount} — {filtered.length} linh kiện{search.trim() ? " khớp tìm kiếm" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped <= 1} className="!py-1 !px-2.5">
              ‹ Trước
            </Btn>
            <Btn onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={pageClamped >= pageCount} className="!py-1 !px-2.5">
              Sau ›
            </Btn>
          </div>
        </div>
      )}
      {addOpen && <AddLinhKienModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />}
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
