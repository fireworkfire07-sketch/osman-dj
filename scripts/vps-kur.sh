#!/usr/bin/env bash
# OSMAN DJ V5 — Ubuntu VPS kurulumu (22.04 / 24.04). Klasörün içinde çalıştır:  bash scripts/vps-kur.sh
set -e
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
fi
sudo timedatectl set-timezone Europe/Istanbul || true
mkdir -p out custom
[ -f .env ] || { cp .env.example .env; echo "📝 .env oluşturuldu — YouTube bilgilerini doldur (README)."; }

echo "🔨 Stüdyo imajı hazırlanıyor (ilk seferde 5-10 dk)..."
sudo docker compose build

echo "🧪 3 dakikalık deneme seti üretiliyor (YouTube'a yüklenmez)..."
sudo docker compose run --rm studio node src/produce.js --minutes 3 --genres saman,psy --no-upload
echo "📼 Arşiv: out/arsiv/index.html"

echo "🚀 Sürekli üretim + 7/24 radyo başlatılıyor..."
sudo docker compose up -d
echo "✅ Hazır. Kayıtları izlemek için:  sudo docker compose logs -f"
