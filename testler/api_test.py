import os, sys, time, json, tempfile
veri = tempfile.mkdtemp(prefix="okveri-")
os.environ.update(VERI=veri, KOD="abc123", OK_SAHTE=os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sunucu"))
from fastapi.testclient import TestClient
import app as A
c = TestClient(A.app)
assert c.get("/api/durum").status_code == 401
assert c.post("/api/giris", json={"kod": "yanlis"}).status_code == 401
r = c.post("/api/giris", json={"kod": "abc123"}); assert r.status_code == 200, r.text
r = c.post("/api/yap", json={"kaynak": "Şuna bak: https://youtu.be/dQw4w9WgXcQ?si=abc harika"}); j = r.json()["is"]; print("iş:", j["kaynak"], j["durum"])
r2 = c.post("/api/yap", json={"kaynak": "Osman Test Antalya Geceleri"}); print("arama işi:", r2.json()["is"]["baslik"], "sıra", r2.json()["is"]["sira"])
r3 = c.post("/api/yap", json={"kaynak": "https://youtu.be/robotrobot1"})
gorulen = set()
for _ in range(120):
    d = c.get("/api/durum").json()
    for x in d["isler"]:
        gorulen.add((x["baslik"][:20], x["durum"], x["asama"], int(x["yuzde"] // 25)))
    if all(x["durum"] in ("bitti", "hata") for x in d["isler"]):
        break
    time.sleep(0.25)
for x in d["isler"]: print("  ", x["durum"], x["baslik"], x["sanatci"], "|", x["mesaj"])
print("görülen aşamalar:", sorted({g[2] for g in gorulen}))
s = d["sarkilar"]; print("şarkı sayısı:", len(s))
b = s[0]; print(json.dumps({k: b[k] for k in ("id","baslik","sanatci","sure","senkron","kaydirma","satir","nota","kapak")}, ensure_ascii=False))
soz = c.get(f"/paket/{b['id']}/sozler.json").json()
for x in soz["satirlar"][:2]: print("  ", x["t"], x["e"], x["m"], x["k"][:3])
import sahte
print("gerçek satır başları:", [t for t, _ in sahte.SOZLER])
print("bulunan:", [x["t"] for x in soz["satirlar"]])
print("satır sonları:", [x["e"] for x in soz["satirlar"]])
# kelime doğruluğu: her kelimenin başlangıcı gerçek hecelere göre
notalar = c.get(f"/paket/{b['id']}/notlar.json").json(); print("nota:", len(notalar), "gerçek:", len(sahte.NOTALAR))
ok = 0
for gt in sahte.NOTALAR:
    if any(abs(n[0]-gt[0]) < 0.08 and n[2] == gt[2] for n in notalar): ok += 1
print("doğru nota:", ok, "/", len(sahte.NOTALAR))
r = c.get(f"/paket/{b['id']}/enstrumantal.mp3"); print("mp3", r.status_code, len(r.content), r.headers.get("cache-control"))
r = c.get(f"/paket/{b['id']}/enstrumantal.mp3?indir=1"); print("indir başlığı:", r.headers.get("content-disposition"))
print("kapak:", c.get(f"/paket/{b['id']}/kapak.jpg").status_code, " traversal:", c.get("/paket/..%2f..%2fetc/passwd").status_code, c.get(f"/paket/{b['id']}/zarf.npy").status_code)
# aynı link tekrar -> hemen hazır
r = c.post("/api/yap", json={"kaynak": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}); iid = r.json()["is"]["id"]
for _ in range(40):
    d = c.get("/api/durum").json(); x = [y for y in d["isler"] if y["id"] == iid][0]
    if x["durum"] == "bitti": break
    time.sleep(0.1)
print("tekrar link:", x["durum"], "paket aynı:", x["paket"] == [y for y in d["isler"] if y["kaynak"].startswith("https://youtu.be/dQw")][0]["paket"], "şarkı sayısı:", len(d["sarkilar"]))
# ayar ve söz yapıştırma
print("ayar:", c.post(f"/api/sarki/{b['id']}/ayar", json={"ayar": -0.4}).json()["bilgi"]["ayar"])
r = c.post(f"/api/sarki/{b['id']}/soz", json={"metin": "\n".join(y for _, y in sahte.SOZLER)}); bb = r.json()["bilgi"]; print("yapıştırılan:", bb["senkron"], bb["satir"], "sürüm", bb["surum"], "ayar", bb["ayar"])
soz = c.get(f"/paket/{b['id']}/sozler.json").json(); print("düz söz başları:", [x["t"] for x in soz["satirlar"]])
r = c.post(f"/api/sarki/{b['id']}/soz", json={"baslik": "sozsuz", "sanatci": ""}); print("bulunamayan:", r.status_code, r.json())
# hata tekrar / sil
hata = [y for y in d["isler"] if y["durum"] == "hata"][0]
print("tekrar:", c.post(f"/api/is/{hata['id']}/tekrar").json()["is"]["durum"]); time.sleep(1.0)
print("sil:", c.delete(f"/api/is/{hata['id']}").json())
# dosya yükleme
import subprocess
wav = os.path.join(veri, "deneme.mp3"); subprocess.run(["ffmpeg","-y","-v","error","-f","lavfi","-i","sine=f=440:d=12","-ac","2",wav], check=True)
r = c.post("/api/yukle", files={"dosya": ("Tarkan - Şımarık.mp3", open(wav, "rb"), "audio/mpeg")}, data={"kalite": "normal"}); print("yükleme:", r.json()["is"]["baslik"])
for _ in range(80):
    d = c.get("/api/durum").json(); x = [y for y in d["isler"] if y["dosya"]][0]
    if x["durum"] in ("bitti","hata"): break
    time.sleep(0.2)
print("yükleme sonucu:", x["durum"], x["baslik"], x["sanatci"], x["mesaj"])
print("yüklenen klasör boş:", os.listdir(os.path.join(veri, "yuklenen")))
# iptal
r = c.post("/api/yap", json={"kaynak": "iptal edilecek şarkı"}); iid = r.json()["is"]["id"]
time.sleep(0.8); c.delete(f"/api/is/{iid}"); time.sleep(1.5)
print("iptal sonrası:", [y["durum"] for y in c.get("/api/durum").json()["isler"] if y["id"] == iid])
print("çerez kötü:", c.post("/api/cerez", json={"metin": "merhaba"}).status_code, "iyi:", c.post("/api/cerez", json={"metin": ".youtube.com\tTRUE\t/\tTRUE\t0\tPREF\tx"}).status_code, c.get("/api/durum").json()["cerez"])
print("sil şarkı:", c.delete(f"/api/sarki/{b['id']}").json(), len(c.get("/api/durum").json()["sarkilar"]))
