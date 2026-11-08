#!/usr/bin/env python3
"""arayuz/ kaynaklarını tek dosya sunucu/static/index.html olarak birleştirir, simgeleri üretir."""
import json
from pathlib import Path

KOK = Path(__file__).resolve().parent
HEDEF = KOK.parent / "sunucu" / "static"
JS = ["temel.js", "ses.js", "ana.js", "sahne.js", "kayit.js", "baslat.js"]
SURUM = "2.0"

BAS = f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Osman Karaoke</title>
<meta name="theme-color" content="#0b0918">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Karaoke">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/ikon-180.png">
<link rel="icon" type="image/png" href="/ikon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
<!-- Osman Karaoke {SURUM} -->
<style>
"""


def ikonlar():
    from PIL import Image, ImageDraw, ImageFilter
    for boy in (180, 192, 512):
        s = boy * 4
        img = Image.new("RGB", (s, s))
        px = img.load()
        for y in range(s):
            for x in range(s):
                t = (x + y) / (2 * s)
                a, b = (255, 79, 163), (255, 176, 58)
                px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
        d = ImageDraw.Draw(img)
        c = s / 2
        g = s * 0.15
        d.rounded_rectangle([c - g, s * 0.18, c + g, s * 0.58], radius=g, fill="white")
        w = int(s * 0.045)
        d.arc([c - s * 0.25, s * 0.3, c + s * 0.25, s * 0.68], start=0, end=180, fill="white", width=w)
        d.line([c, s * 0.68, c, s * 0.8], fill="white", width=w)
        d.rounded_rectangle([c - s * 0.15, s * 0.78, c + s * 0.15, s * 0.78 + w], radius=w // 2, fill="white")
        img = img.filter(ImageFilter.SMOOTH).resize((boy, boy), Image.LANCZOS)
        img.save(HEDEF / f"ikon-{boy}.png", optimize=True)


def main():
    HEDEF.mkdir(parents=True, exist_ok=True)
    css = (KOK / "stil.css").read_text(encoding="utf-8")
    govde = (KOK / "govde.html").read_text(encoding="utf-8")
    js = "\n".join((KOK / "js" / f).read_text(encoding="utf-8") for f in JS)
    html = BAS + css + "\n</style>\n</head>\n<body>\n" + govde + "\n<script>\n" + js + "\n</script>\n</body>\n</html>\n"
    (HEDEF / "index.html").write_text(html, encoding="utf-8")
    (HEDEF / "manifest.webmanifest").write_text(json.dumps({
        "name": "Osman Karaoke", "short_name": "Karaoke", "start_url": "/", "display": "standalone",
        "background_color": "#0b0918", "theme_color": "#0b0918", "orientation": "any", "lang": "tr",
        "icons": [{"src": "/ikon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "/ikon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    if not (HEDEF / "ikon-512.png").exists():
        ikonlar()
    print(f"index.html {len(html) // 1024} KB")


if __name__ == "__main__":
    main()
