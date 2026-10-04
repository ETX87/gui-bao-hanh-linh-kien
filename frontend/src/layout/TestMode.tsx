import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { api, errorMessage } from "../lib/api";
import { Modal } from "../ui/Modal";
import { Btn, Input, Spinner } from "../ui/primitives";

// Che do test cua Admin he thong (yeu cau 05/10/2026, port tu linh-kien-app "Xem thử vai trò" + "Xem như
// người dùng") - backend: lib/viewAs.ts + middleware/loadUser.ts. Chi hien khi tai khoan THAT la la_qtri.

export const VIEW_AS_ROLES: { key: string; label: string; desc: string }[] = [
  { key: "ktv", label: "KTV / CTV / Trạm", desc: "Tạo phiếu gửi, theo dõi tiến độ, nhận hàng trả" },
  { key: "ve_tinh", label: "Vệ tinh", desc: "Như KTV" },
  { key: "kho", label: "Kho", desc: "Tiếp nhận thùng, đóng gói & gửi trả" },
  { key: "admin_bh", label: "Admin bảo hành", desc: "Xử lý đơn, xác nhận hoàn tất, phiếu trả" },
  { key: "nv_sua_chua", label: "NV sửa chữa", desc: "Chẩn đoán đơn được giao" },
  { key: "ke_toan", label: "Kế toán", desc: "Duyệt phiếu trả" },
  { key: "giam_sat", label: "Giám sát", desc: "Tổng quan, tra cứu khu vực mình, tạo hộ" },
  { key: "view", label: "View", desc: "Chỉ xem tổng quan & tra cứu" },
];
export const VIEW_AS_ROLE_LABELS: Record<string, string> = Object.fromEntries(VIEW_AS_ROLES.map((r) => [r.key, r.label]));

const FLAG_LABELS: [string, string][] = [
  ["la_ktv_dvbh", "KTV"],
  ["la_ve_tinh", "Vệ tinh"],
  ["la_kho", "Kho"],
  ["la_admin_bh", "Admin BH"],
  ["la_nv_sua_chua", "NV sửa chữa"],
  ["la_ke_toan", "Kế toán"],
  ["la_giam_sat", "Giám sát"],
  ["la_view", "View"],
  ["la_qtri", "Admin hệ thống"],
];

interface Option {
  email: string;
  ten: string | null;
  ma_ktv: string | null;
  da_dang_nhap: number;
  [flag: string]: unknown;
}

async function switchRole(role: string | null) {
  await api.post("/auth/view-as", { role });
  window.location.href = "/#/home";
  window.location.reload();
}
async function switchUser(email: string | null) {
  await api.post("/auth/view-as-user", { email });
  window.location.href = "/#/home";
  window.location.reload();
}
export const exitTestMode = () => switchUser(null);

export function useTestMode() {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.test : null;
}

export function TestModeModal({ onClose }: { onClose: () => void }) {
  const test = useTestMode();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Option[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<{ rows: Option[] }>(`/auth/view-as-user/options?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setRows(r.rows))
        .catch((e) => {
          setRows([]);
          setErr(errorMessage(e));
        });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  const testing = !!(test?.viewAsRole || test?.viewAsUser);

  return (
    <Modal title="🧪 Chế độ test (Admin)" onClose={onClose}>
      <div className="space-y-5">
        {err && <p className="rounded-lg bg-[var(--red-100)] px-3 py-2 text-xs font-semibold text-[var(--red-700)]">{err}</p>}
        {testing && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--amber-100)] px-3 py-2 text-sm text-[var(--amber-800)]">
            <span>
              Đang test: <b>{test?.viewAsUser ? test.viewAsUser.ten || test.viewAsUser.email : VIEW_AS_ROLE_LABELS[test?.viewAsRole || ""]}</b>
            </span>
            <Btn size="sm" variant="secondary" disabled={!!busy} onClick={() => run("exit", () => switchUser(null))}>
              Thoát, về Admin
            </Btn>
          </div>
        )}

        <section>
          <h4 className="text-sm font-bold text-[var(--ink)]">1. Xem thử theo vai trò</h4>
          <p className="mb-2 text-xs text-[var(--ink-soft)]">
            Giữ tài khoản của bạn, chỉ đổi quyền sang 1 vai trò. <b>Thao tác được và ghi nhận thật</b> dưới email của bạn — dùng để thử nghiệp vụ.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VIEW_AS_ROLES.map((r) => {
              const on = test?.viewAsRole === r.key;
              return (
                <button
                  key={r.key}
                  disabled={!!busy}
                  onClick={() => run(r.key, () => switchRole(r.key))}
                  className={`focus-ring rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                    on ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:border-[var(--brand-300)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--ink)]">{busy === r.key ? "Đang chuyển…" : r.label}</span>
                  <span className="block text-xs text-[var(--ink-soft)]">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-[var(--ink)]">2. Xem như người dùng thật</h4>
          <p className="mb-2 text-xs text-[var(--ink-soft)]">
            Hiển thị đúng menu, dữ liệu và quyền của tài khoản được chọn (kể cả KTV có trong danh bạ nhưng chưa đăng nhập). <b>Chỉ xem</b> — mọi thao tác ghi bị chặn để không ghi nhận dưới tên người khác.
          </p>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, gmail, mã KTV…" autoFocus />
          <div className="mt-2 max-h-[40vh] overflow-y-auto divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
            {rows === null ? (
              <div className="p-3">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <p className="p-3 text-xs text-[var(--ink-faint)]">Không có tài khoản phù hợp.</p>
            ) : (
              rows.map((r) => {
                const roles = FLAG_LABELS.filter(([f]) => !!Number(r[f])).map(([, l]) => l);
                const on = test?.viewAsUser?.email === r.email;
                return (
                  <button
                    key={r.email}
                    disabled={!!busy}
                    onClick={() => run(r.email, () => switchUser(r.email))}
                    className={`focus-ring flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--accent-soft)] disabled:opacity-60 ${on ? "bg-[var(--accent-soft)]" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">{r.ten || r.email}</span>
                      <span className="block truncate text-xs text-[var(--ink-soft)]">
                        {r.email}
                        {r.ma_ktv ? ` · ${r.ma_ktv}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-[var(--ink-soft)]">
                      {busy === r.email ? "Đang chuyển…" : roles.join(" · ") || "Chưa có vai trò"}
                      {!r.da_dang_nhap && <span className="block text-[var(--ink-faint)]">chưa đăng nhập</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

// Banner luon hien khi dang test - de khong bao gio quen minh dang o che do nao.
export function TestModeBanner() {
  const test = useTestMode();
  if (!test || !(test.viewAsRole || test.viewAsUser)) return null;
  const isUser = !!test.viewAsUser;
  return (
    <div
      className={`sticky top-0 z-[45] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-xs font-semibold text-white ${
        isUser ? "bg-[var(--blue-700)]" : "bg-[var(--amber-700)]"
      }`}
    >
      <span>
        {isUser ? (
          <>
            👤 Đang xem như <b>{test.viewAsUser!.ten || test.viewAsUser!.email}</b> ({test.viewAsUser!.email}) — chỉ xem, không thao tác được.
          </>
        ) : (
          <>
            🧪 Đang test vai trò <b>{VIEW_AS_ROLE_LABELS[test.viewAsRole!] || test.viewAsRole}</b> — thao tác vẫn ghi nhận thật dưới email {test.realEmail}.
          </>
        )}
      </span>
      <button onClick={() => exitTestMode()} className="focus-ring shrink-0 underline underline-offset-2">
        Thoát về Admin
      </button>
    </div>
  );
}
