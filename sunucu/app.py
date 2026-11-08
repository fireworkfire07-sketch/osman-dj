"""
OSMAN KARAOKE — sunucu
Telefonda aç, şarkının linkini yapıştır, "KARAOKE YAP"a bas. Gerisi burada olur.
"""
import asyncio
import hmac
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import traceback
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import isleyici as IS

VERI = Path(os.environ.get("VERI", "/veri"))
PAKET = VERI / "paketler"
YUKLE = VERI / "yuklenen"
CEREZ = VERI / "cerez.txt"
ISLER_DOSYA = VERI / "isler.json"
KOD = os.environ.get("KOD", "").strip()
POT_URL = os.environ.get("POT_URL", "").strip() or None
STATIC = Path(__file__).resolve().parent / "static"
PID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,90}$")
DOSYALAR = {
    "enstrumantal.mp3": "audio/mpeg", "vokal.mp3": "audio/mpeg", "kapak.jpg": "image/jpeg",
    "sozler.json": "application/json", "notlar.json": "application/json", "bilgi.json": "application/json",
    "sozler.lrc": "text/plain; charset=utf-8",
}
MAX_YUKLEME = 120 * 1024 * 1024
for d in (PAKET, YUKLE):
    d.mkdir(parents=True, exist_ok=True)

if os.environ.get("OK_SAHTE"):          # yalnızca testlerde: indirme/ayırma taklit edilir
    sys.path.insert(0, os.environ["OK_SAHTE"])
    import sahte  # noqa: E402
    sahte.ayarla(IS)


