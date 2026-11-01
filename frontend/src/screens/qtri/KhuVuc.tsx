import { useEffect, useState } from "react";
import { Table, StopClick } from "../../ui/Table";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Badge, Spinner, Field, Input } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { Pagination } from "../../ui/Pagination";
import { useClientPage } from "../../hooks/useClientPage";
import type { KhuVucQuanSat } from "../../lib/types";
import { UserName, displayName } from "../../hooks/useUserNames";
import { normalizeVi } from "../../lib/normalizeVi";

// Man "Quan ly Giam sat khu vuc" (qtri, moi 07/09/2026) - gap that phat hien: qtri gan vai tro
// la_giam_sat cho 1 nhan vien nhung khong co cho nao de gan Khu vuc ho phu trach (khu_vuc_bh.gs_email
// - dung de scope "computeEmailGs()"/"tao ho don bao hanh"/danh sach KTV cua GS). Nguon danh sach Khu
// vuc: LAY THANG TU ktv_lien_he_bh.khu_vuc_ma da co san (dong bo tu API), khong bat qtri go tay ma
// khu vuc - xem routes/khuVuc.ts.

export function QtriKhuVucScreen() {
  const [rows, setRows] = useState<KhuVucQuanSat[] | null>(null);
  const [editing, setEditing] = useState<KhuVucQuanSat | null>(null);

  const reload = () => {
    api.get<{ khu_vuc: KhuVucQuanSat[] }>("/khu-vuc").then((r) => setRows(r.khu_vuc));
  };
  useEffect(reload, []);
  // 21/10/2026: tim khu vuc theo ma / ten / giam sat; loc khu vuc chua gan GS.
  const [q, setQ] = useState("");
  const [chuaGan, setChuaGan] = useState(false);
  const words = normalizeVi(q.trim()).split(/\s+/).filter(Boolean);
  const shown = (rows ?? []).filter((r) => {
    if (chuaGan && r.gs_emails.length) return false;
    if (!words.length) return true;
    const hay = normalizeVi([r.ma, r.ten, ...r.gs_emails, ...r.gs_emails.map((e) => displayName(e))].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });
  const pg = useClientPage(shown);
  useEffect(() => pg.setPage(0), [q, chuaGan]); // eslint-disable-line react-hooks/exhaustive-deps

  if (rows === null) return <Spinner />;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🗺️ Giám sát khu vực ({rows.length})</h3>
      </div>
      <p className="text-xs text-[var(--ink-soft)] mb-2">
        Danh sách Khu vực lấy từ mã khu vực đã có sẵn trên từng KTV (đồng bộ từ hệ Đặt mua linh kiện). Gán 1 hoặc nhiều "Giám sát phụ trách" cho 1 Khu vực để các tài khoản đó (vai trò{" "}
        <b>Giám sát</b>) thấy được đúng KTV/đơn bảo hành thuộc khu vực mình, và "tạo hộ đơn" được cho đúng KTV trong khu vực.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Tìm mã / tên khu vực, giám sát…" className="sm:!w-72" />
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)] cursor-pointer">
          <input type="checkbox" checked={chuaGan} onChange={(e) => setChuaGan(e.target.checked)} /> Chỉ khu vực chưa gán Giám sát
        </label>
      </div>
      <Table
        rows={pg.pageItems}
        rowKey={(r) => r.ma}
        onRowClick={(r) => setEditing(r)}
        emptyText="Chưa có KTV nào có mã khu vực — chưa có gì để gán."
        columns={[
          { key: "ten", header: "Khu vực", render: (r) => <span className="font-semibold text-[var(--ink)]">{r.ten || r.ma}</span> },
          { key: "ma", header: "Mã", render: (r) => <span className="font-mono text-xs">{r.ma}</span> },
          { key: "so", header: "Số KTV", render: (r) => r.so_ktv },
          {
            key: "gs",
            header: "Giám sát phụ trách",
            render: (r) =>
              r.gs_emails.length ? (
                <span className="text-xs" title={r.gs_emails.join(", ")}>
                  <UserName email={r.gs_emails[0]} />
                  {r.gs_emails.length > 1 && <span className="text-[var(--ink-soft)]"> +{r.gs_emails.length - 1}</span>}
                </span>
              ) : (
                <Badge tone="orange">Chưa gán</Badge>
              ),
          },
          {
            key: "act",
            header: "",
            render: (r) => (
              <StopClick>
                <Btn size="sm" onClick={() => setEditing(r)}>Gán Giám sát</Btn>
              </StopClick>
            ),
          },
        ]}
      />
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
      {editing && <GanGsModal khuVuc={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </Card>
  );
}

