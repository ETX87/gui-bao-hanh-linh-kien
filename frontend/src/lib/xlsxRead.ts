// Doc file .xlsx (sheet dau tien) hoac .csv thanh mang dong chuoi - khong them thu vien: giai nen zip bang
// DecompressionStream("deflate-raw") cua trinh duyet, doc XML bang DOMParser. Dung cho import danh muc
// linh kien (2026-10-11). Ho tro o chuoi chung (sharedStrings), inlineStr, so, cong thuc (lay gia tri).

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data.slice().buffer as ArrayBuffer]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf: ArrayBuffer, wanted: (name: string) => boolean): Promise<Map<string, string>> {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  // Tim End of Central Directory tu cuoi file.
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("FILE_KHONG_PHAI_XLSX");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, string>();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const loff = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!wanted(name)) continue;
    const start = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    const raw = u8.subarray(start, start + csize);
    const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
    if (data) out.set(name, dec.decode(data));
  }
  return out;
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(el: Element | null): string {
  if (!el) return "";
  // <si>/<is> co the gom nhieu <r><t> (rich text) - noi tat ca <t>.
  return Array.from(el.getElementsByTagName("t"))
    .map((t) => t.textContent ?? "")
    .join("");
}

async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf, (n) => n === "xl/sharedStrings.xml" || n === "xl/workbook.xml" || n === "xl/_rels/workbook.xml.rels" || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const parser = new DOMParser();
  // Sheet dau tien theo thu tu trong workbook.xml (khong mac dinh sheet1.xml - Excel co the danh so khac).
  let sheetPath = "";
  const wb = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const first = parser.parseFromString(wb, "application/xml").getElementsByTagName("sheet")[0];
    const rid = first?.getAttribute("r:id") || first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = Array.from(parser.parseFromString(rels, "application/xml").getElementsByTagName("Relationship")).find((r) => r.getAttribute("Id") === rid);
    const target = rel?.getAttribute("Target") || "";
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheetXml = files.get(sheetPath) ?? files.get("xl/worksheets/sheet1.xml") ?? Array.from(files.entries()).find(([k]) => k.startsWith("xl/worksheets/"))?.[1];
  if (!sheetXml) throw new Error("FILE_KHONG_CO_SHEET");
  const shared = files.get("xl/sharedStrings.xml")
    ? Array.from(parser.parseFromString(files.get("xl/sharedStrings.xml")!, "application/xml").getElementsByTagName("si")).map((si) => textOf(si))
    : [];
  const doc = parser.parseFromString(sheetXml, "application/xml");
  const rows: string[][] = [];
  for (const row of Array.from(doc.getElementsByTagName("row"))) {
    const r: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const ref = c.getAttribute("r");
      const idx = ref ? colIndex(ref) : r.length;
      const t = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const val = t === "s" ? (shared[Number(v)] ?? "") : t === "inlineStr" ? textOf(c.getElementsByTagName("is")[0]) : v;
      while (r.length < idx) r.push("");
      r[idx] = val;
    }
    rows.push(r);
  }
  return rows;
}

function readCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const firstLine = t.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function readSheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return readCsv(await file.text());
  if (name.endsWith(".xls")) throw new Error("XLS_CU");
  return readXlsx(await file.arrayBuffer());
}
