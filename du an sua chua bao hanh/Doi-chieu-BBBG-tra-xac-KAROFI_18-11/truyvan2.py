import json, sys
sys.stdout.reconfigure(encoding='utf-8')
from truyvan_lib import run
SNAP = lambda k: f"(SELECT json_extract(s.data, '$.{k}') FROM case_lookup_snapshot s WHERE s.case_id = p.case_id AND json_valid(s.data))"
DT = f"(SELECT dt.ten FROM doi_tac_bh dt WHERE dt.id = COALESCE(p.doi_tac_id, (SELECT dt2.id FROM doi_tac_bh dt2 WHERE dt2.ten = TRIM({SNAP('doi_tac')}) COLLATE NOCASE)))"
ids = json.load(open('ids.json')); dt = {}
for i in range(0, len(ids), 80):
    j = json.dumps(ids[i:i+80]).replace('"', '\\"')
    for r in run(f"SELECT p.case_id, {DT} AS doi_tac FROM phieu_sua_chua_bh p WHERE p.case_id IN (SELECT value FROM json_each('{j}'))"): dt[r['case_id']] = r['doi_tac']
CHO = "u.huong_xu_ly = 'doi_moi' AND u.xu_ly_xac = 'tra_doi_tac' AND u.thung_xac_id IS NULL AND u.xac_tt IS NULL AND u.trang_thai NOT IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho','cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt')"
cho = run(f"SELECT u.id, p.case_id, p.mien, COALESCE(u.ma_lk_nhan, p.ma_lk) AS lk, {DT} AS doi_tac, p.created_at FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE {CHO}")
thung = run("SELECT id, trang_thai, mien, ma_eo, (SELECT dt.ten FROM doi_tac_bh dt WHERE dt.id = t.doi_tac_id) AS doi_tac, created_at FROM thung_xac_bh t")
json.dump(dict(dt=dt, cho=cho, thung=thung), open('d1_them.json', 'w', encoding='utf-8'), ensure_ascii=False)
import collections
print(collections.Counter(dt.values())); print('cho gom toan he thong', len(cho), collections.Counter((c['mien'], c['doi_tac']) for c in cho).most_common(12)); print(thung)
