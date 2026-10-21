import { useEffect, useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { FilterBar, useListFilters, withQuery, type FilterDef } from "../../ui/FilterBar";
import { detectMien, type TuKhoa } from "../../lib/mien";
import { Table, StopClick } from "../../ui/Table";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Field, Input, Select } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { Modal } from "../../ui/Modal";
import type { KtvLienHe } from "../../lib/types";

const VAI_TRO_OPTIONS = ["KTV", "CTV", "Tram", "Ve tinh"];

const KTV_DEFS: FilterDef[] = [
  { key: "khu_vuc", label: "Khu vực", noneLabel: "Chưa có khu vực" },
  { key: "vai_tro", label: "Vai trò", noneLabel: "Chưa có" },
  { key: "nguon", label: "Nguồn", kind: "map", labels: { dong_bo: "Đồng bộ", noi_bo: "Nội bộ" } },
  { key: "mien_gan", label: "Miền gán tạm", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Không gán" },
];

// Man "Quan ly danh sach KTV" (qtri, moi 04/09/2026) - CRUD ktv_lien_he_bh. Gap that phat hien: bang
// nay truoc gio chi nhan duoc du lieu qua sync day tu linh-kien-app (chua trien khai xong ben do),
// nen dang RONG tren production - khong co gi de auth.ts (GET /callback) doi chieu tu dong duyet tai
// khoan KTV dang nhap lan dau. Man nay cho qtri tu khai bao thu cong ngay, khong can cho sync.
// QUAN TRONG: chi ap dung cho lan DANG NHAP TIEP THEO cua KTV do (auth.ts chi kiem tra luc OAuth
// callback) - neu tai khoan da ton tai san va dang "Cho duyet", can qtri tu duyet tay o man "Người
// dùng" (hoac doi KTV dang xuat/dang nhap lai) de duoc tu dong nang len "Da duyet".

export function QtriKtvScreen() {
  const toast = useToast();
  const flt = useListFilters("/ktv-lien-he", KTV_DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, loading, reload } = usePagedApi<KtvLienHe>(withQuery("/ktv-lien-he", flt.query), "ktv");
  const [editing, setEditing] = useState<KtvLienHe | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tuKhoa, setTuKhoa] = useState<TuKhoa[]>([]);
  useEffect(() => {
    api
      .get<{ tu_khoa: TuKhoa[] }>("/mien/tu-khoa")
      .then((r) => setTuKhoa(r.tu_khoa))
      .catch(() => undefined);
  }, []);

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

  if (loading && items.length === 0 && !flt.active) return <Spinner />;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📇 Danh sách KTV / CTV / Trạm ({total})</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Btn variant="primary" onClick={() => setAddOpen(true)}>
            + Khai báo KTV
          </Btn>
        </div>
      </div>
      <FilterBar f={flt} defs={KTV_DEFS} placeholder="Tìm theo tên / email / SĐT / mã / khu vực…" />
      <p className="text-xs text-[var(--ink-soft)] mb-2">
        KTV có trong danh sách này sẽ <b>tự động được duyệt</b> ngay khi đăng nhập lần đầu bằng đúng email đăng nhập bên dưới — không cần chờ Admin hệ thống duyệt tay ở màn "Người dùng".
      </p>
      <Table
        rows={items}
        rowKey={(k) => k.ma_ktv}
        onRowClick={(k) => setEditing(k)}
        emptyText='Chưa có KTV nào trong danh bạ — bấm "+ Khai báo KTV" để thêm.'
        columns={[
          { key: "ten", header: "Tên hiển thị", render: (k) => <span className="font-semibold text-[var(--ink)]">{k.ten_hien_thi || "—"}</span> },
          { key: "email", header: "Email đăng nhập", render: (k) => <span className="font-mono text-xs">{k.email_dang_nhap || "—"}</span> },
          { key: "sdt", header: "SĐT", render: (k) => k.sdt || "—" },
          { key: "vt", header: "Vai trò", render: (k) => k.vai_tro_ktv || "—" },
          { key: "kv", header: "Khu vực", render: (k) => k.khu_vuc_ma || "—" },
          {
            key: "mien",
            header: "Miền",
            render: (k) =>
              k.mien_gan ? (
                <span className="inline-flex items-center gap-1" title="Miền gán tạm (ưu tiên hơn miền suy từ khu vực)">
                  <MienBadge mien={k.mien_gan} short />
                  <span className="text-[10px] text-[var(--amber-700)]">tạm</span>
                </span>
              ) : (
                <MienBadge mien={detectMien(k.khu_vuc_ma, tuKhoa)} short />
              ),
          },
          { key: "nguon", header: "Nguồn", render: (k) => <Badge tone={k.nguon_du_lieu === "dong_bo" ? "blue" : "gray"}>{k.nguon_du_lieu === "dong_bo" ? "Đồng bộ" : "Nội bộ"}</Badge> },
          {
            key: "act",
            header: "",
            render: (k) => (
              <StopClick>
                <Btn variant="ghost" size="sm" className="!text-[var(--red-600)] hover:!bg-[var(--red-50)]" onClick={() => xoa(k.ma_ktv)}>
                  ✕ Xoá
                </Btn>
              </StopClick>
            ),
          },
        ]}
      />
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
  const [mienGan, setMienGan] = useState<string>(existing?.mien_gan || "");
  const [busy, setBusy] = useState(false);

  const valid = ten.trim() && email.trim();

  const submit = async () => {
    setBusy(true);
    try {
      const body = { ten_hien_thi: ten.trim(), email_dang_nhap: email.trim(), sdt: sdt.trim(), gmail: gmail.trim(), vai_tro_ktv: vaiTro, khu_vuc_ma: khuVuc.trim() };
      if (existing) {
        await api.patch(`/ktv-lien-he/${encodeURIComponent(existing.ma_ktv)}`, body);
        if (mienGan !== (existing.mien_gan || "")) await api.put(`/mien/ktv/${encodeURIComponent(existing.ma_ktv)}`, { mien_gan: mienGan || null });
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
        {existing && (
          <Field label="Miền gán tạm" hint="Ưu tiên hơn miền suy từ mã khu vực. Để trống = theo khu vực.">
            <Select value={mienGan} onChange={(e) => setMienGan(e.target.value)}>
              <option value="">Theo khu vực</option>
              <option value="MB">Miền Bắc</option>
              <option value="MN">Miền Nam</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
