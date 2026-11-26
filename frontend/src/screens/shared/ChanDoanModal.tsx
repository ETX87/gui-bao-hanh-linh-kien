import { useEffect, useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, ApiError, errorMessage } from "../../lib/api";
import { useLkName } from "../../hooks/useLinhKien";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { KET_QUA_NV_OPTIONS } from "../../lib/constants";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DeXuatLk, DonVi } from "../../lib/types";
import type { ThieuHangRow } from "./ThieuHang";

// NV nop ket qua chan doan - anh truoc/sau/loi thuc te luu base64 data URL truc tiep (KHONG dung R2 -
// quyet dinh da chot cho he nay). Anh KHONG bat buoc (form goc chua tung danh dau bat buoc - xem
// CLAUDE.md muc QA 31/08/2026, con lai la cau hoi nghiep vu chua chot).

async function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(Array.from(files).map(fileToDataUrl));
}

export function ChanDoanModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(unit.updated_at, "cho_chan_doan");
  const [ketQua, setKetQua] = useState("");
  const [anhTruoc, setAnhTruoc] = useState<FileList | null>(null);
  const [anhSau, setAnhSau] = useState<FileList | null>(null);
  const [anhLoi, setAnhLoi] = useState<FileList | null>(null);
  const [lyDoCham, setLyDoCham] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  // 12/10/2026: de xuat linh kien con "cho cap" se tu huy khi nop ket qua - bao truoc cho NV.
  const [soChoCap, setSoChoCap] = useState(0);
  // 16/11/2026 (v1.140): lan cap qua app Dat LK NV chua bam "Đã nhận" -> dong don se tu xac nhan da nhan du (hoi truoc).
  const [chuaNhan, setChuaNhan] = useState<DeXuatLk[]>([]);
  const [canhBaoNhan, setCanhBaoNhan] = useState<{ banGiao: boolean } | null>(null);
  const { nameOf } = useLkName();
  // 26/11/2026 (v1.165): linh kien bao thieu DA VE ma chua de xuat dung ma -> nhac + bat buoc ly do khong su dung (backend 409 LK_DA_VE_CHUA_DUNG).
  const [lkVe, setLkVe] = useState<ThieuHangRow[]>([]);
  const [lyDoKhongDung, setLyDoKhongDung] = useState("");
  const taiLkVe = () =>
    api
      .get<{ rows: ThieuHangRow[] }>(`/thieu-hang/don-vi/${encodeURIComponent(unit.id)}`)
      .then((r) => setLkVe(r.rows.filter((x) => x.cho_de_xuat)))
      .catch(() => undefined);
  useEffect(() => {
    taiLkVe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);
  const thieuLyDo = lkVe.length > 0 && lyDoKhongDung.trim().length < 5;
  useEffect(() => {
    api
      .get<{ de_xuat: DeXuatLk[] }>(`/de-xuat/don-vi/${unit.id}`)
      .then((r) => {
        setSoChoCap(r.de_xuat.filter((d) => d.trang_thai === "cho_cap").length);
        setChuaNhan(r.de_xuat.filter((d) => d.trang_thai === "lien_ket" && d.lk_ddh_id && !["xong", "dong"].includes(d.lk_buoc ?? "")));
      })
      .catch(() => undefined);
  }, [unit.id]);

  const [xacNhanBanGiao, setXacNhanBanGiao] = useState(false);

  const submit = async (banGiao = false, tuXacNhan = false) => {
    if (chuaNhan.length && !tuXacNhan) {
      setCanhBaoNhan({ banGiao });
      return;
    }
    setBusy(true);
    try {
      const [anh_truoc, anh_sau, anh_loi_thuc_te] = await Promise.all([filesToDataUrls(anhTruoc), filesToDataUrls(anhSau), filesToDataUrls(anhLoi)]);
      const r = await api.post<{ phieu_tra_id?: string | null }>(`/nv/don-vi/${unit.id}/chan-doan`, { ket_qua_chan_doan: banGiao ? "da_sua_xong" : ketQua, ban_giao: banGiao || undefined, anh_truoc, anh_sau, anh_loi_thuc_te, ly_do_cham: overdue ? lyDoCham : undefined, ghi_chu: ghiChu.trim() || undefined, tu_xac_nhan_nhan: tuXacNhan || undefined, ly_do_khong_dung_lk: lkVe.length ? lyDoKhongDung.trim() : undefined });
      setXacNhanBanGiao(false);
      setCanhBaoNhan(null);
      toast(banGiao ? "Đã bàn giao máy — đơn đã kết thúc." : r.phieu_tra_id ? `Đã nộp kết quả — đã đẩy thẳng sang Kho (phiếu trả ${r.phieu_tra_id}).` : "Đã nộp kết quả sửa chữa.", "ok");
      onDone();
    } catch (e) {
      // Danh sach tren may chua kip cap nhat (NV vua duoc giao linh kien) -> hoi lai.
      if (e instanceof ApiError && e.code === "CHUA_XAC_NHAN_NHAN" && !tuXacNhan) setCanhBaoNhan({ banGiao });
      else if (e instanceof ApiError && e.code === "LK_DA_VE_CHUA_DUNG") {
        setCanhBaoNhan(null);
        setXacNhanBanGiao(false);
        taiLkVe();
        toast("Còn linh kiện báo thiếu đã về chưa được sử dụng — ghi lý do không sử dụng rồi nộp lại.", "error");
      } else toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const valid = ketQua && (!overdue || lyDoCham) && !thieuLyDo;
  const validBanGiao = (!overdue || lyDoCham) && !thieuLyDo;

  return (
    <Modal
      title={`Nộp kết quả sửa chữa — ${unit.id}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="success" disabled={!validBanGiao || busy} onClick={() => setXacNhanBanGiao(true)} title="Máy đã sửa xong và đã giao lại — kết thúc toàn bộ quy trình">
            ✔ Đã bàn giao máy (kết thúc luôn)
          </Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={() => submit(false)}>
            Nộp kết quả
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <LyDoChamGateField gd="cho_chan_doan" overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        {lkVe.length > 0 && (
          <div className="rounded-lg border border-[var(--red-200)] bg-[var(--red-50)] px-3 py-2 space-y-2">
            <p className="text-[13px] font-semibold text-[var(--red-700)]">
              ⚠ Linh kiện báo thiếu đã được đặt về nhưng đơn chưa đề xuất sử dụng:{" "}
              {lkVe.map((x) => `${x.ten_lk || nameOf(x.ma_lk)} × ${x.so_luong}${x.ticket_id ? ` (${x.ticket_id})` : ""}`).join(", ")}.
            </p>
            <p className="text-xs text-[var(--ink-body)]">
              Nếu cần dùng: bấm Huỷ, vào khối Đề xuất linh kiện bấm "+ Đề xuất linh kiện" (đã điền sẵn mã đã về). Nếu không dùng: ghi rõ lý do bên dưới —
              lý do được lưu vào nhật ký đơn để Admin BH / Kho nắm.
            </p>
            <Field label="Lý do không sử dụng linh kiện đã về" required>
              <Textarea rows={2} value={lyDoKhongDung} onChange={(e) => setLyDoKhongDung(e.target.value)} placeholder="VD: Kiểm tra lại lỗi do dây nguồn, không cần thay bo mạch" />
            </Field>
          </div>
        )}
        <Field label="Kết quả" required>
          <Select value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            <option value="">— Chọn —</option>
            {KET_QUA_NV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú">
          <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Linh kiện đã thay, nguyên nhân lỗi, lưu ý cho Admin / Kho…" />
        </Field>
        {chuaNhan.length > 0 && (
          <p className="rounded-lg bg-[var(--amber-100)] px-3 py-2 text-xs font-semibold text-[var(--amber-800)]">
            ⚠ Còn {chuaNhan.length} lần cấp linh kiện NV chưa xác nhận "Đã nhận" — nên bấm "✔ Đã nhận" ở khối Đề xuất linh kiện trước khi đóng đơn.
            Nếu nộp luôn, hệ thống sẽ tự động xác nhận tất cả linh kiện đã nhận đủ.
          </p>
        )}
        {soChoCap > 0 && (
          <p className="rounded-lg bg-[var(--amber-100)] px-3 py-2 text-xs font-semibold text-[var(--amber-800)]">
            Còn {soChoCap} đề xuất linh kiện chưa được cấp — nộp kết quả sẽ tự huỷ các đề xuất này.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
          <Field label="Ảnh trước sửa">
            <ImagePicker compact onChange={setAnhTruoc} />
          </Field>
          <Field label="Ảnh sau sửa">
            <ImagePicker compact onChange={setAnhSau} />
          </Field>
          <Field label="Ảnh lỗi thực tế">
            <ImagePicker compact onChange={setAnhLoi} />
          </Field>
        </div>
      </div>
      {canhBaoNhan && (
        <Modal
          title="Linh kiện chưa xác nhận đã nhận"
          onClose={() => setCanhBaoNhan(null)}
          maxWidthClass="max-w-md"
          footerActions={
            <>
              <Btn onClick={() => setCanhBaoNhan(null)}>Quay lại</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => submit(canhBaoNhan.banGiao, true)}>
                {busy ? "Đang lưu…" : "Tự xác nhận đã nhận đủ & đóng đơn"}
              </Btn>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-[var(--amber-100)] px-3 py-2 font-semibold text-[var(--amber-800)]">
              ⚠ NV chưa xác nhận đã nhận {chuaNhan.length} lần cấp linh kiện của đơn {unit.id}.
            </p>
            <ul className="list-disc pl-5 text-xs space-y-0.5">
              {chuaNhan.map((d) => (
                <li key={d.id}><span className="font-mono">{d.id}</span> · {nameOf(d.ma_lk)} ×{d.so_luong} · {d.lk_nhan || "đang cấp"}</li>
              ))}
            </ul>
            <p>Đóng đơn lúc này, hệ thống sẽ <b>tự động xác nhận tất cả các linh kiện trên đều đã nhận đủ</b> (ghi nhật ký "tự động xác nhận" bên app Đặt linh kiện).</p>
            <p className="text-xs text-[var(--ink-soft)]">Lần cấp Kho chưa gửi thì không tự xác nhận được — hệ thống sẽ báo, chờ Kho gửi hoặc huỷ lần cấp rồi nộp lại.</p>
          </div>
        </Modal>
      )}
      {xacNhanBanGiao && (
        <Modal
          title="Xác nhận đã bàn giao máy"
          onClose={() => setXacNhanBanGiao(false)}
          maxWidthClass="max-w-md"
          footerActions={
            <>
              <Btn onClick={() => setXacNhanBanGiao(false)}>Quay lại</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => submit(true)}>
                {busy ? "Đang lưu…" : "Xác nhận kết thúc"}
              </Btn>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-[var(--red-100)] px-3 py-2 font-semibold text-[var(--red-700)]">
              ⚠ Xác nhận này sẽ KẾT THÚC TẤT CẢ luồng quy trình của đơn {unit.id}.
            </p>
            <p>Máy này sẽ được tính là <b>đã sửa xong</b> và <b>đã bàn giao xong</b> — không qua Admin xác nhận, Kế toán duyệt hay Kho gửi trả nữa.</p>
            {soChoCap > 0 && <p className="text-[var(--amber-800)]">{soChoCap} đề xuất linh kiện chưa cấp sẽ tự huỷ.</p>}
            <p className="text-[var(--ink-soft)]">Bạn có chắc chắn không?</p>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
