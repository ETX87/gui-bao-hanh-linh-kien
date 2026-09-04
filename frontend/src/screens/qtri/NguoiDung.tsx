import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Select } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { Modal } from "../../ui/Modal";
import { Field, Input } from "../../ui/primitives";
import type { AppUser } from "../../lib/types";

const ROLE_FLAGS: Array<{ flag: keyof AppUser; label: string }> = [
  { flag: "la_ktv_dvbh", label: "KTV" },
  { flag: "la_ve_tinh", label: "Vệ tinh" },
  { flag: "la_kho", label: "Kho" },
  { flag: "la_admin_bh", label: "Admin BH" },
  { flag: "la_nv_sua_chua", label: "NV sửa chữa" },
  { flag: "la_ke_toan", label: "Kế toán" },
  { flag: "la_giam_sat", label: "Giám sát" },
  { flag: "la_view", label: "View" },
  { flag: "la_qtri", label: "Admin hệ thống" },
];

// Man "Nguoi dung" (qtri) - port dung renderQtriNguoiDung(): sua truc tiep tren dong (khong can nut
// Luu rieng), chan tu-khoa/tu-xoa chinh minh (server da chan, UI cung an nut de ro rang).

export function QtriNguoiDungScreen({ currentEmail }: { currentEmail: string }) {
  const toast = useToast();
  const { items: users, total, page, pageCount, setPage, loading, reload } = usePagedApi<AppUser>("/users", "users");
  const [addOpen, setAddOpen] = useState(false);

  const setFlag = async (email: string, flag: keyof AppUser, value: boolean) => {
    try {
      await api.patch(`/users/${encodeURIComponent(email)}`, { flag, value });
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const setTrangThai = async (email: string, v: string) => {
    try {
      await api.patch(`/users/${encodeURIComponent(email)}`, { trang_thai_duyet: v });
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const toggleKhoa = async (email: string, v: boolean) => {
    try {
      await api.patch(`/users/${encodeURIComponent(email)}`, { bi_khoa: v });
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const xoa = async (email: string) => {
    if (!confirm(`Xoá tài khoản ${email}?`)) return;
    try {
      await api.delete(`/users/${encodeURIComponent(email)}`);
      toast("Đã xoá.", "ok");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (loading && users.length === 0) return <Spinner />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">👥 Người dùng ({total})</h3>
        <Btn variant="primary" onClick={() => setAddOpen(true)}>
          + Thêm người dùng
        </Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--surface-100)] border-b border-[var(--line)]">
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Người dùng</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Duyệt</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">Khoá</th>
              {ROLE_FLAGS.map((r) => (
                <th key={r.flag} className="text-center px-2 py-2.5 text-xs font-semibold uppercase text-[var(--ink-600)]">
                  {r.label}
                </th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-b border-[var(--line)] last:border-0">
                <td className="px-3 py-2">
                  <p className="font-medium text-[var(--ink-900)]">{u.ten || "—"}</p>
                  <p className="text-xs text-[var(--ink-500)] font-mono">{u.email}</p>
                </td>
                <td className="px-3 py-2">
                  <Select value={u.trang_thai_duyet} onChange={(e) => setTrangThai(u.email, e.target.value)} className="!py-1 !text-xs">
                    <option value="Cho duyet">Chờ duyệt</option>
                    <option value="Da duyet">Đã duyệt</option>
                    <option value="Tu choi">Từ chối</option>
                  </Select>
                </td>
                <td className="px-3 py-2 text-center">
                  {u.email === currentEmail ? (
                    <Badge tone="gray">—</Badge>
                  ) : (
                    <input type="checkbox" checked={u.bi_khoa} onChange={(e) => toggleKhoa(u.email, e.target.checked)} />
                  )}
                </td>
                {ROLE_FLAGS.map((r) => (
                  <td key={r.flag} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!u[r.flag]}
                      disabled={u.email === currentEmail && r.flag === "la_qtri"}
                      onChange={(e) => setFlag(u.email, r.flag, e.target.checked)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  {u.email !== currentEmail && (
                    <Btn variant="danger" onClick={() => xoa(u.email)}>
                      Xoá
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); reload(); }} />}
    </Card>
  );
}

function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [ten, setTen] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/users", { email, ten });
      toast("Đã thêm người dùng.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Thêm người dùng"
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!email.trim() || busy} onClick={submit}>
            Thêm
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Tên hiển thị">
          <Input value={ten} onChange={(e) => setTen(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
