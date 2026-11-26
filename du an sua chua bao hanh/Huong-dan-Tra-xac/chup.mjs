// Chup anh huong dan bang Chrome headless (CDP qua WebSocket co san cua Node) tu app chay thu LOCAL (du lieu mau).
// Chay: node chup.mjs   (can: npm run dev:worker + npm run dev:frontend dang chay, LOCAL_DEV_BYPASS_AUTH=true)
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ANH = join(DIR, "anh");
const APP = "http://localhost:5175";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const W = 1366, H = 860;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prof = mkdtempSync(join(tmpdir(), "chup-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${W},${H}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let ver;
for (let i = 0; i < 50 && !ver; i++) { await sleep(200); ver = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()).catch(() => null); }
const tgt = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const cho = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && cho.has(m.id)) { cho.get(m.id)(m); cho.delete(m.id); } };
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; cho.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => { const r = await cdp("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log("JS loi:", JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const di = async (url, ms = 2500) => { await cdp("Page.navigate", { url }); await sleep(ms); };
const chup = async (ten) => { const r = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(join(ANH, `${ten}.png`), Buffer.from(r.result.data, "base64")); console.log("chup", ten); };
const bam = (chu) => js(`const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(chu)})); if(!b) return 'khong thay ${chu}'; b.click(); return 'ok'`);

await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await di(`${APP}/api/auth/dev-login`);
await di(`${APP}/tra-xac#/tra-xac?tab=cho_gom`, 3500);

// 1) Import BBBG - xem truoc ket qua doi chieu
console.log(await bam("Import BBBG"));
await sleep(800);
const b64 = readFileSync(join(DIR, "..", "Doi-chieu-BBBG-tra-xac-KAROFI_18-11", "BBBG_thu_local.xlsx")).toString("base64");
console.log(await js(`const bin=Uint8Array.from(atob(${JSON.stringify(b64)}),c=>c.charCodeAt(0)); const f=new File([bin],'BBBG_tra_xac_KAROFI_mau.xlsx');
  const inp=[...document.querySelectorAll('input[type=file]')].pop(); const dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'nap file'`));
await sleep(2500);
await chup("tx-13-import-bbbg");

// 2) Chi tiet thung - nut Tai BBBG + thanh Ghi kien + cot Kien
await di(`${APP}/tra-xac#/tra-xac?tab=nhap`, 3000);
console.log(await js(`const a=[...document.querySelectorAll('span,a,td,div')].find(x=>x.childElementCount===0 && x.textContent.trim()==='TX-000005'); if(!a) return 'khong thay thung'; (a.closest('tr')||a).click(); return 'mo thung'`));
await sleep(2000);
await chup("tx-14-chi-tiet-tai-bbbg");
console.log(await bam("Xem chi tiết"));
await sleep(1200);
console.log(await js(`const m=document.querySelector('[role=dialog]')||document.body; const sc=[...m.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+40 && getComputedStyle(e).overflowY!=='visible'); const g=[...m.querySelectorAll('span')].find(x=>x.textContent.includes('Ghi kiện')); g&&g.scrollIntoView({block:'center'}); const cb=[...m.querySelectorAll('tbody input[type=checkbox]')][0]; cb&&cb.click(); return 'chon xac'`));
await sleep(500);
console.log(await js(`const i=[...document.querySelectorAll('input[placeholder^="VD 1"]')][0]; if(!i) return 'khong thay o kien'; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'Thùng 3'); i.dispatchEvent(new Event('input',{bubbles:true})); return 'go kien'`));
await sleep(600);
await chup("tx-15-ghi-kien");

// 3) Ban BBBG (xem truoc file Excel, du lieu mau) - trang HTML dung tu file xlsx
await di("file:///" + join(DIR, "bbbg_xem.html").replace(/\\/g, "/"), 1500);
await chup("tx-16-bbbg-excel");

ws.close();
chrome.kill();
