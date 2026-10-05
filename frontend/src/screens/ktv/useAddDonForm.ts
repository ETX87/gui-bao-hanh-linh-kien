import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { useLinhKien } from "../../hooks/useLinhKien";
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
  // 05/10/2026 muc 9: Admin BH / Giam sat (/qtri) tao don HO cho KTV khac duoc tich xac nhan tao don du
  // case thuoc KTV khac tren he thong - KTV tu tao cho chinh minh KHONG co lua chon nay.
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const allowOverride = !!user && (user.la_admin_bh || user.la_giam_sat || user.la_qtri) && user.email !== ktvEmail;
  const [override, setOverride] = useState(false);

  const valid = !!moTa.trim() && Number(soLuong) >= 1 && !!caseId.trim() && caseValid;

  const submit = async () => {
    setBusy(true);
    try {
      const anh = anhFiles && anhFiles.length > 0 ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      await api.post(`/phieu-gui/${guiId}/don`, {
        case_id: caseId.trim(),
        ma_lk: maLk || null,
        so_luong_khai: Number(soLuong),
        mo_ta_loi: moTa.trim(),
        loai_doi_tru_de_xuat: loaiDoiTru,
        anh,
        xac_nhan_khac_ktv: allowOverride && override,
      });
      toast("Đã thêm đơn vào phiếu.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return { linhKien, ktvEmail, allowOverride, override, setOverride, caseId, setCaseId, caseValid, setCaseValid, maLk, setMaLk, soLuong, setSoLuong, moTa, setMoTa, loaiDoiTru, setLoaiDoiTru, anhFiles, setAnhFiles, busy, valid, submit };
}
