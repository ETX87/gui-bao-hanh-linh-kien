import { useEffect, useMemo, useState } from "react";
import { api, ApiError, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { useLinhKien, useLkDaDat, lkOptionsUuTien } from "../../hooks/useLinhKien";
import { postJsonWithProgress, type UploadProgress } from "../../lib/uploadProgress";
import { useAuth } from "../../auth/AuthContext";

// 1 nguon su that dung chung giua AddDonModal (desktop) va AddDonMobileSheet (mobile) - port dung
// nguyen tac "khong co 2 nguon su that" da ap dung cho submitAddDon()/updateCaseInfo() o prototype
// (xem CLAUDE.md muc "Thiet ke giao dien" 22/08/2026). Anh chup linh kien loi (tuy chon, thuong tu
// camera dien thoai) - gap that phat hien o "QA vong 3" (bang phieu_sua_chua_bh_anh da co san trong
// schema + Admin BH da doc duoc, nhung truoc do khong co duong ghi/UI nao ca).
//
// ktvEmail (yeu cau 05/09/2026 muc 2, "Mã sự cố là bắt buộc... phải đúng của ktv đó mới cho tạo"):
// KTV so huu phieu gui nay (g.nguoi_tao - luon la KTV du ai dang bam them don, ke ca nguoi tao ho) -
// truyen xuong CaseLookupPreviewCard de doi chieu khopKtv, ket qua nhan lai qua setCaseValid GATE nut
// submit (backend van la nguon chan quyet dinh - day chi la UX, tranh nguoi dung bam roi moi bi tra
// loi 400).

export function useAddDonForm(guiId: string, onDone: () => void, ktvEmail: string) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const [caseId, setCaseId] = useState("");
  const [caseValid, setCaseValid] = useState(false);
  const [maLk, setMaLk] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [moTa, setMoTa] = useState("");
  const [loaiDoiTru, setLoaiDoiTru] = useState("doi_tra");
  const [anhFiles, setAnhFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  // 20/11/2026 (v1.150): linh kien da dat ben app Dat LK cho case nay (bo don huy / tu choi) -> len dau o chon linh kien.
  const lkDaDat = useLkDaDat(caseId, caseValid);
  const lkOpts = useMemo(() => lkOptionsUuTien(linhKien, lkDaDat), [linhKien, lkDaDat]);
  const [tienDo, setTienDo] = useState<UploadProgress | null>(null);
  // 05/10/2026 muc 9: Admin BH / Giam sat (/qtri) tao don HO cho KTV khac duoc tich xac nhan tao don du
  // case thuoc KTV khac tren he thong - KTV tu tao cho chinh minh KHONG co lua chon nay.
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const allowOverride = !!user && (user.la_admin_bh || user.la_giam_sat || user.la_qtri) && user.email !== ktvEmail;
  const [override, setOverride] = useState(false);

  // 16/11/2026 - chan tao trung cung ma case + cung linh kien (tru don cu bi tu choi / huy): kiem tra ngay khi
  // da co case hop le + linh kien, hien canh bao do va khoa nut (backend van chan lai lan nua).
  const [trung, setTrung] = useState<{ id: string; phieu_gui_id: string | null } | null>(null);
  useEffect(() => {
    setTrung(null);
    const cid = caseId.trim();
    if (!caseValid || !cid || !maLk) return;
    let huy = false;
    api
      .get<{ trung: { id: string; phieu_gui_id: string | null } | null }>(`/phieu-gui/kiem-tra-trung?case_id=${encodeURIComponent(cid)}&ma_lk=${encodeURIComponent(maLk)}`)
      .then((r) => { if (!huy) setTrung(r.trung); })
      .catch(() => undefined);
    return () => { huy = true; };
  }, [caseId, caseValid, maLk]);

  const valid = !!moTa.trim() && Number(soLuong) >= 1 && !!caseId.trim() && caseValid && !trung;
  // 05/11/2026 - "điền đủ thông tin nhưng không cho tạo đơn": noi ro vi sao nut "Thêm vào phiếu" bi khoa.
  const lyDoKhoa = !caseId.trim()
    ? "Nhập mã case rồi bấm “Kiểm tra”."
    : !caseValid
      ? "Mã yêu cầu chưa hợp lệ — bấm “🔍 Kiểm tra” (sửa mã thì phải kiểm tra lại) và xem cảnh báo ngay dưới ô Mã yêu cầu (mã Lada không tìm thấy thì phải tích xác nhận)."
      : trung
        ? `Mã case này đã có đơn ${trung.id}${trung.phieu_gui_id ? ` (thùng ${trung.phieu_gui_id})` : ""} cùng linh kiện — không thể tạo trùng.`
      : !(Number(soLuong) >= 1)
        ? "Số lượng phải từ 1 trở lên."
        : !moTa.trim()
          ? "Nhập mô tả lỗi."
          : "";

  // 08/11/2026 - "bấm Thêm vào phiếu thì nút mờ đi, màn hình đứng yên, không báo gì" (iPhone): truoc day
  // khong buoc nao co gioi han thoi gian (doc anh, gui request, backend tra case DVBH) -> 1 buoc treo la busy
  // ket true mai mai. Gio: doc anh toi da 20s/anh (fileToDataUrl), request toi da 60s, het han -> bao loi ro +
  // mo lai nut. Het han KHONG chac la chua tao (server co the da ghi xong) -> nhac kiem tra phieu truoc khi bam lai.
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let anh: string[] = [];
      try {
        anh = anhFiles && anhFiles.length > 0 ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      } catch (e) {
        toast(e instanceof Error ? e.message : "Không đọc được ảnh — bỏ ảnh đó rồi chụp/chọn lại.", "error");
        return;
      }
      await postJsonWithProgress(
        `/phieu-gui/${guiId}/don`,
        {
          case_id: caseId.trim(),
          ma_lk: maLk || null,
          so_luong_khai: Number(soLuong),
          mo_ta_loi: moTa.trim(),
          loai_doi_tru_de_xuat: loaiDoiTru,
          anh,
          xac_nhan_khac_ktv: allowOverride && override,
          // 30/10/2026: cung o tich "override" dung cho truong hop DVBH khong phan hoi (backend chi xet khi DVBH loi).
          xac_nhan_chua_xac_minh: override,
          // 21/11/2026: ma Lada khong tim thay -> o tich "tu chiu trach nhiem" (backend chi xet khi la ma Lada).
          xac_nhan_lada: override,
        },
        setTienDo,
      );
      toast("Đã thêm đơn vào phiếu.", "ok");
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === "TIMEOUT") {
        toast("Mạng bị ngắt khi đang gửi (không tải lên được thêm trong 45 giây). Đơn có thể đã được thêm — đóng hộp này, kiểm tra danh sách đơn trong phiếu rồi mới thêm lại.", "error");
      } else {
        toast(errorMessage(e), "error");
      }
    } finally {
      setBusy(false);
      setTienDo(null);
    }
  };

  return { trung, linhKien, lkOpts, lkDaDat, ktvEmail, allowOverride, override, setOverride, caseId, setCaseId, caseValid, setCaseValid, maLk, setMaLk, soLuong, setSoLuong, moTa, setMoTa, loaiDoiTru, setLoaiDoiTru, anhFiles, setAnhFiles, busy, tienDo, valid, lyDoKhoa, submit };
}
