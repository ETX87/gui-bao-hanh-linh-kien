import openpyxl, json, sys
ws = openpyxl.load_workbook(r'C:\Users\HP\Desktop\BBBG_Trả xác LK về KAROFI_18-11.xlsx').active
rows = []; thung = None
for r in range(8, 63):
    b = ws.cell(r, 2).value
    if b is None: continue
    for m in ws.merged_cells.ranges:
        if m.min_col == 5 and m.min_row <= r <= m.max_row: thung = ws.cell(m.min_row, 5).value; break
    else:
        if ws.cell(r, 5).value: thung = ws.cell(r, 5).value
    ten = ' '.join((ws.cell(r, 3).value or '').split())
    for i, x in enumerate((ws.cell(r, 6).value or '').split()):
        rows.append(dict(dong=r, stt=len(rows)+1, ma_hang=str(b), ten=ten, thung=thung, ma=x))
json.dump(rows, open('bbbg_tach.json', 'w', encoding='utf-8'), ensure_ascii=False)
ids = sorted({x['ma'] for x in rows})
open('ids.json', 'w').write(json.dumps(ids))
print(len(rows), len(ids))