# ---------------------------------------------------------------- iş kuyruğu
class Isler:
    def __init__(self):
        self.kilit = threading.RLock()
        self.isler = {}
        self.kuyruk = queue.Queue()
        self._son_kayit = 0.0
        self._oku()
        threading.Thread(target=self._calis, daemon=True).start()

    def _oku(self):
        try:
            veri = json.loads(ISLER_DOSYA.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            veri = []
        for j in veri:
            if j.get("durum") in ("sirada", "calisiyor"):
                j.update(durum="sirada", asama="sirada", yuzde=0, iptal=False)
                self.isler[j["id"]] = j
                self.kuyruk.put(j["id"])
            elif j.get("durum") == "hata":
                self.isler[j["id"]] = j

    def _kaydet(self, zorla=True):
        if not zorla and time.time() - self._son_kayit < 5:
            return
        self._son_kayit = time.time()
        liste = sorted(self.isler.values(), key=lambda j: j["olusma"])[-40:]
        gecici = ISLER_DOSYA.with_suffix(".tmp")
        gecici.write_text(json.dumps(liste, ensure_ascii=False), encoding="utf-8")
        os.replace(gecici, ISLER_DOSYA)

    def ekle(self, kaynak, kalite, dosya=None, ad=None):
        j = {"id": uuid.uuid4().hex[:10], "kaynak": kaynak, "dosya": dosya, "kalite": kalite,
             "durum": "sirada", "asama": "sirada", "yuzde": 0, "baslik": (ad or kaynak)[:120],
             "sanatci": "", "mesaj": "", "paket": None, "olusma": time.time(), "basla": None, "bitis": None,
             "iptal": False}
        with self.kilit:
            self.isler[j["id"]] = j
            self._kaydet()
        self.kuyruk.put(j["id"])
        return self.gorunum(j)

    def guncelle(self, iid, **k):
        with self.kilit:
            j = self.isler.get(iid)
            if not j:
                return
            onemli = "durum" in k
            for a, v in k.items():
                if a in ("baslik", "sanatci") and not v:
                    continue
                j[a] = v
            self._kaydet(zorla=onemli)

    def gorunum(self, j):
        sira = None
        if j["durum"] == "sirada":
            bekleyen = sorted((x for x in self.isler.values() if x["durum"] == "sirada"), key=lambda x: x["olusma"])
            sira = next((i for i, x in enumerate(bekleyen) if x["id"] == j["id"]), 0) + \
                (1 if any(x["durum"] == "calisiyor" for x in self.isler.values()) else 0)
        return {a: j.get(a) for a in ("id", "kaynak", "durum", "asama", "yuzde", "baslik", "sanatci", "mesaj",
                                      "paket", "olusma", "basla", "bitis")} | {"sira": sira, "dosya": bool(j.get("dosya"))}

    def liste(self):
        simdi = time.time()
        with self.kilit:
            for iid in [i for i, j in self.isler.items() if j["durum"] == "bitti" and simdi - (j["bitis"] or 0) > 600]:
                del self.isler[iid]
            return [self.gorunum(j) for j in sorted(self.isler.values(), key=lambda j: j["olusma"])]

    def kaldir(self, iid):
        with self.kilit:
            j = self.isler.get(iid)
            if not j:
                return False
            if j["durum"] == "calisiyor":
                j["iptal"] = True
                return True
            self._dosya_sil(j)
            del self.isler[iid]
            self._kaydet()
            return True

    def tekrar(self, iid):
        with self.kilit:
            j = self.isler.get(iid)
            if not j or j["durum"] != "hata":
                return None
            j.update(durum="sirada", asama="sirada", yuzde=0, mesaj="", iptal=False, olusma=time.time())
            self._kaydet()
        self.kuyruk.put(iid)
        return self.gorunum(j)

    @staticmethod
    def _dosya_sil(j):
        if j.get("dosya"):
            Path(j["dosya"]).unlink(missing_ok=True)

    def _calis(self):
        while True:
            iid = self.kuyruk.get()
            with self.kilit:
                j = self.isler.get(iid)
                if not j or j["durum"] != "sirada":
                    continue
            self.guncelle(iid, durum="calisiyor", asama="indir", yuzde=0, basla=time.time())
            il = IS.Ilerleme(lambda **k: self.guncelle(iid, **k),
                             lambda: bool(self.isler.get(iid, {}).get("iptal")))
            try:
                bilgi = IS.isle(j["dosya"] or j["kaynak"], PAKET, j["kalite"], CEREZ, POT_URL, il,
                                dosya_mi=bool(j["dosya"]))
                self.guncelle(iid, durum="bitti", asama="bitti", yuzde=100, paket=bilgi["id"],
                              baslik=bilgi["baslik"], sanatci=bilgi.get("sanatci", ""), bitis=time.time())
                self._dosya_sil(j)
            except Exception as e:  # noqa: BLE001
                if isinstance(e, IS.Iptal) or j.get("iptal"):
                    with self.kilit:
                        self._dosya_sil(j)
                        self.isler.pop(iid, None)
                        self._kaydet()
                    continue
                if isinstance(e, IS.KullaniciHatasi):
                    mesaj = str(e)
                else:
                    traceback.print_exc()
                    mesaj = "Bir şeyler ters gitti: " + (str(e).strip().splitlines() or ["?"])[-1][:220]
                self.guncelle(iid, durum="hata", mesaj=mesaj, bitis=time.time())


ISLER = Isler()


def ytdlp_guncelle_dongusu():
    """YouTube sık değişir: günde bir kez, boştayken yt-dlp'yi günceller ve kapsayıcıyı yeniden başlatır."""
    if os.environ.get("OK_SAHTE") or os.environ.get("OTO_GUNCELLE", "1") != "1":
        return
    time.sleep(6 * 3600)
    while True:
        bos = not any(j["durum"] in ("sirada", "calisiyor") for j in ISLER.isler.values())
        if bos:
            try:
                eski = subprocess.run([sys.executable, "-m", "yt_dlp", "--version"], capture_output=True, text=True).stdout.strip()
                subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "yt-dlp[default]"],
                               capture_output=True, timeout=600)
                yeni = subprocess.run([sys.executable, "-m", "yt_dlp", "--version"], capture_output=True, text=True).stdout.strip()
                if yeni and yeni != eski:
                    print(f"yt-dlp güncellendi: {eski} -> {yeni}; yeniden başlatılıyor", flush=True)
                    os._exit(0)
            except Exception as e:  # noqa: BLE001
                print(f"yt-dlp güncellenemedi: {e}", flush=True)
            time.sleep(24 * 3600)
        else:
            time.sleep(1800)


