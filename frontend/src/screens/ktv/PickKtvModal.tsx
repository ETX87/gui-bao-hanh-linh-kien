import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Spinner } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import type { KtvLienHe } from "../../lib/types";

// Chon "tạo cho KTV nào" khi GS/Admin bảo hành tạo hộ 1 thùng (yeu cau 05/09/2026 muc 1: "khi tạo
// thùng sẽ chọn bắt buộc thùng bảo hành này tạo cho KTV nào"). Nguon danh sach: danh ba KTV
// (ktv_lien_he_bh, ke ca nguoi CHUA tung dang nhap - CHOT qua AskUserQuestion) - GET /ktv-lien-he
// khong truyen limit tra ve toan bo (backend da tu loc dung Khu vuc cua GS, Admin BH thay het).

export function PickKtvModal({ onClose, onPick }: { onClose: () => void; onPick: (ktvEmail: string) => void }) {
  const [list, setList] = useState<KtvLienHe[] | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    api.get<{ ktv: KtvLienHe[] }>("/ktv-lien-he").then((r) => setList(r.ktv.filter((k) => !!k.email_dang_nhap)));
  }, []);

  return (
    <Modal
      title="Tạo phiếu gửi hộ cho KTV"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!email} onClick={() => onPick(email)}>
            Tạo phiếu
          </Btn>
        </>
      }
    >
      <Field label="Tạo cho KTV nào" required>
        {list === null ? (
          <Spinner />
        ) : list.length === 0 ? (
          <p className="text-xs text-[var(--coral-600)]">
            Không có KTV nào trong danh bạ (khu vực của bạn có thể chưa có ai, hoặc chưa đồng bộ) — báo Admin hệ thống bổ sung ở màn "Danh sách KTV".
          </p>
        ) : (
          <SearchableSelect
            allowEmpty={false}
            placeholder="Gõ tên hoặc mã KTV để tìm…"
            options={list.map((k) => ({ value: k.email_dang_nhap!, label: `${k.ten_hien_thi || k.ma_ktv} — ${k.email_dang_nhap}` }))}
            value={email}
            onChange={setEmail}
          />
        )}
      </Field>
    </Modal>
  );
}
