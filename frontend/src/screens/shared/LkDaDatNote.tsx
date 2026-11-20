// 20/11/2026 (v1.150) - dong nhac duoi o chon linh kien khi case co linh kien da dat ben app Dat linh kien.
export function LkDaDatNote({ n }: { n: number }) {
  if (!n) return null;
  return (
    <p className="mt-1 text-[11px] text-[var(--brand-700)]">
      📦 Case này đã đặt {n} linh kiện bên app Đặt linh kiện — đã xếp lên đầu danh sách.
    </p>
  );
}
