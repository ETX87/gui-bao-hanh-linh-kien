import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Select } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { Modal } from "../../ui/Modal";
import { Field, Input } from "../../ui/primitives";
import type { AppUser } from "../../lib/types";
import { MIEN_USER_OPTIONS } from "../../lib/mien";

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
  const isMobile = useIsMobile();
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
  const setMien = async (email: string, v: string) => {
    try {
      await api.patch(`/users/${encodeURIComponent(email)}`, { mien: v || null });
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
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">👥 Người dùng ({total})</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo email / tên…" className="sm:!w-56" />
          <Btn variant="primary" onClick={() => setAddOpen(true)}>
            + Thêm người dùng
          </Btn>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 mb-2 rounded-lg border border-[var(--brand-400)] bg-[var(--accent-soft)] px-3 py-2">
          <span className="text-sm text-[var(--ink-body)]">
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

      {isMobile ? (
        // Mobile (DESIGN_SYSTEM.md §6.5): ma tran 12 cot checkbox -> moi nguoi dung 1 the, co vai tro
        // xep luoi 2 cot (o cham lon), dung chung handler voi bang desktop (gom thay doi -> Luu 1 lan).
        <div className="space-y-2.5">
          {users.map((u) => {
            const rowDirty = !!pending[u.email] && Object.keys(pending[u.email]).length > 0;
            return (
              <div key={u.email} className={`rounded-xl border p-3.5 shadow-card ${rowDirty ? "border-[var(--brand-300)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)] truncate">
                      {u.ten || "—"}
                      {u.email === currentEmail && <span className="ml-1.5 text-xs text-[var(--ink-faint)]">(bạn)</span>}
                      <EtxTag u={u} />
                    </p>
                    <p className="text-xs text-[var(--ink-soft)] font-mono truncate">{u.email}</p>
                  </div>
                  {u.email !== currentEmail && (
                    <Btn variant="ghost" size="sm" onClick={() => xoa(u.email)} className="!text-[var(--red-600)] hover:!bg-[var(--red-50)] shrink-0">
                      ✕ Xoá
                    </Btn>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Select value={u.trang_thai_duyet} onChange={(e) => setTrangThai(u.email, e.target.value)}>
                    <option value="Cho duyet">Chờ duyệt</option>
                    <option value="Da duyet">Đã duyệt</option>
                    <option value="Tu choi">Từ chối</option>
                  </Select>
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 text-sm">
                    <input type="checkbox" className="w-5 h-5" disabled={u.email === currentEmail} checked={u.bi_khoa} onChange={(e) => toggleKhoa(u.email, e.target.checked)} />
                    Khoá tài khoản
                  </label>
                  <Select value={u.mien || ""} onChange={(e) => setMien(u.email, e.target.value)} className="col-span-2">
                    {MIEN_USER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        Miền: {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {ROLE_FLAGS.map((r) => (
                    <label key={r.flag} className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-sm text-[var(--ink-body)]">
                      <input
                        type="checkbox"
                        className="w-5 h-5"
                        checked={effFlag(u.email, r.flag, u)}
                        disabled={u.email === currentEmail && r.flag === "la_qtri"}
                        onChange={() => toggleFlag(u.email, r.flag, u)}
                      />
                      <span className="truncate">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="tbl w-full whitespace-nowrap">
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--line)]">
                <th className="text-left text-xs font-semibold text-[var(--ink-soft)]">Người dùng</th>
                <th className="text-left text-xs font-semibold text-[var(--ink-soft)]">Duyệt</th>
                <th className="text-left text-xs font-semibold text-[var(--ink-soft)]">Miền</th>
                <th className="text-left text-xs font-semibold text-[var(--ink-soft)]">Khoá</th>
                {ROLE_FLAGS.map((r) => (
                  <th key={r.flag} className="text-center text-xs font-semibold text-[var(--ink-soft)]">
                    {r.label}
                  </th>
                ))}
                <th className="" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rowDirty = !!pending[u.email] && Object.keys(pending[u.email]).length > 0;
                return (
                  <tr key={u.email} className={`border-b border-[var(--line)] last:border-0 ${rowDirty ? "bg-[var(--accent-soft)]" : ""}`}>
                    <td className="">
                      <span className="font-medium text-[var(--ink)]">{u.ten || "—"}</span>
                      {u.email === currentEmail && <span className="ml-1 text-[10px] text-[var(--ink-faint)]">(bạn)</span>}
                      <span className="ml-1.5 text-xs text-[var(--ink-soft)] font-mono">{u.email}</span>
                      <EtxTag u={u} />
                    </td>
                    <td className="">
                      <Select value={u.trang_thai_duyet} onChange={(e) => setTrangThai(u.email, e.target.value)} className="!py-1 !text-xs">
                        <option value="Cho duyet">Chờ duyệt</option>
                        <option value="Da duyet">Đã duyệt</option>
                        <option value="Tu choi">Từ chối</option>
                      </Select>
                    </td>
                    <td className="">
                      <Select value={u.mien || ""} onChange={(e) => setMien(u.email, e.target.value)} className="!py-1 !text-xs" title="Miền phụ trách (Kho / Admin BH / NV / Kế toán)">
                        {MIEN_USER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="text-center">
                      {u.email === currentEmail ? (
                        <Badge tone="gray">—</Badge>
                      ) : (
                        <input type="checkbox" checked={u.bi_khoa} onChange={(e) => toggleKhoa(u.email, e.target.checked)} />
                      )}
                    </td>
                    {ROLE_FLAGS.map((r) => (
                      <td key={r.flag} className="text-center">
                        <input
                          type="checkbox"
                          checked={effFlag(u.email, r.flag, u)}
                          disabled={u.email === currentEmail && r.flag === "la_qtri"}
                          onChange={() => toggleFlag(u.email, r.flag, u)}
                        />
                      </td>
                    ))}
                    <td className="text-right">
                      {u.email !== currentEmail && (
                        <Btn variant="ghost" onClick={() => xoa(u.email)} className="!text-[var(--red-600)] !px-2">
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
      )}
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

// 16/10/2026: nhan trang thai ETX nhan su (lib/etxSync.ts backend).
function EtxTag({ u }: { u: AppUser }) {
  if (u.etx_trang_thai === "on") return <span className="ml-1.5 rounded px-1 text-[10px] font-semibold bg-[var(--green-50)] text-[var(--green-700)]" title="Đang làm việc trên ETX nhân sự">ETX</span>;
  if (u.etx_trang_thai === "off")
    return (
      <span className="ml-1.5 rounded px-1 text-[10px] font-semibold bg-[var(--red-50)] text-[var(--red-700)]" title={u.khoa_boi_etx ? "Tự khoá vì ETX báo nghỉ việc" : "ETX báo đã nghỉ việc"}>
        ETX nghỉ{u.khoa_boi_etx ? " · tự khoá" : ""}
      </span>
    );
  return null;
}
