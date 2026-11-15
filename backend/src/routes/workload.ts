import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { demWorkload } from "../lib/workload";

// GET /api/workload - dem viec can lam (logic o lib/workload.ts, dung chung voi ban tong hop thong bao 12h).
const workload = new Hono<{ Bindings: Env }>();
workload.use("*", verifySessionMiddleware, loadUser);
workload.get("/", async (c) => c.json({ counts: await demWorkload(c.env.DB, c.get("user")) }));

export default workload;
