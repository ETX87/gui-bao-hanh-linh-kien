import { useEffect, useMemo, useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, ApiError, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Textarea, SectionLabel, Spinner } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useLinhKien, lkOptions } from "../../hooks/useLinhKien";
import { CaseIdField } from "../shared/CaseLookupPreviewCard";
import type { KtvLienHe } from "../../lib/types";

// 14/11/2026 - "Tạo đơn thủ công" của Admin BH: 2 lựa chọn (yêu cầu nguyên văn trong CLAUDE.md mục cùng tên):
//  - Tạo hộ KTV: chọn KTV trong danh bạ -> tạo thùng hộ (POST /phieu-gui {ktv_email}) rồi mở chi tiết thùng để thêm đơn
//    (thùng Admin BH tạo hộ bỏ qua Kho khi xác nhận gửi - v1.035).
//  - Khách lẻ / NPP: chọn lại khách từ danh bạ khach_hang_bh hoặc tạo mới, rồi tạo đơn dịch vụ (POST /admin/don-dich-vu).

export interface KhachHang {
  id: string;
  loai: "npp" | "kh_le";
  ten: string;
  sdt: string;
  dia_chi: string;
  ghi_chu?: string;
  so_don?: number;
}

export const LOAI_KH_LABEL: Record<string, string> = { npp: "Nhà phân phối", kh_le: "Khách lẻ" };

const KH_ERR: Record<string, string> = {
  KH_TRUNG_SDT: "Số điện thoại này đã có trong danh bạ — chọn lại khách đó từ danh sách.",
  MISSING_TEN: "Chưa nhập tên khách hàng.",
  MISSING_SDT: "Chưa nhập số điện thoại.",
  KH_NOT_FOUND: "Không tìm thấy khách hàng trong danh bạ.",
};
const khErr = (e: unknown) => (e instanceof ApiError && KH_ERR[e.code]) || errorMessage(e);

type Mode = "ktv" | "kh";

