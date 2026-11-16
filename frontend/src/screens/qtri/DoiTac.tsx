import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Input, Badge } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { normalizeVi } from "../../lib/normalizeVi";

// 16/11/2026 (v1.142, migration 0041) - Danh muc "Đối tác" cua don bao hanh (chot: "Danh mục trong Cài đặt" - tu nap tu CRM, Admin them / sua,
// danh dau doi tac Karofi). Dung chung: Cai dat (DoiTacCard), o chon Doi tac khi phan loai / sua thong tin don, gan doi tac cho vai tro "Tra xac".
export interface DoiTac {
  id: number;
  ten: string;
  la_karofi: number;
  bat_tat: number;
  ghi_chu: string | null;
  so_nguoi_tra_xac?: number;
}

let cache: DoiTac[] | null = null;
let dangTai: Promise<DoiTac[]> | null = null;
export function taiDoiTac(moi = false): Promise<DoiTac[]> {
  if (cache && !moi) return Promise.resolve(cache);
  if (!dangTai || moi) {
    dangTai = api.get<{ rows: DoiTac[] }>("/doi-tac").then((r) => {
      cache = r.rows;
      dangTai = null;
      return r.rows;
    });
  }
  return dangTai;
}
export function useDoiTac(): DoiTac[] {
  const [ds, setDs] = useState<DoiTac[]>(cache ?? []);
  useEffect(() => {
    taiDoiTac().then(setDs).catch(() => undefined);
  }, []);
  return ds;
}

// O chon Doi tac (danh muc dang bat; gia tri dang chon van hien du da tat).
export function DoiTacSelect({ value, onChange, className = "" }: { value: number | null; onChange: (id: number | null) => void; className?: string }) {
  const ds = useDoiTac();
  const hien = ds.filter((d) => d.bat_tat || d.id === value);
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={`focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-sm ${!value ? "border-[var(--red-500)]" : ""} ${className}`}
    >
      <option value="">— Chọn đối tác —</option>
      {hien.map((d) => (
        <option key={d.id} value={d.id}>
          {d.ten}
          {d.la_karofi ? " (Karofi)" : ""}
        </option>
      ))}
    </select>
  );
}

