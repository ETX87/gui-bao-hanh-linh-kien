import { useState } from "react";
import { Modal } from "../../ui/Modal";
import { Badge, Btn, Input, Textarea, Field } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { api, errorMessage } from "../../lib/api";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { fmtDate } from "../../lib/format";
import type { DeXuatLk } from "../../lib/types";

// 16/11/2026 - Tru cong no sua chua cho NV sua chua (backend routes/deXuat.ts POST /xac-nhan-tieu-hao, lib/truCongNo.ts). Nguyen van chot:
// "1. Thất lạc có trừ hay không sẽ cho admin BH lựa chọn 2. Có 3. trừ luôn cho nv sửa chữa, xác sẽ tiếp tục theo dõi đến khi trả xác thành
// công cho đối tác (hoặc hủy xác theo quy trình) 4. Admin BH xác nhận ... 6. Diễn giải MISA tương tự đơn phân loại: trừ công nợ".

export const XAC_KQ_TIEU_HAO: { value: string; label: string; hint: string }[] = [
  { value: "tra_doi_tac", label: "Trả đối tác", hint: "Vào danh sách chờ gom thùng trả xác" },
  { value: "luu_kho", label: "Lưu kho", hint: "Giữ xác tại kho" },
  { value: "tieu_huy", label: "Tiêu huỷ", hint: "" },
  { value: "khong_co", label: "Không có xác", hint: "" },
  { value: "that_lac", label: "Xác thất lạc", hint: "Admin chọn có trừ công nợ NV hay không" },
  { value: "ngoai", label: "Đã trả ngoài hệ thống", hint: "Tính như trả thành công" },
];
export const XAC_KQ_TIEU_HAO_NHAN: Record<string, string> = Object.fromEntries(XAC_KQ_TIEU_HAO.map((x) => [x.value, x.label]));

const tone = (b: string | null | undefined): "green" | "amber" | "red" | "gray" => (b === "xong" ? "green" : b === "dong" ? "red" : b ? "amber" : "gray");

// Lan cap qua app Dat LK ma NV da nhan, chua xac nhan tieu hao.
// 16/11/2026 (v1.142): "Chỉ có đơn CÔNG NỢ SỬA CHỮA mới cần lên đơn trừ công nợ" - lan cap HỖ TRỢ SỬA CHỮA 0 ĐỒNG / MUA HÀNG SỬA CHỮA khong xac nhan.
export const laCongNoSc = (d: DeXuatLk) => !d.lk_loai || d.lk_loai === "CÔNG NỢ SỬA CHỮA";
export const choXacNhanTieuHao = (d: DeXuatLk) => d.trang_thai === "lien_ket" && d.lk_buoc === "xong" && !d.xn_luc && laCongNoSc(d);
// Sua / huy xac nhan duoc khi don tru / tra chua duoc Ke toan chot va xac chua vao thung (backend kiem tra lai).
export const suaXacNhanDuoc = (d: DeXuatLk) =>
  !!d.xn_luc && d.tru_buoc !== "xong" && d.tra_buoc !== "xong" && !d.thung_xac_id && d.xac_tt !== "trong_thung" && d.xac_tt !== "da_tra";

