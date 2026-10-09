import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, ERROR_MESSAGES } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, Spinner } from "../../ui/primitives";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { DonCha } from "../../lib/types";

// Xac nhan so luong thuc nhan HANG LOAT (09/10/2026: "SL thuc nhan hien = sl gui de giam tai thoi gian
// phai nhap sl cho admin => don nao sai thi moi sua, con lai xac nhan 1 nut la duyet tat ca don").
// O SL dien san = SL KTV khai; chi dong nao sua khac moi bat buoc nhap ly do lech. Bo tick dong nao
// thi dong do khong duoc xac nhan lan nay. `query` = bo loc dang ap tren bang (de chi lay dung cac
// don dang hien thi trong danh sach can xu ly).

interface RowState {
  include: boolean;
  sl: string;
  lyDo: string;
}

export function BulkXacNhanSoLuongModal({ query, onClose, onDone }: { query: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const { nameOf } = useLkName();
  const [list, setList] = useState<DonCha[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ don_cha: DonCha[] }>(`/admin/don-cha?limit=200&offset=0${query ? "&" + query : ""}`)
      .then((r) => {
        setList(r.don_cha);
        setRows(Object.fromEntries(r.don_cha.map((p) => [p.id, { include: true, sl: String(p.so_luong_khai), lyDo: "" }])));
      })
      .catch((e) => {
        toast(errorMessage(e), "error");
        setList([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const set = (id: string, patch: Partial<RowState>) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const info = useMemo(() => {
    let chon = 0;
    let lech = 0;
    let loi = 0;
    for (const p of list || []) {
      const r = rows[p.id];
      if (!r?.include) continue;
      chon++;
      const n = parseInt(r.sl, 10);
      if (!Number.isInteger(n) || n < 1) loi++;
      else if (n !== p.so_luong_khai) {
        lech++;
        if (!r.lyDo.trim()) loi++;
      }
    }
    return { chon, lech, loi };
  }, [list, rows]);

  const allIncluded = !!list && list.length > 0 && list.every((p) => rows[p.id]?.include);
  const toggleAll = (v: boolean) => setRows((prev) => Object.fromEntries(Object.entries(prev).map(([k, r]) => [k, { ...r, include: v }])));

  const submit = async () => {
    if (!list) return;
    const items = list
      .filter((p) => rows[p.id]?.include)
      .map((p) => {
        const n = parseInt(rows[p.id].sl, 10);
        return { id: p.id, so_luong_thuc_nhan: n, ly_do_chenh_lech_sl: n !== p.so_luong_khai ? rows[p.id].lyDo.trim() : undefined };
      });
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; so_don_vi: number; loi: { id: string; error: string }[] }>("/admin/don-cha/xac-nhan-so-luong-hang-loat", { items });
      if (r.loi.length) toast(`Đã xác nhận ${r.ok} đơn (${r.so_don_vi} đơn vị). ${r.loi.length} đơn lỗi: ${r.loi.map((x) => `${x.id} — ${ERROR_MESSAGES[x.error] || x.error}`).join("; ")}`, "error");
      else toast(`Đã xác nhận ${r.ok} đơn, tách thành ${r.so_don_vi} đơn vị.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const slInput = (p: DonCha) => {
    const r = rows[p.id];
    const n = parseInt(r.sl, 10);
    const lech = Number.isInteger(n) && n !== p.so_luong_khai;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <input
          type="number"
          min={1}
          value={r.sl}
          disabled={!r.include}
          onChange={(e) => set(p.id, { sl: e.target.value })}
          className={`w-16 rounded-lg border px-2 py-1.5 text-sm bg-[var(--field-bg)] ${lech ? "border-[var(--amber-500)] font-bold" : "border-[var(--field-border)]"}`}
        />
        {lech && r.include && (
          <input
            value={r.lyDo}
            onChange={(e) => set(p.id, { lyDo: e.target.value })}
            placeholder="Lý do lệch (bắt buộc)"
            className={`flex-1 min-w-[150px] rounded-lg border px-2 py-1.5 text-sm bg-[var(--field-bg)] ${r.lyDo.trim() ? "border-[var(--field-border)]" : "border-[var(--red-500)]"}`}
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      title="Xác nhận số lượng thực nhận hàng loạt"
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      footerActions={
        <>
          <span className="mr-auto text-xs text-[var(--ink-soft)]">
            {info.chon} đơn được chọn{info.lech ? ` · ${info.lech} đơn sửa SL` : ""}
            {info.loi ? <span className="text-[var(--red-700)] font-semibold"> · {info.loi} đơn thiếu lý do / SL sai</span> : null}
          </span>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || info.chon === 0 || info.loi > 0} onClick={submit}>
            ✔ Xác nhận {info.chon} đơn
          </Btn>
        </>
      }
    >
      {list === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="text-center py-8 text-sm text-[var(--ink-faint)]">Không có đơn nào chờ xác nhận số lượng.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink-soft)]">
            Số lượng thực nhận đã điền sẵn bằng số lượng KTV khai. Chỉ sửa những đơn nhận thực tế khác (sẽ phải nhập lý do), rồi bấm <b>Xác nhận</b> một lần cho tất cả.
          </p>
          <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={allIncluded} onChange={(e) => toggleAll(e.target.checked)} />
            Chọn tất cả {list.length} đơn
          </label>
          {isMobile ? (
            <div className="space-y-2">
              {list.map((p) => (
                <div key={p.id} className={`rounded-xl border border-[var(--line)] p-3 space-y-1.5 ${rows[p.id].include ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-5 h-5" checked={rows[p.id].include} onChange={(e) => set(p.id, { include: e.target.checked })} />
                    <span className="font-mono text-xs font-semibold text-[var(--link)]">{p.id}</span>
                    <Badge tone="gray">Khai {p.so_luong_khai}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{nameOf(p.ma_lk)}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    <UserName email={p.ktv} /> · {p.mo_ta_loi}
                  </p>
                  {slInput(p)}
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface-2)] border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
                    <th className="px-2 py-2" />
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">SL thực nhận</th>
                    <th className="text-left px-3 py-2">SL khai</th>
                    <th className="text-left px-3 py-2">Người gửi</th>
                    <th className="text-left px-3 py-2">Linh kiện</th>
                    <th className="text-left px-3 py-2">Mô tả lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className={`border-b border-[var(--line)] last:border-0 ${rows[p.id].include ? "" : "opacity-50"}`}>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={rows[p.id].include} onChange={(e) => set(p.id, { include: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-[var(--link)] whitespace-nowrap">{p.id}</td>
                      <td className="px-3 py-2 min-w-[90px]">{slInput(p)}</td>
                      <td className="px-3 py-2 text-center">{p.so_luong_khai}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <UserName email={p.ktv} />
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={nameOf(p.ma_lk)}>
                        {nameOf(p.ma_lk)}
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={p.mo_ta_loi || ""}>
                        {p.mo_ta_loi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