export function DoiTacCard() {
  const toast = useToast();
  const [ds, setDs] = useState<DoiTac[]>([]);
  const [ten, setTen] = useState("");
  const [q, setQ] = useState("");
  const tai = () => taiDoiTac(true).then(setDs).catch((e) => toast(errorMessage(e), "error"));
  useEffect(() => {
    tai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const loc = useMemo(() => {
    const k = normalizeVi(q.trim());
    return k ? ds.filter((d) => normalizeVi(d.ten).includes(k)) : ds;
  }, [ds, q]);
  const sua = async (id: number, b: Record<string, unknown>) => {
    try {
      await api.patch(`/doi-tac/${id}`, b);
      tai();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const them = async () => {
    if (!ten.trim()) return;
    try {
      await api.post("/doi-tac", { ten: ten.trim(), la_karofi: /karofi/i.test(ten) });
      setTen("");
      tai();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const doiTen = async (d: DoiTac) => {
    const moi = window.prompt("Tên đối tác", d.ten);
    if (moi && moi.trim() && moi.trim() !== d.ten) sua(d.id, { ten: moi.trim() });
  };
  return (
    <Card title="🤝 Đối tác (Hãng / đơn bảo hành / trả xác)">
      <p className="text-xs text-[var(--ink-soft)] mb-2">
        Tự nạp từ đối tác CRM của case. Đánh dấu <b>Karofi</b>: đơn còn bảo hành của đối tác Karofi cấp linh kiện dạng "HỖ TRỢ SỬA CHỮA 0 ĐỒNG",
        đối tác khác "CÔNG NỢ SỬA CHỮA", hết bảo hành "MUA HÀNG SỬA CHỮA".
      </p>
      <div className="flex gap-2 mb-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm đối tác…" />
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--line)]">
        <table className="tbl w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              <th className="text-left text-xs">Đối tác</th>
              <th className="text-center text-xs">Karofi</th>
              <th className="text-center text-xs">Bật</th>
              <th className="text-right text-xs">Trả xác</th>
            </tr>
          </thead>
          <tbody>
            {loc.map((d) => (
              <tr key={d.id} className={`border-t border-[var(--line)] ${d.bat_tat ? "" : "opacity-50"}`}>
                <td className="max-w-[260px] truncate">
                  {d.ten}
                  <button type="button" onClick={() => doiTen(d)} className="ml-1 text-xs text-[var(--link)] hover:underline">
                    ✎
                  </button>
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={!!d.la_karofi} onChange={(e) => sua(d.id, { la_karofi: e.target.checked })} />
                </td>
                <td className="text-center">
                  <input type="checkbox" checked={!!d.bat_tat} onChange={(e) => sua(d.id, { bat_tat: e.target.checked })} />
                </td>
                <td className="text-right text-xs text-[var(--ink-soft)]">{d.so_nguoi_tra_xac || ""}</td>
              </tr>
            ))}
            {!loc.length && (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[var(--ink-soft)] py-3">
                  Chưa có đối tác
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-2">
        <Input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Thêm đối tác mới…" onKeyDown={(e) => e.key === "Enter" && them()} />
        <Btn onClick={them} disabled={!ten.trim()}>
          + Thêm
        </Btn>
      </div>
    </Card>
  );
}

// Nut + hop chon doi tac cho tai khoan vai tro "Tra xac" (man Nguoi dung).
export function DoiTacTraXacBtn({ email, ids, onDone }: { email: string; ids: number[]; onDone: () => void }) {
  const toast = useToast();
  const ds = useDoiTac();
  const [mo, setMo] = useState(false);
  const [chon, setChon] = useState<number[]>(ids);
  const [q, setQ] = useState("");
  const [luu, setLuu] = useState(false);
  const ten = ds.filter((d) => ids.includes(d.id)).map((d) => d.ten);
  const loc = ds.filter((d) => (d.bat_tat || chon.includes(d.id)) && (!q.trim() || normalizeVi(d.ten).includes(normalizeVi(q.trim()))));
  const save = async () => {
    setLuu(true);
    try {
      await api.patch(`/users/${encodeURIComponent(email)}`, { doi_tac_ids: chon });
      toast("Đã lưu đối tác trả xác.", "ok");
      setMo(false);
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setLuu(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChon(ids);
          setMo(true);
        }}
        className="text-xs text-[var(--link)] hover:underline max-w-[220px] truncate"
        title={ten.join(", ") || "Chưa gán đối tác — vai trò Trả xác chưa thấy xác nào"}
      >
        {ids.length ? `♻️ ${ten.length ? ten.join(", ") : `${ids.length} đối tác`}` : <Badge tone="amber">♻️ Chưa gán đối tác</Badge>}
      </button>
      {mo && (
        <Modal
          title={`Đối tác trả xác — ${email}`}
          onClose={() => setMo(false)}
          footerActions={
            <>
              <Btn variant="ghost" onClick={() => setMo(false)}>
                Huỷ
              </Btn>
              <Btn variant="primary" onClick={save} disabled={luu}>
                Lưu ({chon.length})
              </Btn>
            </>
          }
        >
          <p className="text-xs text-[var(--ink-soft)] mb-2">Vai trò Trả xác chỉ thấy và xử lý xác / thùng trả xác của các đối tác được chọn.</p>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm đối tác…" className="mb-2" />
          <div className="flex gap-2 mb-2 text-xs">
            <button type="button" className="text-[var(--link)]" onClick={() => setChon([...new Set([...chon, ...loc.map((d) => d.id)])])}>
              Chọn tất cả ({loc.length})
            </button>
            <button type="button" className="text-[var(--link)]" onClick={() => setChon([])}>
              Bỏ chọn
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {loc.map((d) => (
              <label key={d.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[var(--surface-2)] text-sm">
                <input type="checkbox" checked={chon.includes(d.id)} onChange={(e) => setChon(e.target.checked ? [...chon, d.id] : chon.filter((x) => x !== d.id))} />
                {d.ten}
                {d.la_karofi ? <Badge tone="blue">Karofi</Badge> : null}
              </label>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