threading.Thread(target=ytdlp_guncelle_dongusu, daemon=True).start()
HATALI_GIRIS = {}

# ---------------------------------------------------------------- uygulama
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


def kod_tamam(request: Request):
    return not KOD or hmac.compare_digest(request.cookies.get("ok_kod", "").encode(), KOD.encode())


@app.middleware("http")
async def kapi(request: Request, call_next):
    p = request.url.path
    korumali = (p.startswith("/api/") and p != "/api/giris") or p.startswith("/paket/")
    if korumali and not kod_tamam(request):
        return JSONResponse({"hata": "kod", "mesaj": "Giriş kodu gerekli"}, status_code=401)
    yanit = await call_next(request)
    if p.startswith("/api/"):
        yanit.headers["Cache-Control"] = "no-store"
    return yanit


@app.get("/saglik")
def saglik():
    return {"ok": True}


@app.post("/api/giris")
async def giris(request: Request):
    try:
        veri = await request.json()
    except Exception:  # noqa: BLE001
        veri = {}
    kod = str(veri.get("kod", "")).strip()
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    simdi = time.time()
    denemeler = [t for t in HATALI_GIRIS.get(ip, []) if simdi - t < 900]
    if len(denemeler) >= 10:
        return JSONResponse({"hata": "cok", "mesaj": "Çok fazla yanlış deneme. 15 dakika sonra tekrar dene."}, status_code=429)
    if KOD and not hmac.compare_digest(kod.encode(), KOD.encode()):
        HATALI_GIRIS[ip] = denemeler + [simdi]
        await asyncio.sleep(1)
        return JSONResponse({"hata": "kod", "mesaj": "Kod yanlış"}, status_code=401)
    HATALI_GIRIS.pop(ip, None)
    y = JSONResponse({"ok": True})
    guvenli = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    y.set_cookie("ok_kod", kod, max_age=400 * 86400, httponly=True, samesite="lax", secure=guvenli)
    return y