// Dong tinh trang tru cong no 1 lan cap (dung o UI chi tiet don, man Cap linh kien, man Linh kien cua toi).
export function CongNoTag({ d }: { d: DeXuatLk }) {
  if (d.trang_thai !== "lien_ket") return null;
  if (!laCongNoSc(d)) return <Badge tone="gray">{d.lk_loai} — không trừ công nợ</Badge>;
  if (!d.xn_luc) {
    return d.lk_buoc === "xong" ? <Badge tone="amber">Chờ Admin xác nhận tiêu hao (nhận {d.so_luong})</Badge> : null;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-[11px]">
      <span className="text-[var(--ink-soft)]">
        Nhận {d.so_luong} · Dùng <b>{d.sl_dung ?? 0}</b>
        {(d.sl_tra ?? 0) > 0 ? <> · Trả kho <b>{d.sl_tra}</b></> : null} · Xác: {XAC_KQ_TIEU_HAO_NHAN[d.xac_kq ?? ""] ?? "—"}
        {d.xac_kq === "that_lac" ? (d.tru_that_lac ? " (vẫn trừ)" : " (không trừ — NV còn chịu)") : ""}
      </span>
      {(d.sl_tru ?? 0) > 0 && (
        <span title={d.tru_ddh_id ? `Đơn ${d.tru_ddh_id} bên app Đặt linh kiện` : "Chưa tạo đơn"}>
          <Badge tone={tone(d.tru_buoc)}>Trừ CN {d.sl_tru}: {d.tru_ddh_id ? `${d.tru_nhan ?? "đã tạo"} · ${d.tru_ddh_id}` : "chờ tạo đơn"}</Badge>
        </span>
      )}
      {(d.sl_tra ?? 0) > 0 && (
        <span title={d.tra_ddh_id ? `Đơn ${d.tra_ddh_id} bên app Đặt linh kiện` : "Chưa tạo đơn"}>
          <Badge tone={tone(d.tra_buoc)}>Trả kho {d.sl_tra}: {d.tra_ddh_id ? `${d.tra_nhan ?? "đã tạo"} · ${d.tra_ddh_id}` : "chờ tạo đơn"}</Badge>
        </span>
      )}
      {d.cn_loi && <span className="text-[var(--red-700,#b91c1c)]">⚠ {d.cn_loi}</span>}
      {d.xn_boi && (
        <span className="text-[var(--ink-faint)]">
          · xác nhận: <UserName email={d.xn_boi} /> {fmtDate(d.xn_luc)}
        </span>
      )}
    </span>
  );
}

