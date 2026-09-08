import { useEffect, useMemo, useState } from "react";
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

// Man "Nguoi dung" (qtri).
// Phat hien 13 vong ra soat UX: (1) them o tim (server ?q=); (2) gom cac thay doi co vai tro roi
// LUU 1 LAN thay vi moi tick = 1 request + reload ca bang (nhap nhay); (3) nut "Xoa" chuyen sang
// bien the im (ghost) thay vi do choi loi.

type PendingFlags = Record<string, Partial<Record<keyof AppUser, boolean>>>;

export function QtriNguoiDungScreen({ currentEmail }: { currentEmail: string }) {
  const toast = useToast();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);
  const { items: users, total, page, pageCount, setPage, loading, reload } = usePagedApi<AppUser>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, "users");
  const [addOpen, setAddOpen] = useState(false);
  const [pending, setPending] = useState<PendingFlags>({});
  const [saving, setSaving] = useState(false);

  // Doi trang/tim -> bo cac thay doi chua luu (tranh luu nham cho user khong con hien).
  useEffect(() => {
    setPending({});
  }, [q, page]);

  const pendingCount = useMemo(() => Object.values(pending).reduce((s, m) => s + Object.keys(m).length, 0), [pending]);

  const effFlag = (email: string, flag: keyof AppUser, row: AppUser): boolean => {
    const p = pending[email]?.[flag];
    return p === undefined ? !!row[flag] : p;
  };

  const toggleFlag = (email: string, flag: keyof AppUser, row: AppUser) => {
    setPending((prev) => {
      const cur = { ...(prev[email] || {}) };
      const next = !effFlag(email, flag, row);
      if (next === !!row[flag]) delete cur[flag];
      else cur[flag] = next;
      const out = { ...prev, [email]: cur };
      if (Object.keys(cur).length === 0) delete out[email];
      return out;
    });
  };

  const savePending = async () => {
    setSaving(true);
    try {
      for (const [email, flags] of Object.entries(pending)) {
        for (const [flag, value] of Object.entries(flags)) {
          await api.patch(`/users/${encodeURIComponent(email)}`, { flag, value });
        }
      }
      toast(`Đã lưu ${pendingCount} thay đổi vai trò.`, "ok");
      setPending({});
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">👥 Người dùng ({total})</h3>
        <div className="flex items-center gap-2">
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo email / tên…" className="!py-1.5 !w-56" />
          <Btn variant="primary" onClick={() => setAddOpen(true)}>
            + Thêm người dùng
          </Btn>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 rounded-lg border border-[var(--ocean-400)] bg-[var(--ocean-100)]/50 px-3 py-2">
          <span className="text-sm text-[var(--ink-800)]">
            <b>{pendingCount}</b> thay đổi vai trò chưa lưu
          </span>
          <div className="flex gap-2">
            <Btn onClick={() => setPending({})} disabled={saving}>
              Huỷ
            </Btn>
            <Btn variant="primary" onClick={savePending} disabled={saving}>
              Lưu thay đổi
            </Btn>
          </div>
        </div>
      )}

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
            {users.map((u) => {
              const rowDirty = !!pending[u.email] && Object.keys(pending[u.email]).length > 0;
              return (
                <tr key={u.email} className={`border-b border-[var(--line)] last:border-0 ${rowDirty ? "bg-[var(--ocean-100)]/30" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-[var(--ink-900)]">
                      {u.ten || "—"}
                      {u.email === currentEmail && <span className="ml-1.5 text-[10px] text-[var(--ink-400)]">(bạn)</span>}
                    </p>
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
                        checked={effFlag(u.email, r.flag, u)}
                        disabled={u.email === currentEmail && r.flag === "la_qtri"}
                        onChange={() => toggleFlag(u.email, r.flag, u)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {u.email !== currentEmail && (
                      <Btn variant="ghost" onClick={() => xoa(u.email)} className="!text-[var(--coral-600)] !px-2">
                        Xoá
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
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