def paketler():
    liste = []
    for b in PAKET.glob("*/bilgi.json"):
        try:
            liste.append(json.loads(b.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return sorted(liste, key=lambda x: x.get("tarih", ""), reverse=True)


@app.get("/api/durum")
def durum():
    return {"sarkilar": paketler(), "isler": ISLER.liste(), "cerez": CEREZ.exists(), "simdi": time.time()}


@app.post("/api/yap")
async def yap(request: Request):
    veri = await request.json()
    kaynak = str(veri.get("kaynak", "")).strip()[:2000]
    if len(kaynak) < 2:
        raise HTTPException(400, "Şarkının linkini ya da adını yaz.")
    kalite = "super" if veri.get("kalite") == "super" else "normal"
    tur, deger = IS.kaynak_coz(kaynak)
    return {"is": ISLER.ekle(deger, kalite, ad=deger if tur == "ara" else None)}


@app.post("/api/yukle")
async def yukle(dosya: UploadFile = File(...), kalite: str = Form("normal")):
    ad = re.sub(r"[^\w.\- ]+", "_", Path(dosya.filename or "sarki").name)[-80:] or "sarki"
    hedef = YUKLE / f"{uuid.uuid4().hex[:10]}_{ad}"
    boyut = 0
    with hedef.open("wb") as f:
        while True:
            parca = await dosya.read(1024 * 1024)
            if not parca:
                break
            boyut += len(parca)
            if boyut > MAX_YUKLEME:
                f.close()
                hedef.unlink(missing_ok=True)
                raise HTTPException(413, "Dosya çok büyük (en fazla 120 MB).")
            f.write(parca)
    return {"is": ISLER.ekle(f"dosya: {ad}", "super" if kalite == "super" else "normal", dosya=str(hedef),
                             ad=Path(ad).stem.replace("_", " "))}


@app.delete("/api/is/{iid}")
def is_sil(iid: str):
    if not ISLER.kaldir(iid):
        raise HTTPException(404, "İş bulunamadı")
    return {"ok": True}


@app.post("/api/is/{iid}/tekrar")
def is_tekrar(iid: str):
    j = ISLER.tekrar(iid)
    if not j:
        raise HTTPException(404, "İş bulunamadı")
    return {"is": j}


def paket_yolu(pid):
    if not PID_RE.match(pid or ""):
        raise HTTPException(404, "Şarkı bulunamadı")
    d = PAKET / pid
    if not (d / "bilgi.json").exists():
        raise HTTPException(404, "Şarkı bulunamadı")
    return d


@app.delete("/api/sarki/{pid}")
def sarki_sil(pid: str):
    shutil.rmtree(paket_yolu(pid), ignore_errors=True)
    return {"ok": True}


@app.post("/api/sarki/{pid}/ayar")
async def sarki_ayar(pid: str, request: Request):
    d = paket_yolu(pid)
    veri = await request.json()
    bilgi = json.loads((d / "bilgi.json").read_text(encoding="utf-8"))
    try:
        bilgi["ayar"] = round(max(-15.0, min(15.0, float(veri.get("ayar", 0)))), 2)
    except (TypeError, ValueError):
        raise HTTPException(400, "Geçersiz değer")
    IS.json_yaz(d / "bilgi.json", bilgi, girintili=True)
    return {"bilgi": bilgi}


@app.post("/api/sarki/{pid}/soz")
def sarki_soz(pid: str, veri: dict):
    d = paket_yolu(pid)
    try:
        bilgi = IS.sozleri_yenile(d, metin=str(veri.get("metin") or "")[:20000] or None,
                                  baslik=veri.get("baslik"), sanatci=veri.get("sanatci"))
    except IS.KullaniciHatasi as e:
        raise HTTPException(422, str(e))
    return {"bilgi": bilgi}


@app.post("/api/cerez")
def cerez_kaydet(veri: dict):
    metin = str(veri.get("metin") or "")
    if "\t" not in metin or ("youtube" not in metin.lower() and "google" not in metin.lower()):
        raise HTTPException(400, "Bu bir cookies.txt dosyası gibi görünmüyor (Netscape biçimi olmalı).")
    CEREZ.write_text(metin, encoding="utf-8")
    os.chmod(CEREZ, 0o600)
    return {"ok": True}


@app.delete("/api/cerez")
def cerez_sil():
    CEREZ.unlink(missing_ok=True)
    return {"ok": True}


@app.get("/paket/{pid}/{dosya}")
def paket_dosya(pid: str, dosya: str, indir: int = 0):
    if dosya not in DOSYALAR:
        raise HTTPException(404, "Dosya yok")
    yol = paket_yolu(pid) / dosya
    if not yol.exists():
        raise HTTPException(404, "Dosya yok")
    basliklar = {"Cache-Control": "private, max-age=31536000, immutable" if dosya.endswith((".mp3", ".jpg"))
                 else "no-cache"}
    if indir:
        bilgi = json.loads((yol.parent / "bilgi.json").read_text(encoding="utf-8"))
        ad = f"{bilgi.get('sanatci') + ' - ' if bilgi.get('sanatci') else ''}{bilgi.get('baslik', 'sarki')}"
        ek = " (karaoke).mp3" if dosya == "enstrumantal.mp3" else " (vokal).mp3" if dosya == "vokal.mp3" else Path(dosya).suffix
        return FileResponse(yol, media_type=DOSYALAR[dosya], filename=re.sub(r'[\\/:*?"<>|]+', " ", ad) + ek,
                            headers=basliklar)
    return FileResponse(yol, media_type=DOSYALAR[dosya], headers=basliklar)


app.mount("/", StaticFiles(directory=STATIC, html=True), name="arayuz")
