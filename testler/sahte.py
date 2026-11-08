"""Test için sahte indirme / vokal ayırma / söz bulma. Gerçek sunucuda kullanılmaz."""
import hashlib
import subprocess
import time

import numpy as np

SR = 44100
SURE = 42.0
KAYMA = 2.0          # lrclib'deki sözler gerçek vokalden 2 sn erken -> hizalayıcı +2.0 bulmalı
SOZLER = [
    (4.0, "Bir gece yarısı deniz kenarında"),
    (9.0, "Yıldızlar parlıyor gözlerinde"),
    (14.0, "Şarkımı söylerken rüzgâr eser"),
    (19.0, "Kalbimde bu gece bir sen varsın"),
    (27.0, "Gel benimle dans et sabaha kadar"),
    (32.0, "Antalya geceleri bizim olsun"),
]
DERECE = [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 7, 8, 7, 5, 3]
NOTALAR = []          # [t, d, midi] — doğrulama için


def _hece(w):
    return max(1, sum(ch in "aeıioöuüâîû" for ch in w.lower()))


def _vokal():
    n = int(SURE * SR)
    v = np.zeros(n, dtype=np.float64)
    NOTALAR.clear()
    k = 0
    for t0, satir in SOZLER:
        heceler = sum(_hece(w) for w in satir.split())
        dur = 3.6 / heceler
        for h in range(heceler):
            m = 57 + DERECE[k % len(DERECE)] + 5
            k += 1
            bas, d = t0 + h * dur, dur - 0.04
            NOTALAR.append([round(bas, 3), round(d, 3), m])
            tt = np.arange(int(d * SR)) / SR
            f = 440 * 2 ** ((m - 69) / 12) * 2 ** (0.25 * np.sin(2 * np.pi * 5.5 * tt) * np.clip(tt / 0.25 - 0.6, 0, 1) / 12)
            faz = 2 * np.pi * np.cumsum(f) / SR
            dalga = sum(np.sin(faz * i) / i ** 1.3 for i in range(1, 7))
            env = np.minimum(1, tt / 0.03) * np.minimum(1, (d - tt) / 0.06)
            i0 = int(bas * SR)
            v[i0:i0 + len(tt)] += dalga * env * 0.32
    return v


def _esli():
    n = int(SURE * SR)
    t = np.arange(n) / SR
    a = np.zeros(n)
    akorlar = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]]
    for i in range(int(SURE / 2)):
        ak = akorlar[i % 4]
        i0, i1 = int(i * 2 * SR), int((i + 1) * 2 * SR)
        tt = t[i0:i1] - i * 2
        for j, m in enumerate(ak):
            f = 440 * 2 ** ((m - 69) / 12)
            a[i0:i1] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * (0.22 if j == 0 else 0.07) * np.exp(-tt * 0.6)
    rng = np.random.default_rng(3)
    for b in np.arange(0, SURE, 0.5):
        i0 = int(b * SR)
        tt = np.arange(int(0.25 * SR)) / SR
        a[i0:i0 + len(tt)] += np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) * 0.5
        j0 = int((b + 0.25) * SR)
        h = rng.standard_normal(int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 80) * 0.05
        a[j0:j0 + len(h)] += h[: max(0, min(len(h), n - j0))]
    return a[:n]


def _yaz(dizi, yol, kanal=1, bitrate="192k"):
    veri = np.clip(dizi, -1, 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", str(kanal), "-i", "-",
                    "-b:a", bitrate, str(yol)] if str(yol).endswith(".mp3") else
                   ["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", str(kanal), "-i", "-", str(yol)],
                   input=veri.tobytes(), check=True)


def ayarla(IS):
    def youtube_ara(sorgu, opts):
        if "bulunmaz" in sorgu:
            raise IS.KullaniciHatasi(f"“{sorgu}” için şarkı bulamadım. Başka türlü yaz ya da linkini yapıştır.")
        return "https://www.youtube.com/watch?v=" + hashlib.md5(sorgu.encode()).hexdigest()[:11]

    def indir(url, klasor, ilerleme, cerez=None, pot_url=None, bulundu=None):
        if "robot" in url:
            raise IS.KullaniciHatasi("YouTube sunucuyu robot sandı. Ayarlar → “YouTube çerezi” ekle "
                                     "ya da şarkı dosyasını telefondan seç.")
        if bulundu:
            bulundu(url)
        ilerleme.adim("indir", 0.12, baslik="Antalya Geceleri", sanatci="Osman Test")
        for i in range(5):
            time.sleep(0.15)
            ilerleme.adim("indir", 0.2 + i * 0.15)
        v, a = _vokal(), _esli()
        np.save(klasor / "_v.npy", v)
        np.save(klasor / "_a.npy", a)
        st = np.stack([v * 0.9 + a * 0.55, v * 0.9 + a * 0.45], axis=1).reshape(-1)
        _yaz(st, klasor / "kaynak.wav", kanal=2)
        return klasor / "kaynak.wav", {"title": "Osman Test - Antalya Geceleri (Official Video)",
                                      "webpage_url": url, "thumbnail": "sahte", "duration": SURE}

    def ayir(wav, klasor, kalite, ilerleme):
        for y in range(0, 101, 10):
            time.sleep(0.2)
            ilerleme.adim("ayir", y / 100)
        if not (klasor / "_v.npy").exists():          # telefondan yüklenen dosya
            v, a = _vokal(), _esli()
        else:
            v, a = np.load(klasor / "_v.npy"), np.load(klasor / "_a.npy")
        _yaz(np.stack([a * 0.55, a * 0.45], axis=1).reshape(-1), klasor / "no_vocals.mp3", kanal=2, bitrate="256k")
        _yaz(v * 0.9 + a * 0.02, klasor / "vocals.mp3")
        return klasor / "no_vocals.mp3", klasor / "vocals.mp3"

    def soz_bul(track, artist, sure):
        if "sozsuz" in (track or "").lower():
            return None
        satirlar = []
        for t, y in SOZLER:
            t -= KAYMA
            satirlar.append(f"[{int(t // 60):02d}:{t % 60:05.2f}]{y}")
        satirlar.insert(4, f"[00:{24 - KAYMA:05.2f}]")
        return {"id": 4242, "syncedLyrics": "\n".join(satirlar), "plainLyrics": "\n".join(y for _, y in SOZLER)}

    def kapak_indir(url, hedef):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                        "testsrc2=s=640x360:d=1", "-frames:v", "1", str(hedef)], check=True)
        return True

    IS.youtube_ara, IS.indir, IS.ayir, IS.soz_bul, IS.kapak_indir = youtube_ara, indir, ayir, soz_bul, kapak_indir