export function DonDichVuModal({ onClose, onDone, onKtvThung }: { onClose: () => void; onDone: () => void; onKtvThung?: (guiId: string) => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("kh");
  const [busy, setBusy] = useState(false);

  // --- Tạo hộ KTV ---
  const [ktvList, setKtvList] = useState<KtvLienHe[] | null>(null);
  const [ktvEmail, setKtvEmail] = useState("");
  useEffect(() => {
    if (mode !== "ktv" || ktvList) return;
    api
      .get<{ ktv: KtvLienHe[] }>("/ktv-lien-he")
      .then((r) => setKtvList(r.ktv.filter((k) => !!k.email_dang_nhap)))
      .catch((e) => {
        toast(errorMessage(e), "error");
        setKtvList([]);
      });
  }, [mode, ktvList, toast]);
  const ktvOptions = useMemo(() => {
    const seen = new Set<string>();
    return (ktvList || [])
      .filter((k) => {
        const e = k.email_dang_nhap!.toLowerCase();
        if (seen.has(e)) return false;
        seen.add(e);
        return true;
      })
      .map((k) => ({ value: k.email_dang_nhap!, label: k.ten_hien_thi || k.ma_ktv, hint: [k.vai_tro_ktv, k.khu_vuc_ma].filter(Boolean).join(" · ") }));
  }, [ktvList]);

  const taoThungHo = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ id: string }>("/phieu-gui", { ktv_email: ktvEmail });
      toast(`Đã tạo thùng ${r.id} cho KTV — thêm đơn vào thùng.`, "ok");
      onKtvThung?.(r.id);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // --- Khách lẻ / NPP ---
  const { items: linhKien } = useLinhKien();
  const [khList, setKhList] = useState<KhachHang[] | null>(null);
  const [khLoai, setKhLoai] = useState<"tat_ca" | "npp" | "kh_le">("tat_ca");
  const [khId, setKhId] = useState("");
  const [taoMoi, setTaoMoi] = useState(false);
  const [moi, setMoi] = useState({ loai: "kh_le" as "npp" | "kh_le", ten: "", sdt: "", dia_chi: "" });
  const [caseId, setCaseId] = useState("");
  const [sanPham, setSanPham] = useState("");
  const [maLk, setMaLk] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [moTa, setMoTa] = useState("");
  const [anhFiles, setAnhFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (mode !== "kh" || khList) return;
    api
      .get<{ khach_hang: KhachHang[] }>("/khach-hang")
      .then((r) => {
        setKhList(r.khach_hang);
        if (r.khach_hang.length === 0) setTaoMoi(true);
      })
      .catch((e) => {
        toast(errorMessage(e), "error");
        setKhList([]);
      });
  }, [mode, khList, toast]);

  const khOptions = useMemo(
    () =>
      (khList || [])
        .filter((k) => khLoai === "tat_ca" || k.loai === khLoai)
        .map((k) => ({ value: k.id, label: `${k.ten} — ${k.sdt}`, hint: `${LOAI_KH_LABEL[k.loai]}${k.so_don ? ` · ${k.so_don} đơn` : ""}` })),
    [khList, khLoai],
  );
  const khChon = khList?.find((k) => k.id === khId) || null;
  const hasCase = caseId.trim().length > 0;
  const khOk = taoMoi ? !!(moi.ten.trim() && moi.sdt.trim()) : !!khChon;
  const validKh = khOk && moTa.trim() && Number(soLuong) >= 1 && (hasCase || sanPham.trim());
  const lyDoKhoa = !khOk
    ? taoMoi
      ? "Nhập tên + SĐT khách mới."
      : "Chọn khách hàng / NPP trong danh sách (hoặc bấm Tạo mới)."
    : !hasCase && !sanPham.trim()
      ? "Chưa có mã case thì phải nhập Sản phẩm bảo hành."
      : !moTa.trim()
        ? "Chưa nhập mô tả lỗi."
        : Number(soLuong) < 1
          ? "Số lượng phải ≥ 1."
          : "";

  const taoDonKh = async () => {
    setBusy(true);
    try {
      let id = khId;
      let kh = khChon;
      if (taoMoi) {
        const r = await api.post<KhachHang>("/khach-hang", moi);
        id = r.id;
        kh = r;
        setKhList((l) => (l ? [r, ...l] : [r]));
        setKhId(r.id);
        setTaoMoi(false);
      }
      const anh = anhFiles && anhFiles.length > 0 ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      const r = await api.post<{ id: string }>("/admin/don-dich-vu", {
        khach_hang_id: id,
        case_id: caseId.trim() || null,
        ten_khach_hang: kh?.ten || "",
        sdt_khach_hang: kh?.sdt || "",
        dia_chi_khach_hang: kh?.dia_chi || "",
        san_pham_bh: sanPham.trim(),
        ma_lk: maLk || null,
        so_luong: Number(soLuong),
        mo_ta_loi: moTa.trim(),
        anh,
      });
      toast(`Đã tạo đơn ${r.id} cho ${kh?.ten || "khách"}.`, "ok");
      onDone();
    } catch (e) {
      toast(khErr(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const tabCls = (on: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${on ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`;

  return (
    <Modal
      title="Tạo đơn bảo hành thủ công"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footerActions={
        mode === "ktv" ? (
          <>
            <Btn onClick={onClose}>Huỷ</Btn>
            <Btn variant="primary" disabled={!ktvEmail || busy} onClick={taoThungHo}>
              {busy ? "Đang tạo…" : "Tạo thùng hộ & thêm đơn"}
            </Btn>
          </>
        ) : (
          <>
            {lyDoKhoa && <span className="mr-auto text-xs text-[var(--amber-700,#b45309)]">⚠ {lyDoKhoa}</span>}
            <Btn onClick={onClose}>Huỷ</Btn>
            <Btn variant="primary" disabled={!validKh || busy} onClick={taoDonKh}>
              {busy ? "Đang tạo…" : "Tạo đơn"}
            </Btn>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
          <button type="button" className={tabCls(mode === "kh")} onClick={() => setMode("kh")}>
            🧾 Khách lẻ / NPP
          </button>
          <button type="button" className={tabCls(mode === "ktv")} onClick={() => setMode("ktv")}>
            👷 Tạo hộ KTV
          </button>
        </div>

        {mode === "ktv" ? (
          <>
            <p className="text-xs text-[var(--ink-soft)]">
              Chọn KTV → hệ thống tạo 1 thùng hộ cho KTV đó và mở chi tiết thùng để thêm đơn (chọn đơn Odoo hoặc nhập mã case). Thùng Admin BH tạo hộ khi
              xác nhận gửi sẽ bỏ qua bước Kho, vào thẳng phân loại.
            </p>
            <Field label="KTV" required>
              {ktvList === null ? (
                <Spinner />
              ) : ktvOptions.length === 0 ? (
                <p className="text-xs text-[var(--red-600)]">Không có KTV nào trong danh bạ.</p>
              ) : (
                <SearchableSelect allowEmpty={false} placeholder="Gõ tên hoặc mã KTV để tìm…" options={ktvOptions} value={ktvEmail} onChange={setKtvEmail} />
              )}
            </Field>
          </>
        ) : (
          <>
            <SectionLabel>Khách hàng / Nhà phân phối</SectionLabel>
            {khList === null ? (
              <Spinner />
            ) : taoMoi ? (
              <div className="space-y-3 rounded-xl border border-dashed border-[var(--brand-300,#86efac)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">＋ Khách mới (lưu vào danh bạ)</span>
                  {khList.length > 0 && (
                    <button type="button" className="text-xs text-[var(--link)] underline" onClick={() => setTaoMoi(false)}>
                      ← Chọn lại từ danh sách
                    </button>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  {(["kh_le", "npp"] as const).map((l) => (
                    <label key={l} className="flex items-center gap-1.5">
                      <input type="radio" checked={moi.loai === l} onChange={() => setMoi({ ...moi, loai: l })} /> {LOAI_KH_LABEL[l]}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={moi.loai === "npp" ? "Tên nhà phân phối" : "Tên khách hàng"} required>
                    <Input value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} />
                  </Field>
                  <Field label="SĐT" required>
                    <Input value={moi.sdt} inputMode="tel" onChange={(e) => setMoi({ ...moi, sdt: e.target.value })} />
                  </Field>
                </div>
                <Field label="Địa chỉ">
                  <Input value={moi.dia_chi} onChange={(e) => setMoi({ ...moi, dia_chi: e.target.value })} />
                </Field>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {(["tat_ca", "kh_le", "npp"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setKhLoai(l)}
                      className={`rounded-full border px-2.5 py-1 ${khLoai === l ? "border-[var(--accent)] bg-[var(--brand-50,#f0fdf4)] font-semibold text-[var(--accent)]" : "border-[var(--line)]"}`}
                    >
                      {l === "tat_ca" ? "Tất cả" : LOAI_KH_LABEL[l]}
                    </button>
                  ))}
                  <Btn size="sm" className="ml-auto" onClick={() => { setTaoMoi(true); setKhId(""); }}>
                    ＋ Tạo mới
                  </Btn>
                </div>
                <SearchableSelect allowEmpty={false} placeholder="Gõ tên hoặc SĐT để tìm…" options={khOptions} value={khId} onChange={setKhId} />
                {khChon && (
                  <p className="text-xs text-[var(--ink-soft)]">
                    {LOAI_KH_LABEL[khChon.loai]} · {khChon.sdt}
                    {khChon.dia_chi ? ` · ${khChon.dia_chi}` : ""}
                    {khChon.so_don ? ` · đã có ${khChon.so_don} đơn` : ""}
                  </p>
                )}
              </div>
            )}

            <CaseIdField label="Mã case (nếu có — để trống nếu không có case CRM)" caseId={caseId} setCaseId={setCaseId} maLk={maLk} linhKien={linhKien} />
            {!hasCase && (
              <Field label="Sản phẩm bảo hành" required>
                <Input value={sanPham} onChange={(e) => setSanPham(e.target.value)} />
              </Field>
            )}
            <SectionLabel>Linh kiện lỗi</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Linh kiện">
                  <SearchableSelect options={lkOptions(linhKien)} value={maLk} onChange={setMaLk} />
                </Field>
              </div>
              <Field label="Số lượng" required>
                <Input type="number" min={1} value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
              </Field>
            </div>
            <Field label="Mô tả lỗi" required>
              <Textarea rows={2} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
            </Field>
            <Field label="Ảnh linh kiện lỗi (tuỳ chọn)">
              <ImagePicker onChange={setAnhFiles} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
