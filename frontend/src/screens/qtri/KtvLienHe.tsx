import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Field, Input, Select } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { Modal } from "../../ui/Modal";
import type { KtvLienHe } from "../../lib/types";

const VAI_TRO_OPTIONS = ["KTV", "CTV", "Tram", "Ve tinh"];

// Man "Quan ly danh sach KTV" (qtri, moi 04/09/2026) - CRUD ktv_lien_he_bh. Gap that phat hien: bang
// nay truoc gio chi nhan duoc du lieu qua sync day tu linh-kien-app (chua trien khai xong ben do),
// nen dang RONG tren production - khong co gi de auth.ts (GET /callback) doi chieu tu dong duyet tai
// khoan KTV dang nhap lan dau. Man nay cho qtri tu khai bao thu cong ngay, khong can cho sync.
// QUAN TRONG: chi ap dung cho lan DANG NHAP TIEP THEO cua KTV do (auth.ts chi kiem tra luc OAuth
// callback) - neu tai khoan da ton tai san va dang "Cho duyet", can qtri tu duyet tay o man "Người
// dùng" (hoac doi KTV dang xuat/dang nhap lai) de duoc tu dong nang len "Da duyet".

export function QtriKtvScreen() {
  const toast = useToast();
  const { items, total, page, pageCount, setPage, loading, reload } = usePagedApi<KtvLienHe>("/ktv-lien-he", "ktv");
  const [editing, setEditing] = useState<KtvLienHe | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const xoa = async (maKtv: string) => {
    if (!confirm(`Xoá KTV "${maKtv}" khỏi danh bạ? (Tài khoản đăng nhập đã có sẵn của họ không bị xoá — chỉ mất khả năng tự động duyệt lần đăng nhập kế tiếp.)`)) return;
    try {
      await api.delete(`/ktv-lien-he/${encodeURIComponent(maKtv)}`);
      toast("Đã xoá.", "ok");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (loading && items.length === 0) return <Spinner />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">📇 Danh sách KTV / CTV / Trạm ({total})</h3>
        <Btn variant="primary" onClick={() => setAddOpen(true)}>
          + Khai báo KTV
        </Btn>
      </div>
      <p className="text-xs text-[var(--ink-500)] mb-3">
        KTV có trong danh sách này sẽ <b>tự động được duyệt</b> ngay khi đăng nhập lần đầu bằng đúng email đăng nhập bên dưới — không cần chờ Admin hệ thống duyệt tay ở màn "Người dùng".
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--surface-100)] border-b border-[var(--line)]">
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Tên hiển thị</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Email đăng nhập</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">SĐT</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Vai trò</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Khu vực</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Nguồn</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[var(--ink-400)]">
                  Chưa có KTV nào trong danh bạ — bấm "+ Khai báo KTV" để thêm.
                </td>
              </tr>
            )}
            {items.map((k) => (
              <tr key={k.ma_ktv} className="border-b border-[var(--line)] last:border-0 clickable-row cursor-pointer hover:bg-[var(--surface-100)]" onClick={() => setEditing(k)}>
                <td className="px-3 py-2 font-medium text-[var(--ink-900)]">{k.ten_hien_thi || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{k.email_dang_nhap || "—"}</td>
                <td className="px-3 py-2">{k.sdt || "—"}</td>
                <td className="px-3 py-2">{k.vai_tro_ktv || "—"}</td>
                <td className="px-3 py-2">{k.khu_vuc_ma || "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={k.nguon_du_lieu === "dong_bo" ? "blue" : "gray"}>{k.nguon_du_lieu === "dong_bo" ? "Đồng bộ" : "Nội bộ"}</Badge>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Btn variant="danger" onClick={() => xoa(k.ma_ktv)}>
                    Xoá
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {addOpen && <KtvFormModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); reload(); }} />}
      {editing && <KtvFormModal existing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </Card>
  );
}

function KtvFormModal({ existing, onClose, onDone }: { existing?: KtvLienHe; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ten, setTen] = useState(existing?.ten_hien_thi || "");
  const [email, setEmail] = useState(existing?.email_dang_nhap || "");
  const [sdt, setSdt] = useState(existing?.sdt || "");
  const [gmail, setGmail] = useState(existing?.gmail || "");
  const [vaiTro, setVaiTro] = useState<string>(existing?.vai_tro_ktv || "KTV");
  const [khuVuc, setKhuVuc] = useState(existing?.khu_vuc_ma || "");
  const [busy, setBusy] = useState(false);

  const valid = ten.trim() && email.trim();

  const submit = async () => {
    setBusy(true);
    try {
      const body = { ten_hien_thi: ten.trim(), email_dang_nhap: email.trim(), sdt: sdt.trim(), gmail: gmail.trim(), vai_tro_ktv: vaiTro, khu_vuc_ma: khuVuc.trim() };
      if (existing) {
        await api.patch(`/ktv-lien-he/${encodeURIComponent(existing.ma_ktv)}`, body);
        toast("Đã cập nhật.", "ok");
      } else {
        await api.post("/ktv-lien-he", body);
        toast("Đã khai báo KTV — họ sẽ tự động được duyệt ở lần đăng nhập kế tiếp.", "ok");
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
      title={existing ? `Sửa KTV — ${existing.ma_ktv}` : "Khai báo KTV mới"}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            {existing ? "Lưu" : "Khai báo"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên hiển thị" required>
          <Input value={ten} onChange={(e) => setTen(e.target.value)} />
        </Field>
        <Field label="Email đăng nhập" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Đúng email họ dùng để đăng nhập Google" />
        </Field>
        <Field label="SĐT">
          <Input value={sdt} onChange={(e) => setSdt(e.target.value)} />
        </Field>
        <Field label="Gmail (nếu khác email đăng nhập)">
          <Input value={gmail} onChange={(e) => setGmail(e.target.value)} />
        </Field>
        <Field label="Vai trò">
          <Select value={vaiTro} onChange={(e) => setVaiTro(e.target.value)}>
            {VAI_TRO_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mã khu vực (nếu có)">
          <Input value={khuVuc} onChange={(e) => setKhuVuc(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
