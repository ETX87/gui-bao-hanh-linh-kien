import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Badge, Btn, Field, Input, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { Section } from "../../ui/DetailParts";
import { useLinhKien, lkOptions, useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { DE_XUAT_TT_LABELS } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import type { AppUser, DeXuatLk } from "../../lib/types";

// De xuat linh kien sua chua (12/10/2026): moi de xuat la DON CON cua don vi bao hanh. NV dang sua
// don nay xin cap linh kien (nhieu lan, khong gioi han) -> Admin BH len MISA xuat kho roi bam "Cap"
// (nhap ma MISA) hoac "Tu choi" (bat buoc ly do).

const TONE: Record<string, "amber" | "green" | "red" | "gray"> = { cho_cap: "amber", cho_ke_toan: "amber", da_cap: "green", tu_choi: "red", huy: "gray" };

export function DeXuatBadge({ tt }: { tt: string }) {
  return (
    <Badge tone={TONE[tt] || "gray"} dot={tt === "cho_cap" || tt === "cho_ke_toan"}>
      {DE_XUAT_TT_LABELS[tt] || tt}
    </Badge>
  );
}

interface Row {
  ma_lk: string;
  so_luong: string;
  ghi_chu: string;
}

// Form NV tao 1 hoac nhieu dong de xuat.
export function DeXuatFormModal({ unitId, onClose, onDone }: { unitId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items } = useLinhKien();
  const opts = lkOptions(items);
  const [rows, setRows] = useState<Row[]>([{ ma_lk: "", so_luong: "1", ghi_chu: "" }]);
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const valid = rows.some((r) => r.ma_lk) && rows.every((r) => !r.ma_lk || Number(r.so_luong) >= 1);

  const submit = async () => {
    setBusy(true);
    try {
      const its = rows.filter((r) => r.ma_lk).map((r) => ({ ma_lk: r.ma_lk, so_luong: Math.max(1, Math.round(Number(r.so_luong) || 1)), ghi_chu: r.ghi_chu }));
      await api.post(`/de-xuat/don-vi/${unitId}`, { items: its });
      toast(`Đã gửi ${its.length} đề xuất linh kiện cho Admin bảo hành.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Đề xuất cấp linh kiện — ${unitId}`}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Gửi đề xuất
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">Admin bảo hành sẽ lên phiếu xuất MISA để cấp linh kiện từ kho. Có thể đề xuất nhiều lần cho tới khi sửa xong.</p>
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border border-[var(--line)] p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
              <Field label={`Linh kiện #${i + 1}`} required>
                <SearchableSelect options={opts} value={r.ma_lk} onChange={(v) => set(i, { ma_lk: v })} placeholder="Chọn linh kiện cần cấp" />
              </Field>
              <Field label="Số lượng" required>
                <Input type="number" min={1} value={r.so_luong} onChange={(e) => set(i, { so_luong: e.target.value })} />
              </Field>
            </div>
            <Field label="Ghi chú (tuỳ chọn)">
              <Input value={r.ghi_chu} onChange={(e) => set(i, { ghi_chu: e.target.value })} placeholder="VD: Bo mạch cháy tụ, cần thay" />
            </Field>
            {rows.length > 1 && (
              <div className="text-right">
                <Btn size="sm" variant="ghost" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                  ✕ Bỏ dòng
                </Btn>
              </div>
            )}
          </div>
        ))}
        <Btn size="sm" onClick={() => setRows((x) => [...x, { ma_lk: "", so_luong: "1", ghi_chu: "" }])}>
          + Thêm linh kiện
        </Btn>
      </div>
    </Modal>
  );
}

