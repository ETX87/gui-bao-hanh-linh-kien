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
import { normalizeVi } from "../../lib/normalizeVi";

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

  // 14/11/2026 (v1.125): giao dien 95% man hinh, 2 cot - trai chon nguoi (danh sach bam chon + o tim), phai nhap don.
  const [ktvQ, setKtvQ] = useState("");
  const [khQ, setKhQ] = useState("");
  const ktvShown = useMemo(() => {
    const words = normalizeVi(ktvQ.trim()).split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    return (ktvList || []).filter((k) => {
      const e = k.email_dang_nhap!.toLowerCase();
      if (seen.has(e)) return false;
      seen.add(e);
      if (!words.length) return true;
      const hay = normalizeVi([k.ten_hien_thi, k.ma_ktv, k.email_dang_nhap, k.sdt, k.khu_vuc_ma, k.vai_tro_ktv].filter(Boolean).join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [ktvList, ktvQ]);
  const ktvChon = (ktvList || []).find((k) => k.email_dang_nhap === ktvEmail) || null;
  const khShown = useMemo(() => {
    const words = normalizeVi(khQ.trim()).split(/\s+/).filter(Boolean);
    return (khList || []).filter((k) => {
      if (khLoai !== "tat_ca" && k.loai !== khLoai) return false;
      if (!words.length) return true;
      const hay = normalizeVi([k.id, k.ten, k.sdt, k.dia_chi].filter(Boolean).join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [khList, khQ, khLoai]);

  const tabCls = (on: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${on ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`;
  const rowCls = (on: boolean) =>
    `w-full text-left rounded-lg border px-3 py-2 transition ${on ? "border-[var(--accent)] bg-[var(--brand-50,#f0fdf4)] ring-1 ring-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand-300,#86efac)]"}`;
  const panel = "rounded-xl border border-[var(--line)] bg-[var(--surface-2,#f8fafc)] p-3 flex flex-col min-h-0";

  return (
    <Modal
      title="Tạo đơn bảo hành thủ công"
      onClose={onClose}
      maxWidthClass="detail-95"
      footerActions={
        mode === "ktv" ? (
          <>
            {!ktvEmail && <span className="mr-auto text-xs text-[var(--amber-700,#b45309)]">⚠ Chọn 1 KTV trong danh sách bên trái.</span>}
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
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 lg:max-w-md">
          <button type="button" className={tabCls(mode === "kh")} onClick={() => setMode("kh")}>
            🧾 Khách lẻ / NPP
          </button>
          <button type="button" className={tabCls(mode === "ktv")} onClick={() => setMode("ktv")}>
            👷 Tạo hộ KTV
          </button>
        </div>

        {mode === "ktv" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className={panel}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[var(--ink)]">Chọn KTV</span>
                <span className="text-xs text-[var(--ink-soft)]">{ktvList ? `${ktvShown.length} KTV` : ""}</span>
                <Input autoFocus type="search" value={ktvQ} onChange={(e) => setKtvQ(e.target.value)} placeholder="🔍 Tên, mã KTV, SĐT, khu vực… (không dấu)" className="sm:!w-80 sm:ml-auto" />
              </div>
              {ktvList === null ? (
                <Spinner />
              ) : ktvShown.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--ink-soft)]">Không có KTV nào khớp.</p>
              ) : (
                <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" style={{ maxHeight: "calc(95vh - 230px)" }}>
                  {ktvShown.slice(0, 300).map((k) => (
                    <button key={k.email_dang_nhap!} type="button" title={`${k.ten_hien_thi || k.ma_ktv} — ${k.email_dang_nhap}`} className={rowCls(k.email_dang_nhap === ktvEmail)} onClick={() => setKtvEmail(k.email_dang_nhap!)}>
                      <div className="truncate text-sm font-semibold text-[var(--ink)]">{k.ten_hien_thi || k.ma_ktv}</div>
                      <div className="truncate text-xs text-[var(--ink-soft)]">{[k.vai_tro_ktv, k.khu_vuc_ma, k.sdt].filter(Boolean).join(" · ") || k.email_dang_nhap}</div>
                    </button>
                  ))}
                  {ktvShown.length > 300 && <p className="col-span-full text-center text-xs text-[var(--ink-soft)]">Còn {ktvShown.length - 300} KTV — gõ thêm để lọc.</p>}
                </div>
              )}
            </div>
            <div className={panel}>
              <span className="mb-2 text-sm font-bold text-[var(--ink)]">KTV được chọn</span>
              {ktvChon ? (
                <div className="space-y-1.5 text-sm">
                  <div className="text-base font-bold text-[var(--accent)]">{ktvChon.ten_hien_thi || ktvChon.ma_ktv}</div>
                  <div>
                    <span className="text-[var(--ink-soft)]">Mã KTV:</span> <span className="font-mono">{ktvChon.ma_ktv}</span>
                  </div>
                  <div>
                    <span className="text-[var(--ink-soft)]">Email:</span> {ktvChon.email_dang_nhap}
                  </div>
                  {ktvChon.sdt && (
                    <div>
                      <span className="text-[var(--ink-soft)]">SĐT:</span> {ktvChon.sdt}
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--ink-soft)]">Vai trò · khu vực:</span> {[ktvChon.vai_tro_ktv, ktvChon.khu_vuc_ma].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--ink-soft)]">Bấm 1 KTV ở danh sách bên trái.</p>
              )}
              <div className="mt-4 rounded-lg bg-[var(--surface)] p-2.5 text-xs text-[var(--ink-soft)] lg:mt-auto">
                Bấm <b>"Tạo thùng hộ &amp; thêm đơn"</b> → hệ thống tạo 1 thùng cho KTV này và mở chi tiết thùng để thêm đơn (chọn đơn Odoo hoặc nhập mã case). Thùng Admin BH
                tạo hộ khi xác nhận gửi sẽ bỏ qua bước Kho, vào thẳng phân loại.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Cot trai: khach hang / NPP */}
            <div className={panel}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[var(--ink)]">① Khách hàng / Nhà phân phối</span>
                {khList && khList.length > 0 && (
                  <Btn
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      if (!taoMoi) setKhId("");
                      setTaoMoi(!taoMoi);
                    }}
                  >
                    {taoMoi ? "← Chọn từ danh sách" : "＋ Tạo khách mới"}
                  </Btn>
                )}
              </div>
              {khList === null ? (
                <Spinner />
              ) : taoMoi ? (
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm">
                    {(["kh_le", "npp"] as const).map((l) => (
                      <label key={l} className="flex items-center gap-1.5">
                        <input type="radio" checked={moi.loai === l} onChange={() => setMoi({ ...moi, loai: l })} /> {LOAI_KH_LABEL[l]}
                      </label>
                    ))}
                  </div>
                  <Field label={moi.loai === "npp" ? "Tên nhà phân phối" : "Tên khách hàng"} required>
                    <Input autoFocus value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} />
                  </Field>
                  <Field label="SĐT" required>
                    <Input value={moi.sdt} inputMode="tel" onChange={(e) => setMoi({ ...moi, sdt: e.target.value })} />
                  </Field>
                  <Field label="Địa chỉ">
                    <Input value={moi.dia_chi} onChange={(e) => setMoi({ ...moi, dia_chi: e.target.value })} />
                  </Field>
                  <p className="text-xs text-[var(--ink-soft)]">Khách mới được lưu vào danh bạ khi bấm "Tạo đơn" — lần sau chọn lại từ danh sách.</p>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    {(["tat_ca", "kh_le", "npp"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setKhLoai(l)}
                        className={`rounded-full border px-2.5 py-1 ${khLoai === l ? "border-[var(--accent)] bg-[var(--brand-50,#f0fdf4)] font-semibold text-[var(--accent)]" : "border-[var(--line)] bg-[var(--surface)]"}`}
                      >
                        {l === "tat_ca" ? "Tất cả" : LOAI_KH_LABEL[l]}
                      </button>
                    ))}
                    <Input autoFocus type="search" value={khQ} onChange={(e) => setKhQ(e.target.value)} placeholder="🔍 Tên, SĐT, địa chỉ… (không dấu)" className="sm:!w-64 sm:ml-auto" />
                  </div>
                  {khShown.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--ink-soft)]">Không có khách nào khớp — bấm "＋ Tạo khách mới".</p>
                  ) : (
                    <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto pr-1 xl:grid-cols-2" style={{ maxHeight: "calc(95vh - 300px)" }}>
                      {khShown.slice(0, 300).map((k) => (
                        <button key={k.id} type="button" title={`${k.ten} — ${k.sdt}${k.dia_chi ? " — " + k.dia_chi : ""}`} className={rowCls(k.id === khId)} onClick={() => setKhId(k.id)}>
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--ink)]">{k.ten}</span>
                            <span
                              className={`ml-auto shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${k.loai === "npp" ? "bg-[var(--violet-50)] text-[var(--violet-700)]" : "bg-[var(--blue-50,#eff6ff)] text-[var(--blue-700,#1d4ed8)]"}`}
                            >
                              {LOAI_KH_LABEL[k.loai]}
                            </span>
                          </div>
                          <div className="truncate text-xs text-[var(--ink-soft)]">
                            {k.sdt}
                            {k.dia_chi ? ` · ${k.dia_chi}` : ""}
                            {k.so_don ? ` · ${k.so_don} đơn` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cot phai: thong tin don */}
            <div className={`${panel} gap-3 lg:overflow-y-auto`}>
              <span className="text-sm font-bold text-[var(--ink)]">
                ② Thông tin đơn
                {khChon && !taoMoi && (
                  <span className="ml-2 font-normal text-[var(--accent)]">
                    — {khChon.ten} ({khChon.sdt})
                  </span>
                )}
              </span>
              <CaseIdField label="Mã case (nếu có — để trống nếu không có case CRM)" caseId={caseId} setCaseId={setCaseId} maLk={maLk} linhKien={linhKien} />
              {!hasCase && (
                <Field label="Sản phẩm bảo hành" required>
                  <Input value={sanPham} onChange={(e) => setSanPham(e.target.value)} placeholder="VD: Máy lọc nước Karofi K9" />
                </Field>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                <Field label="Linh kiện lỗi">
                  <SearchableSelect options={lkOptions(linhKien)} value={maLk} onChange={setMaLk} />
                </Field>
                <Field label="Số lượng" required>
                  <Input type="number" min={1} value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
                </Field>
              </div>
              <Field label="Mô tả lỗi" required>
                <Textarea rows={4} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
              </Field>
              <Field label="Ảnh linh kiện lỗi (tuỳ chọn)">
                <ImagePicker onChange={setAnhFiles} />
              </Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
