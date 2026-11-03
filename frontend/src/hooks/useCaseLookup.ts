import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CaseLookupPreview } from "../lib/types";

export type CaseLookupStatus = "idle" | "loading" | "found" | "not_found" | "error" | "dvbh_down" | "cho_dong_bo";

export interface CaseLookupResult {
  preview: CaseLookupPreview | null;
  status: CaseLookupStatus;
  khopKtv: boolean | null;
  check: () => void;
}

// Tra cuu 1 case theo ID qua GET /api/case-lookup (proxy sang he DVBH goc).
//
// 05/10/2026 (yeu cau "thêm nút ấn kiểm tra thì mới kiểm tra với bên dvbh, tránh việc gửi api hỏi liên
// tục mỗi khi nhập 1 ký tự"): mac dinh CHE DO THU CONG - chi goi khi bam "Kiểm tra" (hoac Enter); go
// sua ma case thi ket qua cu bi xoa ve "idle". auto=true chi dung cho noi ma case CO DINH, khong go
// (PhanLoaiModal) - goi 1 lan khi mo.
//
// ktvEmail (tuy chon): backend tra them `khopKtv` doi chieu ma KTV tren case voi KTV nay.
export function useCaseLookup(caseId: string, ktvEmail?: string, auto = false): CaseLookupResult {
  const [preview, setPreview] = useState<CaseLookupPreview | null>(null);
  const [status, setStatus] = useState<CaseLookupStatus>("idle");
  const [khopKtv, setKhopKtv] = useState<boolean | null>(null);
  const checkedId = useRef("");
  const seq = useRef(0);

  const run = useCallback(
    async (id: string) => {
      if (!id) return;
      setStatus("loading");
      checkedId.current = id;
      const mySeq = ++seq.current;
      try {
        const qs = new URLSearchParams({ id });
        if (ktvEmail) qs.set("ktv_email", ktvEmail);
        const r = await api.get<{ found: boolean; preview: CaseLookupPreview | null; khopKtv: boolean | null; loi_dvbh?: boolean; cho_dong_bo?: boolean }>(`/case-lookup?${qs.toString()}`);
        if (seq.current !== mySeq) return;
        setPreview(r.preview);
        setStatus(r.found ? "found" : r.loi_dvbh ? "dvbh_down" : r.cho_dong_bo ? "cho_dong_bo" : "not_found");
        setKhopKtv(r.khopKtv ?? null);
      } catch {
        if (seq.current !== mySeq) return;
        setPreview(null);
        setStatus("error");
        setKhopKtv(null);
      }
    },
    [ktvEmail],
  );

  useEffect(() => {
    const id = caseId.trim();
    if (auto) {
      if (id) run(id);
      return;
    }
    // Che do thu cong: ma case doi khac ma da kiem tra -> xoa ket qua cu (bat kiem tra lai).
    if (id !== checkedId.current) {
      seq.current++;
      checkedId.current = "";
      setPreview(null);
      setStatus("idle");
      setKhopKtv(null);
    }
  }, [caseId, auto, run]);

  const check = useCallback(() => {
    run(caseId.trim());
  }, [run, caseId]);

  return { preview, status, khopKtv, check };
}
