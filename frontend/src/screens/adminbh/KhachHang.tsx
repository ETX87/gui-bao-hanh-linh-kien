import { useEffect, useState } from "react";
import { Table, StopClick } from "../../ui/Table";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Badge, Field, Input, Textarea } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";
import { usePagedApi } from "../../hooks/usePagedApi";
import { LOAI_KH_LABEL, type KhachHang } from "./DonDichVuModal";

// 14/11/2026 - Quản trị › "Khách hàng / NPP": danh bạ dùng khi Admin BH tạo đơn thủ công cho khách lẻ / nhà phân phối.

type Row = KhachHang & { an: number; created_at: string; nguoi_tao: string | null };

const ERR: Record<string, string> = {
  KH_TRUNG_SDT: "Số điện thoại này đã có trong danh bạ (cùng loại).",
  KH_DA_CO_DON: "Khách đã có đơn — không xoá được, hãy dùng \"Ẩn\".",
  MISSING_TEN: "Chưa nhập tên.",
  MISSING_SDT: "Chưa nhập SĐT.",
};
const msg = (e: unknown) => (e instanceof ApiError && ERR[e.code]) || errorMessage(e);

export function KhachHangScreen({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loai, setLoai] = useState("");
  const [an, setAn] = useState("0");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);
  const params = new URLSearchParams();
  if (qDeb) params.set("q", qDeb);
  if (loai) params.set("loai", loai);
  if (an) params.set("an", an);
  const pg = usePagedApi<Row>(`/khach-hang?${params.toString()}`, "khach_hang");

  const doiAn = async (r: Row) => {
    try {
      await api.patch(`/khach-hang/${r.id}`, { an: !r.an });
      pg.reload();
    } catch (e) {
      toast(msg(e), "error");
    }
  };
  const xoa = async (r: Row) => {
    if (!window.confirm(`Xoá khách ${r.ten}?`)) return;
    try {
      await api.delete(`/khach-hang/${r.id}`);
      toast("Đã xoá.", "ok");
      pg.reload();
    } catch (e) {
      toast(msg(e), "error");
    }
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-[var(--ink)] lg:text-sm">🧾 Khách hàng / Nhà phân phối ({pg.total})</h3>
        {canEdit && (
          <Btn variant="primary" size="sm" onClick={() => setEditing("new")}>
            ＋ Thêm khách
          </Btn>
        )}
      </div>
      <p className="mb-2 text-xs text-[var(--ink-soft)]">Danh bạ dùng khi Admin BH tạo đơn thủ công (Đơn bảo hành › "+ Tạo đơn thủ công" › Khách lẻ / NPP). Khách đã có đơn không xoá được, chỉ ẩn.</p>
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Tìm tên, SĐT, địa chỉ, mã KH…" className="sm:!w-72" />
        <select className="rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-2 py-1.5 text-sm" value={loai} onChange={(e) => setLoai(e.target.value)}>
          <option value="">Mọi loại</option>
          <option value="kh_le">Khách lẻ</option>
          <option value="npp">Nhà phân phối</option>
        </select>
        <select className="rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-2 py-1.5 text-sm" value={an} onChange={(e) => setAn(e.target.value)}>
          <option value="0">Đang dùng</option>
          <option value="1">Đã ẩn</option>
          <option value="">Tất cả</option>
        </select>
      </div>
      <Table
        rows={pg.items}
        rowKey={(r) => r.id}
        onRowClick={canEdit ? (r) => setEditing(r) : undefined}
        emptyText={pg.loading ? "Đang tải…" : "Chưa có khách hàng nào."}
        columns={[
          { key: "ten", header: "Tên", render: (r) => <span className="font-semibold text-[var(--ink)]">{r.ten}</span> },
          { key: "loai", header: "Loại", render: (r) => <Badge tone={r.loai === "npp" ? "violet" : "blue"}>{LOAI_KH_LABEL[r.loai]}</Badge> },
          { key: "sdt", header: "SĐT", render: (r) => <span className="font-mono text-xs">{r.sdt}</span> },
          { key: "dc", header: "Địa chỉ", render: (r) => <span className="text-xs">{r.dia_chi || "—"}</span> },
          { key: "don", header: "Số đơn", render: (r) => r.so_don ?? 0 },
          { key: "id", header: "Mã", render: (r) => <span className="font-mono text-xs text-[var(--link)]">{r.id}</span> },
          ...(canEdit
            ? [
                {
                  key: "act",
                  header: "",
                  render: (r: Row) => (
                    <StopClick>
                      <div className="flex gap-1">
                        <Btn size="sm" onClick={() => doiAn(r)}>{r.an ? "Hiện lại" : "Ẩn"}</Btn>
                        {!r.so_don && (
                          <Btn size="sm" variant="ghost" onClick={() => xoa(r)}>
                            Xoá
                          </Btn>
                        )}
                      </div>
                    </StopClick>
                  ),
                },
              ]
            : []),
        ]}
      />
      {pg.pageCount > 1 && <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />}
      {editing && (
        <KhachHangEditModal
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            pg.reload();
          }}
        />
      )}
    </Card>
  );
}

function KhachHangEditModal({ row, onClose, onDone }: { row: Row | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ loai: row?.loai || "kh_le", ten: row?.ten || "", sdt: row?.sdt || "", dia_chi: row?.dia_chi || "", ghi_chu: row?.ghi_chu || "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      if (row) await api.patch(`/khach-hang/${row.id}`, f);
      else await api.post("/khach-hang", f);
      toast("Đã lưu.", "ok");
      onDone();
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row ? `Sửa khách ${row.id}` : "Thêm khách hàng / NPP"}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || !f.ten.trim() || !f.sdt.trim()} onClick={save}>
            Lưu
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-4 text-sm">
          {(["kh_le", "npp"] as const).map((l) => (
            <label key={l} className="flex items-center gap-1.5">
              <input type="radio" checked={f.loai === l} onChange={() => setF({ ...f, loai: l })} /> {LOAI_KH_LABEL[l]}
            </label>
          ))}
        </div>
        <Field label="Tên" required>
          <Input value={f.ten} onChange={(e) => setF({ ...f, ten: e.target.value })} />
        </Field>
        <Field label="SĐT" required>
          <Input value={f.sdt} inputMode="tel" onChange={(e) => setF({ ...f, sdt: e.target.value })} />
        </Field>
        <Field label="Địa chỉ">
          <Input value={f.dia_chi} onChange={(e) => setF({ ...f, dia_chi: e.target.value })} />
        </Field>
        <Field label="Ghi chú">
          <Textarea rows={2} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