// Admin BH cap 1 hoac nhieu de xuat chung 1 phieu xuat MISA.
export function CapLinhKienModal({ list, onClose, onDone }: { list: DeXuatLk[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [misa, setMisa] = useState("");
  const [dh, setDh] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/de-xuat/cap", { ids: list.map((d) => d.id), ma_misa: misa, ma_don_hang: dh });
      toast(r.loi.length ? `Đã chuyển ${r.ok}, ${r.loi.length} đề xuất lỗi (${r.loi.map((x) => x.id).join(", ")}).` : `Đã chuyển ${r.ok} đề xuất sang Kế toán xác nhận.`, r.loi.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={list.length === 1 ? `Cấp linh kiện — ${list[0].id}` : `Cấp ${list.length} đề xuất linh kiện`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="success" disabled={!dh.trim() || busy} onClick={submit}>
            ✔ Đồng ý cấp → chờ Kế toán
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <ul className="max-h-48 overflow-y-auto divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] text-[13px]">
          {list.map((d) => (
            <li key={d.id} className="px-2.5 py-1.5 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
              <span className="truncate">{nameOf(d.ma_lk)}</span>
              <span className="ml-auto font-semibold">×{d.so_luong}</span>
            </li>
          ))}
        </ul>
        <Field label="Mã đơn hàng" required>
          <Input value={dh} onChange={(e) => setDh(e.target.value)} autoFocus />
        </Field>
        <Field label="Mã phiếu xuất MISA (tuỳ chọn — Kế toán nhập / xác nhận)">
          <Input value={misa} onChange={(e) => setMisa(e.target.value)} placeholder="Để trống nếu chưa có" />
        </Field>
      </div>
    </Modal>
  );
}

export function TuChoiDeXuatModal({ dx, onClose, onDone }: { dx: DeXuatLk; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/de-xuat/${dx.id}/tu-choi`, { ly_do: lyDo });
      toast("Đã từ chối đề xuất.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Từ chối đề xuất ${dx.id}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="danger" disabled={!lyDo.trim() || busy} onClick={submit}>
            Từ chối
          </Btn>
        </>
      }
    >
      <Field label="Lý do từ chối" required>
        <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Hết hàng, dùng linh kiện thay thế …" autoFocus />
      </Field>
    </Modal>
  );
}

// 03/11/2026: Ke toan nhap / xac nhan ma phieu xuat MISA (1 hoac nhieu de xuat) -> 'da_cap'.
export function KtXacNhanDeXuatModal({ list, onClose, onDone }: { list: DeXuatLk[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [chung, setChung] = useState(list.find((d) => d.ma_misa)?.ma_misa || "");
  const [rieng, setRieng] = useState<Record<string, string>>(() => Object.fromEntries(list.map((d) => [d.id, d.ma_misa || ""])));
  const [busy, setBusy] = useState(false);
  const misaOf = (d: DeXuatLk) => (rieng[d.id] || "").trim() || chung.trim();
  const valid = list.every((d) => misaOf(d));
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/de-xuat/ke-toan-xac-nhan", { items: list.map((d) => ({ id: d.id, ma_misa: misaOf(d) })) });
      toast(r.loi.length ? `Đã duyệt ${r.ok}, ${r.loi.length} lỗi (${r.loi.map((x) => x.id).join(", ")}).` : `Đã duyệt cấp ${r.ok} đề xuất.`, r.loi.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={list.length === 1 ? `Kế toán xác nhận — ${list[0].id}` : `Kế toán xác nhận ${list.length} đề xuất`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="success" disabled={!valid || busy} onClick={submit}>
            ✔ Duyệt cấp
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Mã phiếu xuất MISA (áp cho các dòng để trống)" required>
          <Input value={chung} onChange={(e) => setChung(e.target.value)} placeholder="Mã phiếu xuất kho trên MISA" autoFocus />
        </Field>
        <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] text-[13px]">
          {list.map((d) => (
            <li key={d.id} className="px-2.5 py-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
              <span className="truncate min-w-0 flex-1">
                {nameOf(d.ma_lk)} ×{d.so_luong}
              </span>
              {d.ma_don_hang && <span className="text-xs text-[var(--ink-soft)]">ĐH {d.ma_don_hang}</span>}
              {list.length > 1 && (
                <span className="w-36">
                  <Input value={rieng[d.id] || ""} onChange={(e) => setRieng((x) => ({ ...x, [d.id]: e.target.value }))} placeholder={chung || "MISA riêng"} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

// 03/11/2026: Ke toan day nguoc ve Admin BH (de xuat ve 'cho_cap'), bat buoc ly do.
export function KtTraLaiDeXuatModal({ dx, onClose, onDone }: { dx: DeXuatLk; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/de-xuat/${dx.id}/kt-tra-lai`, { ly_do: lyDo });
      toast("Đã trả lại Admin bảo hành.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Trả lại Admin BH — ${dx.id}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!lyDo.trim() || busy} onClick={submit}>
            ↩ Trả lại
          </Btn>
        </>
      }
    >
      <Field label="Lý do trả lại" required>
        <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Sai mã đơn hàng, chưa có phiếu xuất…" autoFocus />
      </Field>
    </Modal>
  );
}

// Khoi trong UI chi tiet don vi: danh sach don con "de xuat linh kien" + thao tac theo vai tro.
export function DeXuatSection({ unitId, unitTrangThai, nguoiSuaChua, user, onChanged }: { unitId: string; unitTrangThai: string; nguoiSuaChua: string | null; user: AppUser; onChanged: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [list, setList] = useState<DeXuatLk[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [capFor, setCapFor] = useState<DeXuatLk[] | null>(null);
  const [tuChoiFor, setTuChoiFor] = useState<DeXuatLk | null>(null);
  const [ktFor, setKtFor] = useState<DeXuatLk[] | null>(null);
  const [traLaiFor, setTraLaiFor] = useState<DeXuatLk | null>(null);
  const load = () =>
    api
      .get<{ de_xuat: DeXuatLk[] }>(`/de-xuat/don-vi/${unitId}`)
      .then((r) => setList(r.de_xuat))
      .catch(() => setList([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const isAdmin = user.la_admin_bh || user.la_qtri;
  const isKt = user.la_ke_toan || user.la_qtri;
  // 21/10/2026: Admin BH de xuat thay cho NV sua chua (don dang o buoc sua chua).
  const canDeXuat = unitTrangThai === "cho_chan_doan" && ((user.la_nv_sua_chua && nguoiSuaChua === user.email) || isAdmin);
  const thayNv = canDeXuat && nguoiSuaChua !== user.email;
  if (!list || (list.length === 0 && !canDeXuat)) return null;
  const choCap = list.filter((d) => d.trang_thai === "cho_cap");
  const after = () => {
    load();
    onChanged();
  };
  const huy = async (d: DeXuatLk) => {
    try {
      await api.post(`/de-xuat/${d.id}/huy`);
      toast("Đã huỷ đề xuất.", "ok");
      after();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Section
      title={`🔩 Đề xuất linh kiện (${list.length})`}
      right={
        <>
          {isAdmin && choCap.length > 1 && (
            <Btn size="sm" variant="success" onClick={() => setCapFor(choCap)}>
              Cấp tất cả {choCap.length}
            </Btn>
          )}
          {canDeXuat && (
            <Btn size="sm" variant="primary" onClick={() => setFormOpen(true)}>
              {thayNv ? "+ Đề xuất hộ NV" : "+ Đề xuất linh kiện"}
            </Btn>
          )}
        </>
      }
    >
      {list.length === 0 ? (
        <p className="text-xs text-[var(--ink-faint)]">Chưa có đề xuất. Cần linh kiện để sửa thì bấm "+ Đề xuất linh kiện".</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {list.map((d) => (
            <li key={d.id} className="py-1.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.id}</span>
                <DeXuatBadge tt={d.trang_thai} />
                <span className="font-semibold text-[var(--ink)]">{nameOf(d.ma_lk)}</span>
                <span className="font-semibold">×{d.so_luong}</span>
                <span className="ml-auto flex gap-1.5">
                  {d.trang_thai === "cho_cap" && isAdmin && (
                    <>
                      <Btn size="sm" variant="ghost" onClick={() => setTuChoiFor(d)}>
                        Từ chối
                      </Btn>
                      <Btn size="sm" variant="success" onClick={() => setCapFor([d])}>
                        Cấp
                      </Btn>
                    </>
                  )}
                  {d.trang_thai === "cho_ke_toan" && isKt && (
                    <>
                      <Btn size="sm" variant="ghost" onClick={() => setTraLaiFor(d)}>
                        ↩ Trả lại
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setTuChoiFor(d)}>
                        Từ chối
                      </Btn>
                      <Btn size="sm" variant="success" onClick={() => setKtFor([d])}>
                        Duyệt (MISA)
                      </Btn>
                    </>
                  )}
                  {d.trang_thai === "cho_cap" && d.nguoi_de_xuat === user.email && (
                    <Btn size="sm" variant="ghost" onClick={() => huy(d)}>
                      Huỷ
                    </Btn>
                  )}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                <UserName email={d.nguoi_de_xuat} />
                {nguoiSuaChua && d.nguoi_de_xuat !== nguoiSuaChua ? " (đề xuất hộ NV)" : ""} · {fmtDate(d.created_at)}
                {d.ghi_chu ? ` · ${d.ghi_chu}` : ""}
                {(d.trang_thai === "da_cap" || d.trang_thai === "cho_ke_toan") && `${d.ma_misa ? ` · MISA ${d.ma_misa}` : ""}${d.ma_don_hang ? ` · ĐH ${d.ma_don_hang}` : ""}`}
                {d.trang_thai === "cho_cap" && d.ly_do_tu_choi ? ` · ↩ ${d.ly_do_tu_choi}` : ""}
                {(d.trang_thai === "tu_choi" || d.trang_thai === "huy") && d.ly_do_tu_choi ? ` · ${d.ly_do_tu_choi}` : ""}
                {d.nguoi_xu_ly && d.trang_thai !== "cho_cap" && (
                  <>
                    {" "}
                    · xử lý: <UserName email={d.nguoi_xu_ly} /> {fmtDate(d.xu_ly_luc)}
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <DeXuatFormModal
          unitId={unitId}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            after();
          }}
        />
      )}
      {capFor && (
        <CapLinhKienModal
          list={capFor}
          onClose={() => setCapFor(null)}
          onDone={() => {
            setCapFor(null);
            after();
          }}
        />
      )}
      {tuChoiFor && (
        <TuChoiDeXuatModal
          dx={tuChoiFor}
          onClose={() => setTuChoiFor(null)}
          onDone={() => {
            setTuChoiFor(null);
            after();
          }}
        />
      )}
      {ktFor && (
        <KtXacNhanDeXuatModal
          list={ktFor}
          onClose={() => setKtFor(null)}
          onDone={() => {
            setKtFor(null);
            after();
          }}
        />
      )}
      {traLaiFor && (
        <KtTraLaiDeXuatModal
          dx={traLaiFor}
          onClose={() => setTraLaiFor(null)}
          onDone={() => {
            setTraLaiFor(null);
            after();
          }}
        />
      )}
    </Section>
  );
}
