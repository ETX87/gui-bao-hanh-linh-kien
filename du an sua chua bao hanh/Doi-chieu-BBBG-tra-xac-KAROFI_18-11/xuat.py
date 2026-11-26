import json, collections, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
sys.stdout.reconfigure(encoding='utf-8')
K = json.load(open('ketqua.json', encoding='utf-8')); T = json.load(open('d1_them.json', encoding='utf-8'))
kq, con, dt, cho = K['kq'], K['con'], T['dt'], T['cho']
HX = {'doi_moi': 'Đổi mới', 'tu_choi': 'Từ chối', 'xac_nhan_tru_no': 'Xác nhận trừ nợ', 'sua_chua': 'Sửa chữa', 'sua_chua_cap_lk': 'Cấp LK sửa chữa'}
XL = {'tra_doi_tac': 'Trả đối tác', None: '', 'tieu_huy': 'Tiêu huỷ', 'luu_kho': 'Lưu kho'}
MAU = {'Khớp – đang chờ gom': 'C6EFCE', 'Khớp – app đã đánh dấu xử lý ngoài': 'FFEB9C'}


def mau(kl):
    if kl.startswith('Khớp – đang chờ gom ('):
        return 'E2EFDA'
    return MAU.get(kl, 'FFC7CE')


wb = Workbook(); H = Font(bold=True, color='FFFFFF'); HF = PatternFill('solid', fgColor='2E7D32')


def sheet(ws, head, data, widths, fill_col=None):
    ws.append(head)
    for c in ws[1]:
        c.font = H; c.fill = HF; c.alignment = Alignment(wrap_text=True, vertical='center')
    for row in data:
        ws.append(row)
        if fill_col is not None:
            ws.cell(ws.max_row, fill_col + 1).fill = PatternFill('solid', fgColor=mau(row[fill_col]))
    for i, w in enumerate(widths):
        ws.column_dimensions[get_column_letter(i + 1)].width = w
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions


# 1 Tong hop
ws = wb.active; ws.title = 'Tong hop'
cnt = collections.Counter(k['ket_luan'] for k in kq)
nhom = [('Khớp – đang chờ gom', 'Đúng case + đúng mã LK, xác Đổi mới / Trả đối tác, đang chờ gom → đưa vào thùng TX được'),
        ('Khớp – đang chờ gom (khớp theo mã A/C)', 'Đúng case, BBBG ghi mã LK A (máy) hoặc C; app tính xác theo mã B (LK thực nhận) khác → kiểm xác thật, sửa mã cho thống nhất'),
        ('Lệch mã LK', 'Đúng case nhưng mã LK BBBG khác mọi mã A/B/C trong app → kiểm xác thật trong thùng'),
        ('Khớp – app đã đánh dấu xử lý ngoài', 'Đơn trước 01/11/2026, app đã tự đánh dấu "đã xử lý ngoài" → nếu thật sự trả đợt này: "Đưa lại chờ gom" rồi gom vào thùng'),
        ('Đơn trừ nợ (không trả xác)', 'Đơn hướng "Xác nhận trừ nợ" – app không coi là xác trả đối tác → kiểm vì sao xác lại nằm trong thùng'),
        ('Thừa: case đã ghép hết đơn vị', 'BBBG ghi nhiều xác hơn số đơn vị của case trong app')]
ws.append(['ĐỐI CHIẾU BBBG TRẢ XÁC KAROFI 18/11/2026 VỚI DỮ LIỆU THẬT APP BẢO HÀNH (D1, tra ngày 26/11/2026)']); ws['A1'].font = Font(bold=True, size=13)
ws.append([]); ws.append(['Kết luận', 'Số xác', 'Ý nghĩa / việc cần làm'])
for c in ws[3]:
    c.font = H; c.fill = HF
for n, y in nhom:
    ws.append([n, cnt.get(n, 0), y]); ws.cell(ws.max_row, 1).fill = PatternFill('solid', fgColor=mau(n))
ws.append(['Tổng dòng BBBG', len(kq), '451 mã case / Lada – 100% tìm thấy trong app, tất cả miền Bắc'])
ws.append([])
ws.append(['App có xác trả đối tác của các case này nhưng BBBG không ghi', len(con), 'Xem sheet "App co - BBBG thieu"'])
dset = {k['xac_id'] for k in kq}
cho_mb = [c for c in cho if c['mien'] == 'MB' and c['doi_tac'] in ('KAROFI', '[KRF-KAROFI]')]
ngoai_bbbg = [c for c in cho_mb if c['id'] not in dset]
ws.append(['Xác KAROFI miền Bắc đang chờ gom trong app (toàn hệ thống)', len(cho_mb), 'Chưa có thùng TX nào được tạo trên app'])
ws.append(['  … trong đó KHÔNG có trong BBBG này', len(ngoai_bbbg), 'Xem sheet "Cho gom MB chua trong BBBG" – còn ở kho hay đã trả mà không ghi?'])
khac_dt = [k for k in kq if dt.get(k['ma']) != 'KAROFI']
ws.append(['Case trong BBBG có đối tác khác "KAROFI"', len(khac_dt), '; '.join(sorted({f"{k['ma']} ({dt.get(k['ma'])})" for k in khac_dt}))])
ws.column_dimensions['A'].width = 62; ws.column_dimensions['B'].width = 10; ws.column_dimensions['C'].width = 120