// Nut thao tac Admin sau khi xac nhan: tru cong no xac that lac / gui lai don loi.
export function CongNoNut({ d, onDone }: { d: DeXuatLk; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const goi = async (url: string, ok: string) => {
    setBusy(true);
    try {
      const r = await api.post<{ loi?: string | null }>(url, {});
      toast(r.loi ? `Chưa tạo được đơn: ${r.loi}` : ok, r.loi ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const [sua, setSua] = useState(false);
  const canTruTl = d.xac_kq === "that_lac" && d.tru_that_lac === 0 && (d.sl_dung ?? 0) > 0;
  const canSua = suaXacNhanDuoc(d);
  const huy = async () => {
    const lyDo = window.prompt(`Hủy xác nhận tiêu hao ${d.id}? Đơn trừ / trả công nợ bên app Đặt linh kiện sẽ hủy theo, lần cấp về "Chờ xác nhận".\nLý do:`);
    if (!lyDo?.trim()) return;
    setBusy(true);
    try {
      await api.post(`/de-xuat/${d.id}/huy-tieu-hao`, { ly_do: lyDo.trim() });
      toast("Đã hủy xác nhận tiêu hao.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const canGuiLai = !!d.xn_luc && (!!d.cn_loi || d.tru_buoc === "dong" || d.tra_buoc === "dong" || ((d.sl_tru ?? 0) > 0 && !d.tru_ddh_id) || ((d.sl_tra ?? 0) > 0 && !d.tra_ddh_id));
  if (!canTruTl && !canGuiLai && !canSua) return null;
  return (
    <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      {canSua && (
        <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setSua(true)} title="Sửa số đã dùng / xác — trước khi Kế toán chốt">
          ✎ Sửa xác nhận
        </Btn>
      )}
      {canSua && (
        <Btn size="sm" variant="ghost" disabled={busy} onClick={huy} className="!text-[var(--red-600)]" title="Hủy xác nhận — đơn trừ / trả bên app Đặt linh kiện hủy theo">
          ✕ Hủy xác nhận
        </Btn>
      )}
      {sua && <XacNhanTieuHaoModal list={[d]} sua onClose={() => setSua(false)} onDone={() => { setSua(false); onDone(); }} />}
      {canTruTl && (
        <Btn size="sm" variant="ghost" disabled={busy} onClick={() => window.confirm(`Trừ công nợ NV ${d.sl_dung} linh kiện (xác thất lạc ${d.id})?`) && goi(`/de-xuat/${d.id}/tru-that-lac`, "Đã tạo đơn trừ công nợ.")}>
          Trừ công nợ (thất lạc)
        </Btn>
      )}
      {canGuiLai && (
        <Btn size="sm" variant="ghost" disabled={busy} onClick={() => goi(`/de-xuat/${d.id}/gui-lai-tru`, "Đã gửi lại sang app Đặt linh kiện.")}>
          ↻ Gửi lại
        </Btn>
      )}
    </span>
  );
}

interface DongNhap {
  sl_dung: string;
  xac: string;
  tru_that_lac: boolean;
}

// Admin BH xac nhan tieu hao 1 hoac nhieu lan cap.
// sua = sua xac nhan da co (1 lan cap, v1.142): huy don tru / tra cu ben app Dat LK + tao lai theo so moi (POST /de-xuat/:id/sua-tieu-hao).
export function XacNhanTieuHaoModal({ list, onClose, onDone, sua }: { list: DeXuatLk[]; onClose: () => void; onDone: () => void; sua?: boolean }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [nhap, setNhap] = useState<Record<string, DongNhap>>(() =>
    Object.fromEntries(list.map((d) => [d.id, sua ? { sl_dung: String(d.sl_dung ?? d.so_luong), xac: d.xac_kq || "tra_doi_tac", tru_that_lac: !!d.tru_that_lac } : { sl_dung: String(d.so_luong), xac: "tra_doi_tac", tru_that_lac: false }])),
  );
  const [ghiChu, setGhiChu] = useState(sua ? list[0]?.xn_ghi_chu || "" : "");
  const [busy, setBusy] = useState(false);
  const set = (id: string, patch: Partial<DongNhap>) => setNhap((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const apTatCa = (xac: string) => setNhap((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, xac }])));
  const loiDong = (d: DeXuatLk) => {
    const n = Number(nhap[d.id].sl_dung);
    return !Number.isInteger(n) || n < 0 || n > d.so_luong ? `0–${d.so_luong}` : null;
  };
  const coLoi = list.some(loiDong);
  const tinh = (d: DeXuatLk) => {
    const v = nhap[d.id];
    const dung = Number(v.sl_dung) || 0;
    const xac = dung === 0 ? "khong_co" : v.xac;
    return { dung, tra: d.so_luong - dung, tru: xac === "that_lac" && !v.tru_that_lac ? 0 : dung, xac };
  };
  const tong = list.reduce((a, d) => { const t = tinh(d); return { tru: a.tru + t.tru, tra: a.tra + t.tra }; }, { tru: 0, tra: 0 });
  const submit = async () => {
    setBusy(true);
    if (sua) {
      try {
        const d = list[0];
        const r = await api.post<{ loi_tao_don: string | null }>(`/de-xuat/${d.id}/sua-tieu-hao`, { sl_dung: Number(nhap[d.id].sl_dung), xac: tinh(d).xac, tru_that_lac: nhap[d.id].tru_that_lac, ghi_chu: ghiChu.trim() || undefined });
        toast(r.loi_tao_don ? `Đã sửa — chưa tạo lại được đơn: ${r.loi_tao_don}` : "Đã sửa xác nhận, đơn trừ / trả công nợ đã tạo lại.", r.loi_tao_don ? "error" : "ok");
        onDone();
      } catch (e) {
        toast(errorMessage(e), "error");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[]; loi_tao_don: { id: string; cn_loi: string }[] }>("/de-xuat/xac-nhan-tieu-hao", {
        items: list.map((d) => ({ id: d.id, sl_dung: Number(nhap[d.id].sl_dung), xac: tinh(d).xac, tru_that_lac: nhap[d.id].tru_that_lac, ghi_chu: ghiChu.trim() || undefined })),
      });
      const msg = [`Đã xác nhận ${r.ok} lần cấp`, r.loi.length ? `${r.loi.length} lỗi (${r.loi.map((x) => `${x.id}: ${x.error}`).join(", ")})` : "", r.loi_tao_don.length ? `${r.loi_tao_don.length} chưa tạo được đơn trừ công nợ — ${r.loi_tao_don[0].cn_loi}` : ""].filter(Boolean).join(" · ");
      toast(msg, r.loi.length || r.loi_tao_don.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={sua ? `Sửa xác nhận tiêu hao ${list[0]?.id}` : `Xác nhận tiêu hao linh kiện (${list.length} lần cấp)`}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      footerActions={
        <>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || coLoi} onClick={submit}>
            {busy ? "Đang gửi…" : `Xác nhận — trừ công nợ ${tong.tru}${tong.tra ? ` · trả kho ${tong.tra}` : ""}`}
          </Btn>
        </>
      }
    >
      <div className="space-y-2 text-sm">
        <p className="text-xs text-[var(--ink-soft)]">
          Nhập số linh kiện NV đã dùng và tình trạng xác. Hệ thống tự tạo bên app Đặt linh kiện: đơn <b>"TRỪ CÔNG NỢ - SỬA CHỮA"</b> (số đã dùng, 0đ — Kế toán chốt để trừ công nợ NV) và đơn <b>"TRẢ HÀNG CÔNG NỢ - SỬA CHỮA"</b> cho số còn dư (NV trả kho). Xác "Trả đối tác" vào danh sách chờ gom ở màn Trả xác.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold">Áp xác cho tất cả:</span>
          {XAC_KQ_TIEU_HAO.map((x) => (
            <button key={x.value} type="button" onClick={() => apTatCa(x.value)} className="rounded-full border border-[var(--line)] px-2 py-0.5 hover:bg-[var(--surface-2)]">
              {x.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
          <table className="tbl w-full whitespace-nowrap text-xs">
            <thead className="bg-[var(--surface-2)] text-left">
              <tr><th>Lần cấp</th><th>Linh kiện</th><th className="text-right">Nhận</th><th>Đã dùng</th><th>Xác</th><th>Kết quả</th></tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const v = nhap[d.id];
                const t = tinh(d);
                return (
                  <tr key={d.id}>
                    <td>
                      <span className="font-mono font-semibold text-[var(--link)]">{d.id}</span>
                      <span className="block text-[10px] text-[var(--ink-faint)]">{d.unit_id}{d.lk_ddh_id ? ` · ${d.lk_ddh_id}` : ""}</span>
                    </td>
                    <td className="max-w-[240px] truncate" title={nameOf(d.ma_lk)}>{nameOf(d.ma_lk)}</td>
                    <td className="text-right font-semibold">{d.so_luong}</td>
                    <td>
                      <Input type="number" min={0} max={d.so_luong} value={v.sl_dung} onChange={(e) => set(d.id, { sl_dung: e.target.value })} className={`!w-20 ${loiDong(d) ? "!border-[var(--red-600,#dc2626)]" : ""}`} />
                    </td>
                    <td>
                      {t.dung === 0 ? (
                        <span className="text-[var(--ink-faint)]">Không có xác</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <select value={v.xac} onChange={(e) => set(d.id, { xac: e.target.value })} className="rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-1.5 py-1 text-xs">
                            {XAC_KQ_TIEU_HAO.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                          </select>
                          {v.xac === "that_lac" && (
                            <label className="inline-flex items-center gap-1">
                              <input type="checkbox" checked={v.tru_that_lac} onChange={(e) => set(d.id, { tru_that_lac: e.target.checked })} /> Vẫn trừ công nợ NV
                            </label>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="text-[var(--ink-soft)]">
                      Trừ CN <b className="text-[var(--ink)]">{t.tru}</b>
                      {t.tra > 0 && <> · Trả kho <b className="text-[var(--ink)]">{t.tra}</b></>}
                      {loiDong(d) && <span className="ml-1 text-[var(--red-700,#b91c1c)]">SL {loiDong(d)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Field label="Ghi chú (tuỳ chọn, áp cho tất cả)">
          <Textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
