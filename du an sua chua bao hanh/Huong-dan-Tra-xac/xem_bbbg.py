# Ve sheet BBBG cua bbbg_mau.xlsx thanh trang HTML giong luoi Excel (o gop, chu dam, vien) -> bbbg_xem.html (de chup anh huong dan).
# Chay: python xem_bbbg.py
import html
import openpyxl
from openpyxl.utils import get_column_letter

wb = openpyxl.load_workbook("bbbg_mau.xlsx")
ws = wb["BBBG"]
gop, an = {}, set()
for m in ws.merged_cells.ranges:
    gop[(m.min_row, m.min_col)] = (m.max_row - m.min_row + 1, m.max_col - m.min_col + 1)
    for r in range(m.min_row, m.max_row + 1):
        for c in range(m.min_col, m.max_col + 1):
            if (r, c) != (m.min_row, m.min_col):
                an.add((r, c))
ncol = 6
rong = [ws.column_dimensions[get_column_letter(c)].width or 10 for c in range(1, ncol + 1)]
out = ['<table><tr><th class="g"></th>' + "".join(f'<th class="g" style="width:{w*7.2:.0f}px">{get_column_letter(i+1)}</th>' for i, w in enumerate(rong)) + "</tr>"]
for r in range(1, ws.max_row + 1):
    o = [f'<tr><th class="g">{r}</th>']
    for c in range(1, ncol + 1):
        if (r, c) in an:
            continue
        cell = ws.cell(r, c)
        v = "" if cell.value is None else str(cell.value)
        st = []
        if cell.font and cell.font.b:
            st.append("font-weight:700")
        if cell.font and cell.font.i:
            st.append("font-style:italic")
        if cell.font and cell.font.sz and cell.font.sz > 12:
            st.append("font-size:17px")
        if cell.border and cell.border.left and cell.border.left.style:
            st.append("border:1px solid #333")
        al = cell.alignment.horizontal if cell.alignment else None
        if al == "center" or (r, c) in gop and r <= 3:
            st.append("text-align:center")
        if isinstance(cell.value, (int, float)):
            st.append("text-align:right" if al != "center" else "")
        sp = gop.get((r, c))
        span = f' rowspan="{sp[0]}" colspan="{sp[1]}"' if sp else ""
        o.append(f'<td{span} style="{";".join(s for s in st if s)}">{html.escape(v)}</td>')
    out.append("".join(o) + "</tr>")
out.append("</table>")
page = f"""<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#fff;font-family:Arial,sans-serif;font-size:13px}}
.bar{{background:#217346;color:#fff;padding:6px 12px;font-size:13px}} .tabs{{background:#f3f3f3;border-top:1px solid #ccc;padding:4px 10px;font-size:12px}}
.tabs b{{background:#fff;border:1px solid #ccc;border-top:0;padding:3px 10px;margin-right:4px}} .tabs span{{padding:3px 10px;color:#555}}
table{{border-collapse:collapse;table-layout:fixed}} td,th{{border:1px solid #e1e1e1;padding:3px 5px;height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:top}}
th.g{{background:#f3f3f3;color:#555;font-weight:400;text-align:center;width:34px}}
</style></head><body><div class="bar">BBBG_TX-000123_KAROFI_26-11-2026.xlsx — Excel (dữ liệu mẫu)</div>{''.join(out)}
<div class="tabs"><b>BBBG</b><span>Chi tiet xac</span><span>Theo kien</span></div></body></html>"""
open("bbbg_xem.html", "w", encoding="utf-8").write(page)
print("ok", ws.max_row)
