#!/usr/bin/env python3
"""
OSMAN KARAOKE — işleyici
Link (YouTube, Spotify, SoundCloud…), şarkı adı ya da ses dosyası  ->  vokalsiz karaoke paketi

paketler/<id>/
  enstrumantal.mp3   vokali yapay zekâ (Demucs) ile ayrılmış, şarkının tamamı
  vokal.mp3          ayrılan şarkıcı sesi (uygulamada açılıp kısılabilir)
  sozler.json        satır + kelime zamanlı sözler (vokale göre hizalı)
  sozler.lrc         aynı sözler LRC olarak
  notlar.json        vokalden çıkarılan notalar [[t, süre, midi], …]
  zarf.npy           vokal enerji zarfı (sözleri sonradan yeniden hizalamak için)
  kapak.jpg          kapak resmi (varsa)
  bilgi.json         başlık, sanatçı, süre, kaynak…
"""
import difflib
import hashlib
import html
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

SR = 16000            # analiz örnekleme hızı
HOP = 0.05            # zarf adımı (sn)
LRCLIB = "https://lrclib.net/api"
UA = os.environ.get("OK_UA", "OsmanKaraoke/2.0 (self-hosted karaoke)")
TARAYICI_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
               "(KHTML, like Gecko) Chrome/131.0 Safari/537.36")
MAX_SURE = float(os.environ.get("MAX_DAKIKA", "15")) * 60
ARALIK = {"indir": (0, 12), "ayir": (12, 90), "soz": (90, 95), "nota": (95, 100)}


class Iptal(Exception):
    """Kullanıcı işi iptal etti."""


class KullaniciHatasi(Exception):
    """Mesajı kullanıcıya olduğu gibi gösterilir."""


class Ilerleme:
    """İlerlemeyi bildirir; iş iptal edildiyse Iptal fırlatır."""

    def __init__(self, bildir=None, iptal_mi=None):
        self._bildir = bildir or (lambda **k: None)
        self.iptal_mi = iptal_mi or (lambda: False)

    def adim(self, asama, oran=0.0, **ek):
        if self.iptal_mi():
            raise Iptal()
        a, b = ARALIK[asama]
        self._bildir(asama=asama, yuzde=round(a + (b - a) * max(0.0, min(1.0, oran)), 1), **ek)


def log(*a):
    print(*a, flush=True)


# ---------------------------------------------------------------- yardımcılar
TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜâîûÂÎÛ", "cgiosuCGIOSUaiuAIU")


def slug(s, n=50):
    s = (s or "").translate(TR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:n].strip("-") or "sarki"


def calistir(cmd):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{Path(cmd[0]).name} hata verdi: {(r.stderr or '')[-600:]}")
    return r.stdout


