import json, subprocess, os, sys
env = dict(os.environ, CLOUDFLARE_ACCOUNT_ID='b1f870d7f2df6701219ac095926a67e5')
def run(sql):
    r = subprocess.run(f'npx wrangler d1 execute sua-chua-bao-hanh-db --remote --json --command "{sql}"', shell=True,
                       capture_output=True, text=True, encoding='utf-8', env=env, cwd=r'F:\claude\QLBH 3T\gui-bao-hanh-linh-kien')
    if r.returncode: print(r.stdout[-800:], r.stderr[-800:]); sys.exit(1)
    return json.loads(r.stdout)[0]['results']
