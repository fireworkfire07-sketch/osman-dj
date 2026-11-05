#!/usr/bin/env bash
# OSMAN DJ — tek komut VPS kurulumu (Ubuntu 22.04/24.04, root)
#   curl -fsSL https://raw.githubusercontent.com/fireworkfire07-sketch/osman-dj/main/scripts/kur.sh | bash
set -e
REPO="https://github.com/fireworkfire07-sketch/osman-dj.git"
DIR=/opt/osmandj
echo "🌟 OSMAN DJ kuruluyor — ANATOLIAN SHAMANS"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates >/dev/null
timedatectl set-timezone Europe/Istanbul 2>/dev/null || true

if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# Takas alanı (RAM'i korur, üretim sırasında çökme olmasın)
if ! swapon --show | grep -q swapfile; then
  fallocate -l 8G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if [ -d "$DIR/.git" ]; then echo "🔄 Kod güncelleniyor..."; git -C "$DIR" pull -q; else git clone -q "$REPO" "$DIR"; fi
cd "$DIR"
mkdir -p out custom
[ -f .env ] || cp .env.example .env

# Kısa yönetim komutu:  osmandj durum | log | radyo-log | guncelle | yukle | arsiv | dur | basla
install -m 755 scripts/osmandj /usr/local/bin/osmandj

echo "🔨 Stüdyo hazırlanıyor (ilk seferde 5-15 dk)..."
docker compose build -q
docker compose up -d
echo ""
echo "✅ OSMAN DJ çalışıyor."
echo "   • Sürekli üretim başladı: günde 4 set, ilk 10 set (ilk set yaklaşık 1 saat içinde)"
echo "   • Arşiv: $DIR/out/arsiv  ·  durum için:  osmandj durum"
echo "   • YouTube bağlanınca biriken setler:  osmandj yukle"
echo ""
osmandj durum || true
