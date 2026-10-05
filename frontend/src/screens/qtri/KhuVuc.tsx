import { useEffect, useState } from "react";
import { Table, StopClick } from "../../ui/Table";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Badge, Spinner, Field, Input } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { Pagination } from "../../ui/Pagination";
import { useClientPage } from "../../hooks/useClientPage";
import type { KhuVucQuanSat } from "../../lib/types";

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
  const pg = useClientPage(rows ?? []);

  if (rows === null) return <Spinner />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🗺️ Giám sát khu vực ({rows.length})</h3>
      </div>
      <p className="text-xs text-[var(--ink-soft)] mb-3">
        Danh sách Khu vực lấy từ mã khu vực đã có sẵn trên từng KTV (đồng bộ từ hệ Đặt mua linh kiện). Gán "Giám sát phụ trách" cho 1 Khu vực để tài khoản đó (vai trò{" "}
        <b>Giám sát</b>) thấy được đúng KTV/đơn bảo hành thuộc khu vực mình, và "tạo hộ đơn" được cho đúng KTV trong khu vực.
      </p>
      <Table
        rows={pg.pageItems}
        rowKey={(r) => r.ma}
        onRowClick={(r) => setEditing(r)}
        emptyText="Chưa có KTV nào có mã khu vực — chưa có gì để gán."
        columns={[
          { key: "ten", header: "Khu vực", render: (r) => <span className="font-semibold text-[var(--ink)]">{r.ten || r.ma}</span> },
          { key: "ma", header: "Mã", render: (r) => <span className="font-mono text-xs">{r.ma}</span> },
          { key: "so", header: "Số KTV", render: (r) => r.so_ktv },
          { key: "gs", header: "Giám sát phụ trách", render: (r) => (r.gs_email ? <span className="text-xs">{r.gs_email}</span> : <Badge tone="orange">Chưa gán</Badge>) },
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
  const [gsEmail, setGsEmail] = useState(khuVuc.gs_email || "");
  const [gsList, setGsList] = useState<{ email: string; ten: string | null }[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ users: { email: string; ten: string | null }[] }>("/users/giam-sat").then((r) => setGsList(r.users));
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/khu-vuc/${encodeURIComponent(khuVuc.ma)}`, { ten: ten.trim(), gs_email: gsEmail || null });
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
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || !ten.trim()} onClick={submit}>
            Lưu
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tên khu vực" required>
          <Input value={ten} onChange={(e) => setTen(e.target.value)} />
        </Field>
        <Field label="Giám sát phụ trách">
          {gsList === null ? (
            <Spinner />
          ) : gsList.length === 0 ? (
            <p className="text-xs text-[var(--red-600)]">Chưa có tài khoản nào mang vai trò Giám sát — gán vai trò ở màn "Người dùng" trước.</p>
          ) : (
            <SearchableSelect
              placeholder="— Không gán ai —"
              options={gsList.map((u) => ({ value: u.email, label: `${u.ten || u.email} — ${u.email}` }))}
              value={gsEmail}
              onChange={setGsEmail}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