def sure_olc(yol):
    out = calistir(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(yol)])
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def pcm(yol, sr=SR):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(yol), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def norm_ad(s):
    s = (s or "").lower().translate(TR_MAP)
    s = re.sub(r"[\(\[\{].*?[\)\]\}]", " ", s)
    s = re.sub(r"\b(feat|ft)\b.*$", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def benzerlik(a, b):
    a, b = norm_ad(a), norm_ad(b)
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def kelime_ortakligi(sorgu, metin):
    """Sorgudaki kelimelerin ne kadarı metinde geçiyor (0-1)."""
    q = [w for w in norm_ad(sorgu).split() if len(w) > 1]
    t = norm_ad(metin).split()
    if not q:
        return 0.0
    bulunan = 0
    for w in q:
        if w in t or any(difflib.SequenceMatcher(None, w, x).ratio() > 0.84 for x in t):
            bulunan += 1
    return bulunan / len(q)


URL_RE = re.compile(r"https?://[^\s<>\"']+")


def kaynak_coz(metin):
    """Yapıştırılan metinden link çıkarır; link yoksa şarkı adı araması sayar."""
    metin = (metin or "").strip()
    m = URL_RE.search(metin)
    if m:
        return "link", m.group(0).rstrip(").,;!")
    return "ara", re.sub(r"\s+", " ", metin)


def anahtar_yap(url):
    """Aynı şarkıyı iki kez işlememek için kaynağın kısa kimliği."""
    m = re.search(r"(?:youtu\.be/|v=|/shorts/|/live/|/embed/)([A-Za-z0-9_-]{11})", url or "")
    if m:
        return "yt:" + m.group(1)
    u = urllib.parse.urlsplit(url or "")
    return (u.netloc.lower().removeprefix("www.").removeprefix("m.") + u.path.rstrip("/")) or (url or "")


# ---------------------------------------------------------------- 1) kaynak
ARAMALI_SITELER = ("spotify.com", "spotify.link", "music.apple.com", "deezer.com", "deezer.page.link",
                   "shazam.com", "tidal.com", "music.amazon", "fizy.com", "muud")
KOTU_KELIMELER = ["karaoke", "instrumental", "enstrumantal", "altyapi", "alt yapi", "cover", "remix", "live",
                  "canli", "slowed", "sped up", "speed up", "8d", "reverb", "nightcore", "bass boosted",
                  "1 hour", "1 saat", "mashup", "piano", "akustik", "acoustic", "reaction", "tepki"]


def sayfa_sarki_adi(url):
    """Spotify / Apple Music gibi sayfalardan 'sanatçı şarkı' metni çıkarır."""
    req = urllib.request.Request(url, headers={"User-Agent": TARAYICI_UA, "Accept-Language": "tr,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as r:
        h = r.read(800_000).decode("utf-8", "ignore")
    return sayfa_metninden_ad(h, url)


def sayfa_metninden_ad(h, url=""):
    def meta(ad):
        for desen in (r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]*content=["\']([^"\']*)',
                      r'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']%s["\']'):
            m = re.search(desen % re.escape(ad), h, re.I)
            if m:
                return html.unescape(m.group(1)).strip()
        return ""
    og, aciklama = meta("og:title"), meta("og:description")
    t = re.search(r"<title[^>]*>(.*?)</title>", h, re.I | re.S)
    baslik = html.unescape(t.group(1)).strip() if t else ""
    m = re.match(r"(.+?) - (?:song|single|album|şarkı)(?: and lyrics| ve sözleri)? by (.+?) \| Spotify", baslik, re.I)
    if m:
        return f"{m.group(2)} {m.group(1)}"
    if "spotify" in url and og and "·" in aciklama:
        return f"{aciklama.split('·')[0].strip()} {og}"
    m = re.match(r"(.+?) by (.+?) on Apple Music", og or baslik, re.I)
    if m:
        return f"{m.group(2)} {m.group(1)}"
    s = og or baslik
    s = re.sub(r"\s*[|\-–—]\s*(Spotify|Apple Music|Deezer|Shazam|TIDAL|YouTube|Amazon Music|fizy).*$", "", s, flags=re.I)
    return s.strip()


def ytdlp_ayar(klasor, cerez, pot_url, ilerleme):
    def kanca(d):
        if d.get("status") == "downloading":
            top = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if top:
                ilerleme.adim("indir", 0.15 + 0.8 * d.get("downloaded_bytes", 0) / top)
    o = {
        "format": "bestaudio/best",
        "outtmpl": str(klasor / "kaynak.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [kanca],
        "socket_timeout": 30,
        "retries": 3,
        "max_filesize": 400 * 1024 * 1024,
    }
    if cerez and Path(cerez).exists() and Path(cerez).stat().st_size > 20:
        o["cookiefile"] = str(cerez)
    if pot_url:
        o["extractor_args"] = {"youtubepot-bgutilhttp": {"base_url": [pot_url]}}
    return o


def youtube_ara(sorgu, opts):
    import yt_dlp
    o = dict(opts, extract_flat="in_playlist", skip_download=True)
    o.pop("progress_hooks", None)
    with yt_dlp.YoutubeDL(o) as y:
        r = y.extract_info(f"ytsearch8:{sorgu}", download=False) or {}
    secilen = arama_sonucu_sec(sorgu, r.get("entries") or [])
    if not secilen:
        raise KullaniciHatasi(f"“{sorgu}” için şarkı bulamadım. Başka türlü yaz ya da linkini yapıştır.")
    return secilen.get("url") if str(secilen.get("url", "")).startswith("http") else \
        f"https://www.youtube.com/watch?v={secilen['id']}"


def arama_sonucu_sec(sorgu, girdiler):
    sorgu_n = norm_ad(sorgu)
    adaylar = []
    for i, e in enumerate(girdiler):
        if not e:
            continue
        d = e.get("duration") or 0
        if d and (d < 60 or d > MAX_SURE):
            continue
        baslik = e.get("title") or ""
        kanal = e.get("channel") or e.get("uploader") or ""
        bn = norm_ad(baslik)
        skor = kelime_ortakligi(sorgu, f"{baslik} {kanal.replace(' - Topic', '')}") * 3 - i * 0.15
        if kanal.endswith(" - Topic"):
            skor += 1.5
        if "audio" in bn or "ses" in bn.split():
            skor += 0.8
        if "official" in bn or "resmi" in bn:
            skor += 0.4
        for k in KOTU_KELIMELER:
            if re.search(r"\b" + re.escape(k) + r"\b", bn) and k not in sorgu_n:
                skor -= 3
        adaylar.append((skor, i, e))
    if not adaylar:
        return None
    adaylar.sort(key=lambda x: (-x[0], x[1]))
    return adaylar[0][2]


def indir(url, klasor, ilerleme, cerez=None, pot_url=None, bulundu=None):
    """URL'den sesi indirir. Desteklenmeyen müzik sitelerinde şarkı adını bulup YouTube'da arar."""
    import yt_dlp
    opts = ytdlp_ayar(klasor, cerez, pot_url, ilerleme)
    if any(s in url for s in ARAMALI_SITELER):
        ad = sayfa_sarki_adi(url)
        if not ad:
            raise KullaniciHatasi("Bu linkten şarkının adını çıkaramadım. Şarkının adını yaz ya da YouTube linki ver.")
        log(f"   sayfadan şarkı adı: {ad}")
        ilerleme.adim("indir", 0.05, baslik=ad)
        url = youtube_ara(ad, opts)
    if bulundu:
        bulundu(url)
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info and info.get("entries"):
                info = next((e for e in info["entries"] if e), None)
            if not info:
                raise KullaniciHatasi("Bu linkte şarkı bulunamadı.")
            sure = info.get("duration") or 0
            if sure and sure > MAX_SURE:
                raise KullaniciHatasi(f"Bu kayıt çok uzun ({int(sure // 60)} dk). En fazla {int(MAX_SURE // 60)} dakikalık şarkı yapabiliyorum.")
            track, artist = ad_tahmin(info)
            ilerleme.adim("indir", 0.12, baslik=track, sanatci=artist)
            info = ydl.process_ie_result(info, download=True)
    except yt_dlp.utils.DownloadError as e:
        mesaj = str(e)
        if ilerleme.iptal_mi():
            raise Iptal() from e
        if "Unsupported URL" in mesaj:
            ad = sayfa_sarki_adi(url)
            if not ad:
                raise KullaniciHatasi("Bu linki açamadım. Şarkının adını yazmayı dene.") from e
            return indir(youtube_ara(ad, opts), klasor, ilerleme, cerez, pot_url, bulundu)
        if "Sign in to confirm" in mesaj or "not a bot" in mesaj:
            raise KullaniciHatasi("YouTube sunucuyu robot sandı. Ayarlar → “YouTube çerezi” ekle "
                                  "ya da şarkı dosyasını telefondan seç.") from e
        if "Private video" in mesaj or "unavailable" in mesaj.lower():
            raise KullaniciHatasi("Bu video gizli ya da kaldırılmış. Başka bir link dene.") from e
        if "File is larger than max-filesize" in mesaj:
            raise KullaniciHatasi("Dosya çok büyük. Daha kısa bir video dene.") from e
        raise
    wav = klasor / "kaynak.wav"
    adaylar = [p for p in klasor.glob("kaynak.*") if p.suffix != ".part"]
    if not adaylar:
        raise RuntimeError("İndirilen ses bulunamadı")
    calistir(["ffmpeg", "-y", "-v", "error", "-i", str(adaylar[0]), "-vn", "-ac", "2", "-ar", "44100", str(wav)])
    return wav, info or {}


def dosyadan(yol, klasor):
    wav = klasor / "kaynak.wav"
    calistir(["ffmpeg", "-y", "-v", "error", "-i", str(yol), "-vn", "-ac", "2", "-ar", "44100", str(wav)])
    ad = Path(yol).stem
    ad = re.sub(r"^[0-9a-f]{8,}[-_]", "", ad)          # sunucunun eklediği önek
    return wav, {"title": ad.replace("_", " ")}


def ad_tahmin(info):
    track = (info.get("track") or "").strip()
    artist = (info.get("artist") or info.get("creator") or "").split(",")[0].strip()
    baslik = info.get("title") or ""
    temiz = re.sub(r"\s*[\(\[\{][^\)\]\}]*[\)\]\}]", "", baslik)
    temiz = re.sub(r"\b(official|music|video|audio|lyrics?|klip|resmi|hd|4k|mv|visualizer|sözleri)\b", "", temiz, flags=re.I)
    temiz = re.sub(r"\s+(ft\.?|feat\.?|featuring)\s+[^-–—|]*", " ", temiz, flags=re.I)
    temiz = re.sub(r"\s{2,}", " ", temiz).strip(" -|–—")
    if not track:
        parca = re.split(r"\s+[-–—|]\s+", temiz, maxsplit=1)
        if len(parca) == 2:
            artist = artist or parca[0].strip()
            track = parca[1].strip()
        else:
            track = temiz
    if not artist:
        kanal = (info.get("uploader") or info.get("channel") or "").replace(" - Topic", "")
        artist = re.sub(r"(VEVO|Official)$", "", kanal, flags=re.I).strip()
    track = re.sub(r"\s+(ft\.?|feat\.?)\s+.*$", "", track, flags=re.I).strip(" -|\"'")
    return track or "Bilinmeyen Şarkı", artist


def kapak_indir(url, hedef):
    if not url:
        return False
    try:
        with tempfile.NamedTemporaryFile(suffix=".img", delete=False) as f:
            req = urllib.request.Request(url, headers={"User-Agent": TARAYICI_UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                f.write(r.read(5_000_000))
            gecici = f.name
        calistir(["ffmpeg", "-y", "-v", "error", "-i", gecici, "-vf", "scale='min(720,iw)':-2", "-frames:v", "1",
                  "-q:v", "3", str(hedef)])
        os.unlink(gecici)
        return hedef.exists()
    except Exception as e:  # noqa: BLE001
        log(f"   kapak alınamadı: {e}")
        return False


# ---------------------------------------------------------------- 2) vokal ayırma (Demucs)
YUZDE_RE = re.compile(rb"(\d{1,3})%\|")


def ayir(wav, klasor, kalite, ilerleme):
    model = "htdemucs_ft" if kalite == "super" else "htdemucs"
    parca = 4 if model == "htdemucs_ft" else 1
    log(f"   vokal ayrılıyor (Demucs {model}) …")
    cmd = [sys.executable, "-m", "demucs", "--two-stems", "vocals", "-n", model,
           "--mp3", "--mp3-bitrate", "256", "-o", str(klasor / "ayir"), str(wav)]
    if os.environ.get("DEMUCS_SEGMENT"):
        cmd += ["--segment", os.environ["DEMUCS_SEGMENT"]]
    p = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                         env=dict(os.environ, PYTHONUNBUFFERED="1"))
    son_satirlar, tampon, bar, onceki = deque(maxlen=30), b"", 0, 0
    ilerleme.adim("ayir", 0)
    try:
        while True:
            parca_veri = p.stderr.read1(4096)
            if not parca_veri:
                break
            tampon += parca_veri
            *satirlar, tampon = re.split(rb"[\r\n]", tampon)
            for s in satirlar:
                if not s.strip():
                    continue
                son_satirlar.append(s.decode("utf-8", "ignore"))
                m = YUZDE_RE.search(s)
                if m:
                    y = int(m.group(1))
                    if y + 30 < onceki:
                        bar += 1
                    onceki = y
                    ilerleme.adim("ayir", min(1.0, (bar + y / 100) / parca))
    except Iptal:
        p.kill()
        p.wait()
        raise
    rc = p.wait()
    if rc != 0:
        if rc in (-9, 137):
            raise KullaniciHatasi("Sunucunun belleği yetmedi. Kurulumu tekrar çalıştır (takas alanı ekler) "
                                  "ya da daha kısa bir şarkı dene.")
        raise RuntimeError("Demucs hata verdi: " + " | ".join(list(son_satirlar)[-6:]))
    d = klasor / "ayir" / model / wav.stem
    enst, vok = d / "no_vocals.mp3", d / "vocals.mp3"
    if not enst.exists() or not vok.exists():
        raise RuntimeError("Demucs çıktısı bulunamadı")
    return enst, vok


# ---------------------------------------------------------------- 3) sözler (lrclib)
def http_json(url):
    for deneme in range(5):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                time.sleep(float(e.headers.get("Retry-After", "5")) * (1 + random.random() * 0.3))
                continue
            if e.code >= 500 and deneme < 4:
                time.sleep(2)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2)
    return None


def soz_bul(track, artist, sure):
    adaylar = []
    if artist:
        g = http_json(f"{LRCLIB}/get?" + urllib.parse.urlencode(
            {"track_name": track, "artist_name": artist, "duration": max(1, round(sure))}))
        if g:
            adaylar.append(g)
    for q in ([f"{artist} {track}".strip(), track] if artist else [track]):
        adaylar += http_json(f"{LRCLIB}/search?" + urllib.parse.urlencode({"q": q})) or []
        if any(a.get("syncedLyrics") for a in adaylar):
            break
    iyi = []
    for a in adaylar:
        if a.get("instrumental") or not (a.get("syncedLyrics") or a.get("plainLyrics")):
            continue
        ad_b = benzerlik(track, a.get("trackName"))
        sn_b = benzerlik(artist, a.get("artistName")) if artist else 0.6
        if ad_b < 0.6 or (artist and sn_b < 0.45):
            continue
        fark = abs((a.get("duration") or 0) - sure)
        skor = ad_b * 2 + sn_b + (1.5 if a.get("syncedLyrics") else 0) - min(fark, 30) / 10
        iyi.append((skor, a))
    if not iyi:
        return None
    iyi.sort(key=lambda x: -x[0])
    return iyi[0][1]


# ---------------------------------------------------------------- 4) hizalama + kelime zamanlama
LRC_RE = re.compile(r"\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]")


def lrc_oku(metin):
    satirlar = []
    for ham in (metin or "").splitlines():
        etiketler = LRC_RE.findall(ham)
        if not etiketler:
            continue
        yazi = re.sub(r"\[[^\]]*\]", "", ham)
        yazi = re.sub(r"<\d+:\d+(?:\.\d+)?>", "", yazi).strip()
        for m, s in etiketler:
            satirlar.append((int(m) * 60 + float(s.replace(":", ".")), yazi))
    return sorted(satirlar, key=lambda x: x[0])


def lrc_yaz(satirlar):
    out = []
    for s in satirlar:
        t = max(0.0, s["t"])
        out.append(f"[{int(t // 60):02d}:{t - int(t // 60) * 60:05.2f}]{s['m']}")
    return "\n".join(out) + "\n"


def vokal_zarfi(v, sr=SR):
    h = int(sr * HOP)
    n = len(v) // h
    if n == 0:
        return np.zeros(0, dtype=np.float32)
    return np.sqrt((v[: n * h].reshape(n, h) ** 2).mean(axis=1)).astype(np.float32)


def aktif_maske(rms):
    if not len(rms):
        return np.zeros(0, dtype=bool)
    esik = max(float(np.percentile(rms, 95)) * 0.12, 1e-4)
    return rms > esik


def soz_maskesi(satirlar, n):
    m = np.zeros(n, dtype=np.float32)
    for i, (t, yazi) in enumerate(satirlar):
        if not yazi:
            continue
        sonraki = next((x[0] for x in satirlar[i + 1:] if x[0] > t), t + 5)
        bitis = min(sonraki - 0.1, t + max(1.5, len(yazi) * 0.11))
        a, b = int(t / HOP), int(bitis / HOP)
        if b > 0 and a < n:
            m[max(0, a):min(n, b)] = 1
    return m


def kaydirma_bul(rms, satirlar, max_lag=45.0):
    if len(rms) < 20 or not satirlar:
        return 0.0, 0.0, 0.0
    env = np.log1p(rms / (np.percentile(rms, 99) + 1e-9) * 50)
    env = np.convolve(env, np.ones(5) / 5, mode="same")
    z = (env - env.mean()) / (env.std() + 1e-9)
    n = len(z)
    ml = max(1, min(int(max_lag / HOP), int(n * 0.6)))
    mask = soz_maskesi(satirlar, n + ml)
    mask = mask - mask.mean()
    skorlar = np.empty(2 * ml + 1)
    for k, lag in enumerate(range(-ml, ml + 1)):
        i0, i1 = max(0, lag), min(n, len(mask) + lag)
        skorlar[k] = float(np.dot(z[i0:i1], mask[i0 - lag:i1 - lag])) if i1 - i0 > 20 else np.nan
    gecerli = ~np.isnan(skorlar)
    if not gecerli.any():
        return 0.0, 0.0, 0.0
    bi = int(np.nanargmax(skorlar))
    ort, sd = np.nanmean(skorlar), np.nanstd(skorlar) + 1e-9
    uzak = (np.abs(np.arange(len(skorlar)) - bi) * HOP > 1.5) & gecerli
    ikinci = np.nanmax(skorlar[uzak]) if uzak.any() else ort
    return (bi - ml) * HOP, (skorlar[bi] - ort) / sd, (skorlar[bi] - ikinci) / sd


def duz_sozu_zamanla(rms, satirlar_metin):
    """Zamanı olmayan sözleri vokal bölümlerine sırayla yerleştirir."""
    ses = aktif_maske(rms)
    bolumler, bas = [], None
    for i, s in enumerate(ses):
        if s and bas is None:
            bas = i
        elif not s and bas is not None:
            bolumler.append([bas, i])
            bas = None
    if bas is not None:
        bolumler.append([bas, len(ses)])
    birlesik = []
    for b in bolumler:
        if birlesik and (b[0] - birlesik[-1][1]) * HOP < 0.35:
            birlesik[-1][1] = b[1]
        else:
            birlesik.append(b)
    bolumler = [b for b in birlesik if (b[1] - b[0]) * HOP >= 0.4]
    L = len(satirlar_metin)
    if not bolumler or not L:
        return None
    while len(bolumler) > L:
        bosluklar = [bolumler[i + 1][0] - bolumler[i][1] for i in range(len(bolumler) - 1)]
        i = int(np.argmin(bosluklar))
        bolumler[i][1] = bolumler[i + 1][1]
        del bolumler[i + 1]
    while len(bolumler) < L:
        i = int(np.argmax([b[1] - b[0] for b in bolumler]))
        a, b = bolumler[i]
        orta = (a + b) // 2
        bolumler[i:i + 1] = [[a, orta], [orta, b]]
    return [(b[0] * HOP, yazi) for b, yazi in zip(bolumler, satirlar_metin)]


def dil_bul(metin):
    return "tr" if re.search(r"[çğıöşüÇĞİÖŞÜ]", metin or "") else "en"


def hece_say(w, dil):
    w = w.lower()
    if dil == "tr":
        n = len(re.findall(r"[aeıioöuüâîû]", w))
    else:
        n = len(re.findall(r"[aeiouy]+", w))
        if n > 1 and w.endswith("e") and not w.endswith(("le", "ee")):
            n -= 1
    return max(1, n)


def kelime_zamanla(satirlar, rms, sure):
    """Her satıra bitiş zamanı, her kelimeye başlangıç-bitiş verir.
    Kelimeler, satır içinde vokalin gerçekten duyulduğu anlara hece sayısıyla dağıtılır."""
    aktif = aktif_maske(rms)
    dil = dil_bul(" ".join(y for _, y in satirlar))
    n = len(aktif)
    out = []
    for i, (t, yazi) in enumerate(satirlar):
        if not yazi.strip():
            continue
        sonraki = satirlar[i + 1][0] if i + 1 < len(satirlar) else min(sure or t + 12, t + 12)
        pencere = max(t + 0.4, sonraki - 0.05)
        a, b = max(0, int(t / HOP)), max(0, min(n, int(pencere / HOP)))
        seg = aktif[a:b] if b > a else np.zeros(0, dtype=bool)
        if seg.any():
            e = min(pencere, (a + int(np.nonzero(seg)[0][-1]) + 1) * HOP + 0.15)
        else:
            e = min(pencere, t + max(1.2, len(yazi) * 0.09))
        e = max(e, t + min(0.8, pencere - t))
        kelimeler = yazi.split()
        heceler = [hece_say(w, dil) for w in kelimeler]
        a2, b2 = max(0, int(round(t / HOP))), max(int(round(t / HOP)) + 1, int(round(e / HOP)))
        act = aktif[a2:min(n, b2)].astype(np.float64) if a2 < n else np.zeros(0)
        if len(act) < b2 - a2:
            act = np.concatenate([act, np.zeros(b2 - a2 - len(act))])
        if act.sum() * HOP < 0.35 * (e - t):
            act = np.ones(b2 - a2)
        cum = np.concatenate([[0.0], np.cumsum(act)])
        cum /= cum[-1]
        toplam, acc, k = sum(heceler), 0, []
        for w, h in zip(kelimeler, heceler):
            i0 = int(np.searchsorted(cum, acc / toplam + 1e-9, side="left"))
            i1 = int(np.searchsorted(cum, (acc + h) / toplam - 1e-9, side="left"))
            t0 = t + max(0, i0 - 1) * HOP if acc else t
            t1 = min(e, t + max(i1, i0) * HOP)
            k.append([w, round(t0, 2), round(max(t1, t0 + 0.08), 2)])
            acc += h
        out.append({"t": round(t, 2), "e": round(e, 2), "m": yazi, "k": k})
    return out, dil


def sozleri_hazirla(s, rms, sure):
    """lrclib sonucu (ya da elle girilen) -> (satır listesi, senkron türü, kaydırma)"""
    if not s:
        return [], "yok", 0.0
    if s.get("syncedLyrics") and lrc_oku(s["syncedLyrics"]):
        satirlar = lrc_oku(s["syncedLyrics"])
        off, guven, ayrim = kaydirma_bul(rms, satirlar)
        kaydirma = 0.0
        if guven > 3.0 and ayrim > 0.6:
            kaydirma = off
            satirlar = [(t + off, y) for t, y in satirlar]
            log(f"   ✓ sözler vokale hizalandı ({off:+.2f} sn, güven {guven:.1f})")
        else:
            log(f"   sözler olduğu gibi kullanıldı (hizalama güveni düşük: {guven:.1f})")
        liste, _ = kelime_zamanla(satirlar, rms, sure)
        return liste, "otomatik", round(kaydirma, 2)
    metin = [x.strip() for x in (s.get("plainLyrics") or "").splitlines()
             if x.strip() and not re.match(r"^\[.*\]$", x.strip())]
    satirlar = duz_sozu_zamanla(rms, metin)
    if not satirlar:
        return [], "yok", 0.0
    liste, _ = kelime_zamanla(satirlar, rms, sure)
    return liste, "tahmin", 0.0


# ---------------------------------------------------------------- 5) notalar
def perde_izi(v, sr=SR, hop_s=0.02, W=1024):
    """McLeod (NSDF) ile kare kare perde. Döner: zamanlar, midi (nan = sessiz)."""
    hop = int(sr * hop_s)
    if len(v) < W + hop:
        return np.zeros(0), np.zeros(0)
    n = (len(v) - W) // hop
    min_lag, max_lag = int(sr / 1000), int(sr / 70)
    taus = np.arange(W)
    genel = np.percentile(np.abs(v), 99) + 1e-9
    midi = np.full(n, np.nan)
    for c0 in range(0, n, 1024):
        idx = np.arange(c0, min(n, c0 + 1024))
        F = np.stack([v[i * hop:i * hop + W] for i in idx]).astype(np.float64)
        rms = np.sqrt((F ** 2).mean(axis=1))
        spec = np.fft.rfft(F, n=2 * W)
        acf = np.fft.irfft(np.abs(spec) ** 2)[:, :W]
        cs = np.cumsum(F ** 2, axis=1)
        top = cs[:, -1:]
        sol = cs[:, W - 1 - taus]
        onceki = np.concatenate([np.zeros((len(F), 1)), cs[:, :-1]], axis=1)
        sag = top - onceki[:, taus]
        nsdf = 2 * acf / (sol + sag + 1e-12)
        for r in range(len(F)):
            if rms[r] < genel * 0.04:
                continue
            row = nsdf[r]
            neg = np.where(row[min_lag:max_lag] < 0)[0]
            if not len(neg):
                continue
            bas = min_lag + neg[0]
            seg = row[bas:max_lag]
            if len(seg) < 3:
                continue
            tepeler = np.where((seg[1:-1] > seg[:-2]) & (seg[1:-1] >= seg[2:]))[0] + 1
            if not len(tepeler):
                continue
            mx = seg[tepeler].max()
            if mx < 0.55:
                continue
            k = tepeler[np.argmax(seg[tepeler] >= 0.88 * mx)]
            tau = bas + k
            a, b, c = row[tau - 1], row[tau], row[min(tau + 1, W - 1)]
            den = a - 2 * b + c
            tau_i = tau + (0.5 * (a - c) / den if den else 0)
            f = sr / tau_i
            if 70 <= f <= 1000:
                midi[idx[r]] = 69 + 12 * np.log2(f / 440.0)
    t = np.arange(n) * hop_s + W / sr / 2
    return t, midi


def notalara_cevir(t, midi, hop_s=0.02):
    if not len(midi):
        return []
    m = midi.copy()
    yum = np.full_like(m, np.nan)
    for i in range(len(m)):
        p = m[max(0, i - 2):i + 3]
        p = p[~np.isnan(p)]
        if len(p) >= 3 and not np.isnan(m[i]):
            yum[i] = np.median(p)
    notalar, bas, deger = [], None, []

    def bitir(son):
        if bas is not None and (son - bas) * hop_s >= 0.12:
            notalar.append([round(float(t[bas]), 3), round((son - bas) * hop_s, 3), int(round(float(np.median(deger))))])
    for i, x in enumerate(yum):
        if np.isnan(x):
            bitir(i)
            bas, deger = None, []
            continue
        if bas is None:
            bas, deger = i, [x]
        elif abs(x - np.median(deger)) > 0.75:
            bitir(i)
            bas, deger = i, [x]
        else:
            deger.append(x)
    bitir(len(yum))
    birlesik = []
    for nt in notalar:
        if birlesik and birlesik[-1][2] == nt[2] and nt[0] - (birlesik[-1][0] + birlesik[-1][1]) < 0.07:
            birlesik[-1][1] = round(nt[0] + nt[1] - birlesik[-1][0], 3)
        else:
            birlesik.append(nt)
    return birlesik


# ---------------------------------------------------------------- 6) paket
def json_yaz(yol, veri, girintili=False):
    gecici = yol.with_suffix(yol.suffix + ".tmp")
    gecici.write_text(json.dumps(veri, ensure_ascii=False, indent=1 if girintili else None,
                                 separators=None if girintili else (",", ":")), encoding="utf-8")
    os.replace(gecici, yol)


def paket_bul(paket_kok, anahtar):
    for b in Path(paket_kok).glob("*/bilgi.json"):
        try:
            bilgi = json.loads(b.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if bilgi.get("anahtar") == anahtar:
            return bilgi
    return None


def isle(kaynak, paket_kok, kalite="normal", cerez=None, pot_url=None, ilerleme=None,
         dosya_mi=False, mevcutsa_atla=True):
    ilerleme = ilerleme or Ilerleme()
    paket_kok = Path(paket_kok)
    paket_kok.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="okar-") as tmp:
        tmp = Path(tmp)
        ilerleme.adim("indir", 0)
        if dosya_mi:
            log(f"📁 dosya: {kaynak}")
            wav, info = dosyadan(Path(kaynak), tmp)
            kaynak_ad = "dosya:" + hashlib.sha1(Path(kaynak).read_bytes()).hexdigest()[:16]
            anahtar = kaynak_ad
            mevcut = paket_bul(paket_kok, anahtar) if mevcutsa_atla else None
            if mevcut:
                return mevcut
        else:
            tur, deger = kaynak_coz(kaynak)
            secilen = {}

            def bulundu(url):
                secilen["url"] = url
                secilen["anahtar"] = anahtar_yap(url)
                if mevcutsa_atla:
                    m = paket_bul(paket_kok, secilen["anahtar"])
                    if m:
                        raise _Mevcut(m)
            try:
                if tur == "ara":
                    if len(deger) < 2:
                        raise KullaniciHatasi("Şarkının adını ya da linkini yaz.")
                    log(f"🔎 aranıyor: {deger}")
                    ilerleme.adim("indir", 0.03, baslik=deger)
                    url = youtube_ara(deger, ytdlp_ayar(tmp, cerez, pot_url, ilerleme))
                else:
                    url = deger
                log(f"⬇  indiriliyor: {url}")
                wav, info = indir(url, tmp, ilerleme, cerez, pot_url, bulundu)
            except _Mevcut as m:
                log("   bu şarkı zaten hazır")
                return m.bilgi
            kaynak_ad = info.get("webpage_url") or secilen.get("url") or deger
            anahtar = secilen.get("anahtar") or anahtar_yap(kaynak_ad)
        track, artist = ad_tahmin(info)
        sure = sure_olc(wav)
        if sure < 5:
            raise KullaniciHatasi("Bu dosyada ses bulamadım.")
        if sure > MAX_SURE:
            raise KullaniciHatasi(f"Şarkı çok uzun ({int(sure // 60)} dk). En fazla {int(MAX_SURE // 60)} dakika.")
        ilerleme.adim("indir", 1, baslik=track, sanatci=artist, sure=round(sure))
        log(f"   {artist + ' – ' if artist else ''}{track} ({int(sure // 60)}:{int(sure % 60):02d})")

        enst, vok = ayir(wav, tmp, kalite, ilerleme)

        pid = slug(f"{artist}-{track}" if artist else track) + "-" + hashlib.sha1(anahtar.encode()).hexdigest()[:6]
        gecici = paket_kok / f".{pid}.yeni"
        if gecici.exists():
            shutil.rmtree(gecici)
        gecici.mkdir(parents=True)
        shutil.copy(enst, gecici / "enstrumantal.mp3")
        calistir(["ffmpeg", "-y", "-v", "error", "-i", str(vok), "-ac", "1", "-b:a", "96k", str(gecici / "vokal.mp3")])
        kapak = kapak_indir(info.get("thumbnail"), gecici / "kapak.jpg") if not dosya_mi else False

        ilerleme.adim("soz", 0)
        v = pcm(vok)
        rms = vokal_zarfi(v)
        np.save(gecici / "zarf.npy", rms)
        try:
            s = soz_bul(track, artist, sure)
        except Exception as e:  # noqa: BLE001
            log(f"   ⚠ söz araması başarısız: {e}")
            s = None
        satirlar, senkron, kaydirma = sozleri_hazirla(s, rms, sure)
        dil = dil_bul(" ".join(x["m"] for x in satirlar))
        json_yaz(gecici / "sozler.json", {"senkron": senkron, "dil": dil, "satirlar": satirlar})
        if satirlar:
            (gecici / "sozler.lrc").write_text(lrc_yaz(satirlar), encoding="utf-8")
        if not satirlar:
            log("   ⚠ söz bulunamadı")

        ilerleme.adim("nota", 0)
        t, midi = perde_izi(v)
        notalar = notalara_cevir(t, midi)
        json_yaz(gecici / "notlar.json", notalar)
        log(f"   ✓ {len(notalar)} nota")

        bilgi = {
            "id": pid, "baslik": track, "sanatci": artist, "sure": round(sure, 2),
            "kaynak": kaynak_ad, "anahtar": anahtar, "kapak": bool(kapak),
            "senkron": senkron, "kaydirma": kaydirma, "ayar": 0.0, "dil": dil,
            "satir": len(satirlar), "nota": len(notalar), "soz_kaynak": (s or {}).get("id"),
            "model": "htdemucs_ft" if kalite == "super" else "htdemucs",
            "tarih": datetime.now(timezone.utc).isoformat(timespec="seconds"), "surum": 1,
        }
        json_yaz(gecici / "bilgi.json", bilgi, girintili=True)
        hedef = paket_kok / pid
        if hedef.exists():
            shutil.rmtree(hedef)
        os.replace(gecici, hedef)
        ilerleme.adim("nota", 1)
        log(f"✅ hazır: {pid}")
        return bilgi


class _Mevcut(Exception):
    def __init__(self, bilgi):
        super().__init__("mevcut")
        self.bilgi = bilgi


def sozleri_yenile(hedef, metin=None, baslik=None, sanatci=None):
    """Sözleri yeniden bulur (yeni adla) ya da yapıştırılan sözleri vokale yerleştirir."""
    hedef = Path(hedef)
    bilgi = json.loads((hedef / "bilgi.json").read_text(encoding="utf-8"))
    rms = np.load(hedef / "zarf.npy")
    sure = bilgi.get("sure") or len(rms) * HOP
    if metin and metin.strip():
        s = {"syncedLyrics": metin} if lrc_oku(metin) else {"plainLyrics": metin}
        satirlar, senkron, kaydirma = sozleri_hazirla(s, rms, sure)
        if senkron == "tahmin":
            senkron = "elle"
    else:
        baslik = (baslik or bilgi["baslik"]).strip()
        sanatci = (bilgi.get("sanatci") or "") if sanatci is None else sanatci.strip()
        s = soz_bul(baslik, sanatci, sure)
        if not s:
            raise KullaniciHatasi("Bu adla söz bulamadım. Adı kontrol et ya da sözleri kendin yapıştır.")
        satirlar, senkron, kaydirma = sozleri_hazirla(s, rms, sure)
        bilgi["baslik"], bilgi["sanatci"], bilgi["soz_kaynak"] = baslik, sanatci, s.get("id")
    if not satirlar:
        raise KullaniciHatasi("Sözleri yerleştiremedim. Her satırı ayrı satıra yazdığından emin ol.")
    dil = dil_bul(" ".join(x["m"] for x in satirlar))
    json_yaz(hedef / "sozler.json", {"senkron": senkron, "dil": dil, "satirlar": satirlar})
    (hedef / "sozler.lrc").write_text(lrc_yaz(satirlar), encoding="utf-8")
    bilgi.update(senkron=senkron, kaydirma=kaydirma, ayar=0.0, dil=dil, satir=len(satirlar),
                 surum=int(bilgi.get("surum", 1)) + 1)
    json_yaz(hedef / "bilgi.json", bilgi, girintili=True)
    return bilgi


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Osman Karaoke işleyici")
    ap.add_argument("kaynak", help="link, şarkı adı ya da dosya yolu")
    ap.add_argument("--cikti", default="paketler")
    ap.add_argument("--kalite", default="normal", choices=["normal", "super"])
    a = ap.parse_args()
    dosya = Path(a.kaynak).exists()
    sonuc = isle(a.kaynak, a.cikti, a.kalite, dosya_mi=dosya,
                 ilerleme=Ilerleme(lambda **k: log(f"   [{k['yuzde']:5.1f}%] {k['asama']}")))
    print(json.dumps(sonuc, ensure_ascii=False, indent=1))
