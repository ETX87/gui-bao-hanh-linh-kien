import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { lookupCase } from "../lib/caseLookupClient";

// GET /api/case-lookup?id=... - proxy tra cuu 1 case_dvbh THEO ID sang he DVBH goc (chi doc), dung
// chung cho autocomplete o form "Them don bao hanh" (KTV) va "Tao don dich vu tinh phi" (Admin BH) -
// xem CLAUDE.md muc "Giai doan 4" (diem da don gian hoa "Bo tra cuu case CRM tu dong", nay bo sung
// lai theo yeu cau "QA vong 2"). Mo cho MOI vai tro da dang nhap (khong rieng KTV/Admin BH) vi
// UnitDetailModal/PhanLoaiModal cung co the can tra lai thong tin case da gan san.
const caseLookup = new Hono<{ Bindings: Env }>();
caseLookup.use("*", verifySessionMiddleware, loadUser);

caseLookup.get("/", async (c) => {
  const id = (c.req.query("id") || "").trim();
  if (!id) return c.json({ error: "MISSING_ID" }, 400);
  const preview = await lookupCase(id, c.env);
  return c.json({ found: !!preview, preview });
});

export default caseLookup;
