# Ghep anh (base64) vao nguon.html -> ../Huong-dan-Tra-xac-linh-kien_25-11-2026.html (1 file tu chua, gui di duoc).
# Chay: python -I build.py   (anh chup bang Chrome headless tu app chay thu local, du lieu mau)
import base64, pathlib, re
d = pathlib.Path(__file__).parent
s = (d / "nguon.html").read_text(encoding="utf-8")
def thay(m):
    f = d / "anh" / (m.group(1) + ".png")
    return "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
s = re.sub(r"\{\{([\w-]+)\}\}", thay, s)
out = d.parent / "Huong-dan-Tra-xac-linh-kien_25-11-2026.html"
out.write_text(s, encoding="utf-8")
print(out.name, len(s))
