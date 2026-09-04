import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { CaseLookupPreview } from "../lib/types";

export type CaseLookupStatus = "idle" | "loading" | "found" | "not_found" | "error";

// Tra cuu 1 case theo ID, debounce 500ms - dung o AddDonModal (KTV)/DonDichVuModal (Admin BH), goi
// GET /api/case-lookup (proxy sang he DVBH goc). Bo qua ket qua cu neu caseId da doi truoc khi request
// tra ve (tranh "race" khi go nhanh nhieu ky tu).
export function useCaseLookup(caseId: string) {
  const [preview, setPreview] = useState<CaseLookupPreview | null>(null);
  const [status, setStatus] = useState<CaseLookupStatus>("idle");
  const seq = useRef(0);

  useEffect(() => {
    const id = caseId.trim();
    if (!id) {
      setPreview(null);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ found: boolean; preview: CaseLookupPreview | null }>(`/case-lookup?id=${encodeURIComponent(id)}`);
        if (seq.current !== mySeq) return; // caseId da doi, bo ket qua cu
        setPreview(r.preview);
        setStatus(r.found ? "found" : "not_found");
      } catch {
        if (seq.current !== mySeq) return;
        setPreview(null);
        setStatus("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [caseId]);

  return { preview, status };
}
