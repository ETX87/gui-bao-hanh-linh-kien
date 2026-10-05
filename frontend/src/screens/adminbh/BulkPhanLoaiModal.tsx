import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, SectionLabel } from "../../ui/primitives";
import { HUONG_XU_LY_LABELS, LOAI_BAO_HANH_LABELS, LOAI_DOI_TRU_LABELS, HUONG_CAN_NV } from "../../lib/constants";
import { useLyDoTuChoi, useLyDoCham } from "../../hooks/useSettings";
import { useNvList } from "../../hooks/useNvList";

const HUONG_OPTIONS = Object.keys(HUONG_XU_LY_LABELS);

// Phan loai HANG LOAT nhieu don vi cung luc - port dung openBulkPhanLoaiModal()/submitBulkPhanLoai()
// cua prototype, goi POST /admin/don-vi/phan-loai-hang-loat (backend Giai doan 3 da co san, CHUA tung
// co UI o Giai doan 4 - day la lo hong duoc phat hien khi ra soat lai voi prototype). KHONG co truong
// "Linh kien sua chua thuc te" (khac PhanLoaiModal don le) - nhieu don vi duoc chon co the thuoc
// nhieu don cha khac nhau, khong co 1 gia tri mac dinh chung hop ly. Ket qua co the lech (1 vai don vi
// dang sai trang thai khi thao tac cham) - hien thi ro so ap dung thanh cong / loi cho tung ID, khong
// gia dinh tat ca deu thanh cong.

export function BulkPhanLoaiModal({ unitIds, onClose, onDone }: { unitIds: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const nvList = useNvList();
  const { items: lyDoTuChoiList } = useLyDoTuChoi();
  const { items: lyDoChamList } = useLyDoCham();

  const [loaiBaoHanh, setLoaiBaoHanh] = useState("trong_bh");
  const [mailPd, setMailPd] = useState("");
  const [maPheDuyet, setMaPheDuyet] = useState("");
  const [loaiDoiTru, setLoaiDoiTru] = useState("theo_de_xuat"); // moi don theo de xuat cua KTV (giong FAST)
  const [huongXuLy, setHuongXuLy] = useState("");
  const [nguoiSuaChua, setNguoiSuaChua] = useState("");
  const [lyDoTuChoi, setLyDoTuChoi] = useState("");
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);

  const needsNv = HUONG_CAN_NV.includes(huongXuLy);
  const needsTuChoi = huongXuLy === "tu_choi";
  const valid = huongXuLy && loaiDoiTru && (loaiBaoHanh !== "ngoai_bh" || mailPd.trim()) && (!needsNv || nguoiSuaChua) && (!needsTuChoi || lyDoTuChoi);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ applied: number; errors: Record<string, string> }>("/admin/don-vi/phan-loai-hang-loat", {
        ids: unitIds,
        loai_bao_hanh: loaiBaoHanh,
        thong_tin_mail_pd: mailPd,
        ma_phe_duyet: maPheDuyet,
        loai_doi_tru: loaiDoiTru,
        huong_xu_ly: huongXuLy,
        nguoi_sua_chua: needsNv ? nguoiSuaChua : undefined,
        ly_do_tu_choi: needsTuChoi ? lyDoTuChoi : undefined,
        ly_do_cham: lyDoCham || undefined,
      });
      const errCount = Object.keys(r.errors).length;
      if (errCount > 0) {
        toast(`Đã áp dụng ${r.applied}/${unitIds.length} — ${errCount} đơn vị lỗi (VD quá hạn SLA cần lý do chậm riêng, hoặc đã đổi trạng thái). Mở từng đơn để xử lý riêng.`, "error");
      } else {
        toast(`Đã phân loại hàng loạt ${r.applied} đơn vị.`, "ok");
      }
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Phân loại hàng loạt (${unitIds.length} đơn vị)`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Áp dụng cho {unitIds.length} đơn vị
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-bold px-3 py-2">
          Áp dụng cùng 1 lựa chọn cho toàn bộ {unitIds.length} đơn vị đã chọn. Đơn vị nào đang quá hạn SLA hoặc sai trạng thái sẽ báo lỗi riêng, không chặn các đơn còn lại.
        </p>
        <Field label="Lý do chậm (nếu có đơn quá hạn SLA)">
          <Select value={lyDoCham} onChange={(e) => setLyDoCham(e.target.value)}>
            <option value="">— Không có đơn quá hạn —</option>
            {lyDoChamList.map((l) => (
              <option key={l.id} value={l.noi_dung}>
                {l.noi_dung}
              </option>
            ))}
          </Select>
        </Field>

        <SectionLabel>Phân loại bảo hành</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại bảo hành" required>
            <Select value={loaiBaoHanh} onChange={(e) => setLoaiBaoHanh(e.target.value)}>
              {Object.entries(LOAI_BAO_HANH_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loại đối trừ" required>
            <Select value={loaiDoiTru} onChange={(e) => setLoaiDoiTru(e.target.value)}>
              <option value="theo_de_xuat">Theo đề xuất của KTV (từng đơn)</option>
              {Object.entries(LOAI_DOI_TRU_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {loaiBaoHanh === "ngoai_bh" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thông tin mail phê duyệt" required>
              <Input value={mailPd} onChange={(e) => setMailPd(e.target.value)} />
            </Field>
            <Field label="Mã phê duyệt">
              <Input value={maPheDuyet} onChange={(e) => setMaPheDuyet(e.target.value)} />
            </Field>
          </div>
        )}

        <SectionLabel>Xử lý & phân công</SectionLabel>
        <Field label="Hướng xử lý" required>
          <Select value={huongXuLy} onChange={(e) => setHuongXuLy(e.target.value)}>
            <option value="">— Chọn hướng xử lý —</option>
            {HUONG_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {HUONG_XU_LY_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
        {needsNv && (
          <Field label="Nhân viên sửa chữa phụ trách" required>
            <Select value={nguoiSuaChua} onChange={(e) => setNguoiSuaChua(e.target.value)}>
              <option value="">— Chọn NV —</option>
              {nvList.map((n) => (
                <option key={n.email} value={n.email}>
                  {n.ten || n.email}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needsTuChoi && (
          <Field label="Lý do huỷ" required>
            <Select value={lyDoTuChoi} onChange={(e) => setLyDoTuChoi(e.target.value)}>
              <option value="">— Chọn lý do —</option>
              {lyDoTuChoiList.map((l) => (
                <option key={l.id} value={l.noi_dung}>
                  {l.noi_dung}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
