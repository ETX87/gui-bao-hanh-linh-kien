import json, collections, sys
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(open('d1.json', encoding='utf-8')); rows = json.load(open('bbbg_tach.json', encoding='utf-8'))
xac = []  # moi xac trong app
for u in d['units']:
    xac.append(dict(src='don_vi', id=u['unit_id'], case=u['case_id'], lk=u['lk_b'] or u['lk_a'], lk_a=u['lk_a'], lk_c=u['lk_c'],
                    huong=u['huong_xu_ly'], xlx=u['xu_ly_xac'], tt=u['trang_thai'], xac_tt=u['xac_tt'], thung=u['thung_xac_id'], p_ngay=u['p_ngay'], dung=False))
for x in d['dx']:
    xac.append(dict(src='de_xuat', id=x['dx_id'] + ' (' + x['unit_id'] + ')', case=x['case_id'], lk=x['ma_lk'], lk_a=None, lk_c=None,
                    huong='sua_chua_cap_lk', xlx='tra_doi_tac', tt=x['dx_tt'], xac_tt=x['xac_tt'], thung=x['thung_xac_id'], p_ngay=None, dung=False))
by_case = collections.defaultdict(list)
for x in xac: by_case[x['case']].append(x)
def la_xac_tra(x): return (x['huong'] == 'doi_moi' and x['xlx'] == 'tra_doi_tac') or x['src'] == 'de_xuat'
def pick(cands):
    # uu tien: xac tra doi tac cho gom > xac tra doi tac khac > con lai
    cands = [c for c in cands if not c['dung']]
    cands.sort(key=lambda c: (not la_xac_tra(c), c['xac_tt'] is not None))
    return cands[0] if cands else None
kq = []
for r in rows:
    cs = by_case.get(r['ma'], [])
    x = pick([c for c in cs if c['lk'] == r['ma_hang']]); cach = 'B'
    if not x: x = pick([c for c in cs if r['ma_hang'] in (c['lk_a'], c['lk_c'])]); cach = 'A/C'
    lech = False
    if not x:
        x = pick([c for c in cs if c['src'] == 'don_vi']); lech = True; cach = ''
    if x: x['dung'] = True
    if not cs: kl = 'Không có trong app'
    elif not x: kl = 'Thừa: case đã ghép hết đơn vị'
    elif lech: kl = 'Lệch mã LK'
    elif not la_xac_tra(x):
        kl = {'tu_choi': 'Đơn bị từ chối', 'xac_nhan_tru_no': 'Đơn trừ nợ (không trả xác)', 'sua_chua': 'Đơn sửa chữa (không phải xác đổi mới)'}.get(x['huong'], 'Không phải xác trả đối tác')
        if x['huong'] == 'doi_moi': kl = 'Đổi mới nhưng xử lý xác ≠ Trả đối tác'
    elif x['xac_tt'] == 'ngoai': kl = 'Khớp – app đã đánh dấu xử lý ngoài'
    elif x['thung']: kl = 'Khớp – đã trong thùng ' + x['thung']
    elif x['tt'] in ('ket_thuc_tu_choi', 'ket_thuc_chuyen_kho', 'cho_phan_loai', 'admin_can_xem_lai', 'cho_bo_sung_tt'): kl = 'Khớp mã nhưng đơn chưa đủ ĐK gom (' + x['tt'] + ')'
    else: kl = 'Khớp – đang chờ gom' + (' (khớp theo mã ' + cach + ')' if cach == 'A/C' else '')
    kq.append(dict(r, ket_luan=kl, xac_id=x['id'] if x else '', lk_app=x['lk'] if x else '', lk_a=x['lk_a'] if x else '',
                   huong=x['huong'] if x else '', xlx=x['xlx'] if x else '', tt=x['tt'] if x else '', xac_tt=x['xac_tt'] if x else '', p_ngay=x['p_ngay'] if x else ''))
con = [x for x in xac if not x['dung'] and la_xac_tra(x)]
json.dump(dict(kq=kq, con=con), open('ketqua.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(collections.Counter(k['ket_luan'] for k in kq).most_common())
print('App co xac tra doi tac (cua cac case nay) nhung BBBG khong ghi:', len(con), collections.Counter((c['xac_tt'], c['tt']) for c in con))
for k in kq:
    if k['ket_luan'] in ('Lệch mã LK',) or k['ket_luan'].startswith('Thừa'): print(k['dong'], k['ma_hang'], k['ma'], '->', k['xac_id'], k['lk_app'], k['lk_a'], k['huong'])