# 2 Chi tiet
sheet(wb.create_sheet('Chi tiet 511 xac'),
      ['STT', 'Dòng BBBG', 'Thùng (BBBG)', 'Mã hàng BBBG (cột B)', 'Tên vật tư', 'Mã case / Lada', 'Kết luận', 'Mã xác app', 'LK B app (xác)', 'LK A app (máy)',
       'Hướng xử lý', 'Xử lý xác', 'Trạng thái đơn vị', 'Kết quả xác app', 'Ngày tạo đơn', 'Đối tác (app)'],
      [[k['stt'], k['dong'], k['thung'], k['ma_hang'], k['ten'], k['ma'], k['ket_luan'], k['xac_id'], k['lk_app'], k['lk_a'], HX.get(k['huong'], k['huong']),
        XL.get(k['xlx'], k['xlx']), k['tt'], 'Đã xử lý ngoài' if k['xac_tt'] == 'ngoai' else (k['xac_tt'] or ''), k['p_ngay'], dt.get(k['ma'])] for k in kq],
      [6, 8, 18, 14, 34, 15, 40, 22, 22, 16, 15, 12, 22, 14, 18, 14], fill_col=6)

# 3 Theo ma hang
g = collections.OrderedDict()
for k in kq:
    x = g.setdefault(k['ma_hang'], dict(ten=k['ten'], thung=k['thung'], sl=0, ok=0, ac=0, lech=0, ngoai=0, khac=0))
    x['sl'] += 1; kl = k['ket_luan']
    if kl == 'Khớp – đang chờ gom': x['ok'] += 1
    elif 'A/C' in kl: x['ac'] += 1
    elif kl == 'Lệch mã LK': x['lech'] += 1
    elif 'ngoài' in kl: x['ngoai'] += 1
    else: x['khac'] += 1
sheet(wb.create_sheet('Theo ma hang'), ['Mã hàng', 'Tên vật tư', 'Thùng', 'SL BBBG', 'Khớp chờ gom', 'Khớp theo mã A/C', 'Lệch mã', 'Đã xử lý ngoài', 'Trừ nợ / thừa', 'Còn phải kiểm'],
      [[m, x['ten'], x['thung'], x['sl'], x['ok'], x['ac'], x['lech'], x['ngoai'], x['khac'], x['sl'] - x['ok']] for m, x in g.items()], [14, 40, 18, 9, 11, 13, 9, 12, 12, 12])

# 4 App co BBBG thieu
sheet(wb.create_sheet('App co - BBBG thieu'), ['Mã xác app', 'Mã case', 'LK B (xác)', 'LK A', 'Trạng thái', 'Ngày tạo đơn'],
      [[c['id'], c['case'], c['lk'], c['lk_a'], c['tt'], c['p_ngay']] for c in con], [20, 16, 44, 44, 24, 18])

# 5 Cho gom MB chua trong BBBG
sheet(wb.create_sheet('Cho gom MB chua trong BBBG'), ['Mã xác app', 'Mã case', 'LK B (xác)', 'Đối tác', 'Ngày tạo đơn'],
      [[c['id'], c['case_id'], c['lk'], c['doi_tac'], c['created_at']] for c in sorted(ngoai_bbbg, key=lambda c: c['created_at'])], [20, 16, 30, 14, 18])
wb.save('Doi-chieu-BBBG-tra-xac-KAROFI_18-11.xlsx')
print(cnt); print('cho MB KAROFI', len(cho_mb), 'ngoai BBBG', len(ngoai_bbbg), min(c['created_at'] for c in ngoai_bbbg), max(c['created_at'] for c in ngoai_bbbg))
print('khac dt', [(k['ma'], dt.get(k['ma'])) for k in khac_dt])
r21 = [k for k in kq if k['dong'] == 21]; print('dong 21', collections.Counter(k['lk_app'] for k in r21))
print('ngoai BBBG theo thang', collections.Counter(c['created_at'][:7] for c in ngoai_bbbg), collections.Counter(c['created_at'][:10] for c in ngoai_bbbg if c['created_at'] >= '2026-11-15'))
