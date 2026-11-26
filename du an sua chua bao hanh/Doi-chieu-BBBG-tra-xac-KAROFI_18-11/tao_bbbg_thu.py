# Tao file BBBG thu (dang giong BBBG nhan vien lap tay) tren du lieu D1 LOCAL de kiem tinh nang Import BBBG.
import openpyxl
wb = openpyxl.Workbook(); ws = wb.active
ws['A1'] = 'CÔNG TY CỔ PHẦN CÔNG NGHỆ VÀ DỊCH VỤ 3T'
ws['A2'] = 'BIÊN BẢN BÀN GIAO LINH KIỆN'
ws.append([]); ws.append([]); ws.append([]); ws.append([])
ws.append(['STT', 'Mã hàng', 'Tên vật tư/ linh kiện', 'SL', 'Số Thùng', 'MYC'])
ws.append([1, 'LK001', 'LK 1', 1, 'Thùng 1', 'C2'])
ws.append([2, 'LKX2', 'LK X2', 2, None, 'SC-T2 SC-T2'])
ws.append([3, 'LK011', 'LK 11', 1, 'Thùng 2 + 3', 'CASE-2026-0006'])
ws.append([4, 'LK999', 'LK la', 1, None, 'CASE-E2E'])
ws.append([5, 'LK001', 'LK 1', 1, 'Để ngoài', 'KHONG-CO-123'])
ws.merge_cells('E8:E9')
ws['D13'] = '=SUM(D8:D12)'
wb.save('BBBG_thu_local.xlsx')
print('ok')
