import json, subprocess, os, sys
env = dict(os.environ, CLOUDFLARE_ACCOUNT_ID='b1f870d7f2df6701219ac095926a67e5')
ids = json.load(open('ids.json'))
def run(sql):
    r = subprocess.run(f'npx wrangler d1 execute sua-chua-bao-hanh-db --remote --json --command "{sql}"', shell=True,
                       capture_output=True, text=True, encoding='utf-8', env=env, cwd=r'F:\claude\QLBH 3T\gui-bao-hanh-linh-kien')
    if r.returncode: print(r.stdout[-800:], r.stderr[-800:]); sys.exit(1)
    return json.loads(r.stdout)[0]['results']
Q_U = """SELECT p.case_id, p.loai_ma, p.mien, p.created_at AS p_ngay, p.ma_lk AS lk_a, u.id AS unit_id, u.ma_lk_nhan AS lk_b,
 u.ma_lk_thuc_te AS lk_c, u.huong_xu_ly, u.xu_ly_xac, u.trang_thai, u.xac_tt, u.thung_xac_id, u.xac_xl_ghi_chu
 FROM phieu_sua_chua_bh p JOIN phieu_sua_chua_bh_ct u ON u.parent_id = p.id WHERE p.case_id IN (SELECT value FROM json_each('{j}'))"""
Q_D = """SELECT p.case_id, d.id AS dx_id, d.unit_id, d.ma_lk, d.so_luong, d.sl_dung, d.trang_thai AS dx_tt, d.xac_tt, d.thung_xac_id
 FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
 WHERE p.case_id IN (SELECT value FROM json_each('{j}'))"""
out = {'units': [], 'dx': []}
for i in range(0, len(ids), 80):
    j = json.dumps(ids[i:i+80]).replace('"', '\\"')
    out['units'] += run(' '.join(Q_U.split()).format(j=j))
    out['dx'] += run(' '.join(Q_D.split()).format(j=j))
    print(i, len(out['units']), len(out['dx']))
json.dump(out, open('d1.json', 'w', encoding='utf-8'), ensure_ascii=False)
