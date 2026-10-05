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

  const patch = async (ma: string, body: Partial<LinhKien>) => {
    try {
      await api.patch(`/linh-kien/${encodeURIComponent(ma)}`, body);
      reload();
      refreshLinhKien();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🔩 Danh mục linh kiện ({total})</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm theo mã/tên…" className="sm:!w-52" />
          <Btn variant="primary" onClick={() => setAddOpen(true)}>
            + Thêm linh kiện (nội bộ)
          </Btn>
        </div>
      </div>
      <Table
        rows={loading ? [] : items}
        rowKey={(lk) => lk.ma_lk}
        emptyText={loading ? "Đang tải…" : "Không có linh kiện nào khớp."}
        columns={[
          { key: "ten", header: "Tên", render: (lk) => <span className="font-semibold text-[var(--ink)] whitespace-normal">{lk.ten_lk}</span> },
          { key: "ma", header: "Mã", render: (lk) => <span className="font-mono text-xs">{lk.ma_lk}</span> },
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
                <input type="checkbox" className="w-5 h-5" checked={lk.duoc_dung_bao_hanh} onChange={(e) => patch(lk.ma_lk, { duoc_dung_bao_hanh: e.target.checked })} />
                <span className="text-xs text-[var(--ink-soft)]">{lk.duoc_dung_bao_hanh ? "Đang bật" : "Đang tắt"}</span>
              </label>
            ),
          },
        ]}
      />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {addOpen && <AddLinhKienModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); reload(); }} />}
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