function GanGsModal({ khuVuc, onClose, onDone }: { khuVuc: KhuVucQuanSat; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ten, setTen] = useState(khuVuc.ten || khuVuc.ma);
  // 01/11/2026 ("1 khu vực có thể có nhiều GS cùng phụ trách"): tich chon nhieu GS; GS dau tien = GS
  // chinh (ghi vao don moi tao).
  const [chon, setChon] = useState<string[]>(khuVuc.gs_emails ?? []);
  const [gsList, setGsList] = useState<{ email: string; ten: string | null }[] | null>(null);
  const [tim, setTim] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ users: { email: string; ten: string | null }[] }>("/users/giam-sat").then((r) => setGsList(r.users));
  }, []);

  const toggle = (e: string) => setChon((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));
  const lamChinh = (e: string) => setChon((cur) => [e, ...cur.filter((x) => x !== e)]);

  const words = normalizeVi(tim.trim()).split(/\s+/).filter(Boolean);
  const list = (gsList ?? []).filter((u) => !words.length || words.every((w) => normalizeVi(`${u.ten || ""} ${u.email}`).includes(w)));
  // GS dang gan nhung khong con vai tro Giam sat (bi go vai tro / khoa) -> bo khi luu.
  const ngoaiDs = gsList ? chon.filter((e) => !gsList.some((u) => u.email.toLowerCase() === e)) : [];
  const conLai = chon.filter((e) => !ngoaiDs.includes(e));

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/khu-vuc/${encodeURIComponent(khuVuc.ma)}`, { ten: ten.trim(), gs_emails: conLai });
      toast("Đã cập nhật Khu vực.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Khu vực ${khuVuc.ma}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || !ten.trim() || gsList === null} onClick={submit}>
            Lưu{conLai.length ? ` (${conLai.length} GS)` : ""}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên khu vực" required>
          <Input value={ten} onChange={(e) => setTen(e.target.value)} />
        </Field>
        <Field label="Giám sát phụ trách (chọn được nhiều người)">
          {gsList === null ? (
            <Spinner />
          ) : gsList.length === 0 ? (
            <p className="text-xs text-[var(--red-600)]">Chưa có tài khoản nào mang vai trò Giám sát — gán vai trò ở màn "Người dùng" trước.</p>
          ) : (
            <div className="space-y-2">
              {gsList.length > 6 && <Input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="🔍 Tìm giám sát…" />}
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--line)] divide-y divide-[var(--line)]">
                {list.map((u) => {
                  const e = u.email.toLowerCase();
                  const idx = chon.indexOf(e);
                  return (
                    <label key={u.email} className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-[var(--surface-2)]">
                      <input type="checkbox" checked={idx >= 0} onChange={() => toggle(e)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--ink)] truncate">{u.ten || u.email}</span>
                        <span className="block text-[11px] text-[var(--ink-soft)] truncate">{u.email}</span>
                      </span>
                      {idx === 0 ? (
                        <Badge tone="green">GS chính</Badge>
                      ) : idx > 0 ? (
                        <button
                          type="button"
                          className="text-[11px] text-[var(--link)] hover:underline whitespace-nowrap"
                          onClick={(ev) => {
                            ev.preventDefault();
                            lamChinh(e);
                          }}
                        >
                          Đặt làm GS chính
                        </button>
                      ) : null}
                    </label>
                  );
                })}
                {list.length === 0 && <p className="px-2.5 py-2 text-xs text-[var(--ink-soft)]">Không tìm thấy.</p>}
              </div>
              {ngoaiDs.length > 0 && (
                <p className="text-xs text-[var(--red-600)]">{ngoaiDs.join(", ")} không còn vai trò Giám sát — sẽ được bỏ khỏi khu vực khi lưu.</p>
              )}
              <p className="text-[11px] text-[var(--ink-soft)]">
                Mọi Giám sát được tích đều thấy KTV, đơn bảo hành và tạo hộ đơn được cho KTV trong khu vực này. "GS chính" là người ghi trên đơn mới tạo. Bỏ tích hết = khu vực chưa có Giám sát.
              </p>
            </div>
          )}
        </Field>
      </div>
    </Modal>
  );
}
