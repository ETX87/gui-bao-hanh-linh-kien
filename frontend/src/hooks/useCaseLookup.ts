import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CaseLookupPreview } from "../lib/types";

export type CaseLookupStatus = "idle" | "loading" | "found" | "not_found" | "error";

// Tra cuu 1 case theo ID, debounce 500ms - dung o AddDonModal/AddDonMobileSheet (KTV)/DonDichVuModal
// (Admin BH)/PhanLoaiModal, goi GET /api/case-lookup (proxy sang he DVBH goc). Bo qua ket qua cu neu
// caseId da doi truoc khi request tra ve (tranh "race" khi go nhanh nhieu ky tu).
//
// ktvEmail (tuy chon, them 05/09/2026 muc 2 "mã sự cố... phải đúng của ktv đó mới cho tạo"): khi co,
// backend tra them `khopKtv` (true/false/null - null = chua tra cuu xong/khong co case_id) doi chieu
// ma KTV trich tu case voi chinh KTV nay - dung cho AddDonModal/AddDonMobileSheet (context luon gan
// voi 1 KTV cu the), KHONG dung cho DonDichVuModal/PhanLoaiModal (khong co "1 KTV" ro rang hoac case
// tuy chon).
export function useCaseLookup(caseId: string, ktvEmail?: string) {
  const [preview, setPreview] = useState<CaseLookupPreview | null>(null);
  const [status, setStatus] = useState<CaseLookupStatus>("idle");
  const [khopKtv, setKhopKtv] = useState<boolean | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const id = caseId.trim();
    if (!id) {
      setPreview(null);
      setStatus("idle");
      setKhopKtv(null);
      return;
    }
    setStatus("loading");
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ id });
        if (ktvEmail) qs.set("ktv_email", ktvEmail);
        const r = await api.get<{ found: boolean; preview: CaseLookupPreview | null; khopKtv: boolean | null }>(`/case-lookup?${qs.toString()}`);
        if (seq.current !== mySeq) return; // caseId da doi, bo ket qua cu
        setPreview(r.preview);
        setStatus(r.found ? "found" : "not_found");
        setKhopKtv(r.khopKtv ?? null);
      } catch {
        if (seq.current !== mySeq) return;
        setPreview(null);
        setStatus("error");
        setKhopKtv(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [caseId, ktvEmail]);

  return { preview, status, khopKtv };
}
