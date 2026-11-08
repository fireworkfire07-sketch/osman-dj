#!/usr/bin/env bash
# =====================================================================
#  OSMAN KARAOKE — tek komutla kurulum / güncelleme (Ubuntu / Debian VPS)
#
#  Kur ya da güncelle:
#    curl -fsSL https://raw.githubusercontent.com/fireworkfire07-sketch/osman-karaoke/main/kur.sh | sudo bash
#  Diğer komutlar (kurulumdan sonra):
#    sudo bash /opt/osman-karaoke/kur.sh bilgi     # telefon linkini ve kodu tekrar göster
#    sudo bash /opt/osman-karaoke/kur.sh log       # canlı kayıtlar
#    sudo bash /opt/osman-karaoke/kur.sh durdur    # kapat
# =====================================================================
set -euo pipefail
REPO="${REPO:-fireworkfire07-sketch/osman-karaoke}"
DAL="${DAL:-main}"
DIZIN="${DIZIN:-/opt/osman-karaoke}"
KOMUT="${1:-kur}"

mor() { printf '\033[1;35m%s\033[0m\n' "$*"; }
yesil() { printf '\033[1;32m%s\033[0m\n' "$*"; }
sari() { printf '\033[1;33m%s\033[0m\n' "$*"; }
hata() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || hata "sudo ile çalıştır:  curl -fsSL …/kur.sh | sudo bash"

# Bu klasörde zaten dosyalar varsa onları kullan (zip'ten kurulum)
if [ -f "./docker-compose.yml" ] && [ -d "./sunucu" ]; then DIZIN="$(pwd)"; YEREL=1; else YEREL=0; fi
if [ "$KOMUT" != "kur" ] && [ -f "$DIZIN/docker-compose.yml" ]; then cd "$DIZIN"; fi

bilgi_goster() {
  cd "$DIZIN"
  set -a; . ./.env; set +a
  local URL=""
  if [[ "${COMPOSE_PROFILES:-}" == *tunel* ]]; then
    for _ in $(seq 1 40); do
      URL=$(docker compose logs tunel 2>/dev/null | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true)
      [ -n "$URL" ] && break; sleep 2
    done
  else
    URL="https://$ALAN"
  fi
  [ -n "$URL" ] || hata "Adres bulunamadı. 'sudo bash $DIZIN/kur.sh log' ile kayıtlara bak."
  echo
  yesil "✅ Osman Karaoke hazır!"
  echo
  echo "  📱 Telefonunda bu linki aç (kod içinde, bir kere açman yeter):"
  echo
  printf '     \033[1;36m%s/#kod=%s\033[0m\n' "$URL" "$KOD"
  echo
  echo "  🔑 Giriş kodu: $KOD"
  if command -v qrencode >/dev/null 2>&1; then qrencode -t ANSIUTF8 "$URL/#kod=$KOD"; fi
  if [[ "${COMPOSE_PROFILES:-}" == *tunel* ]]; then
    sari "  Not: tünel adresi sunucu yeniden başlayınca değişir. Yeni adres için: sudo bash $DIZIN/kur.sh bilgi"
  fi
  echo
}

case "$KOMUT" in
  bilgi) bilgi_goster; exit 0 ;;
  log) cd "$DIZIN"; exec docker compose logs -f --tail 100 karaoke ;;
  durdur) cd "$DIZIN"; docker compose down; yesil "Durduruldu."; exit 0 ;;
  kur) ;;
  *) hata "Bilinmeyen komut: $KOMUT (kur | bilgi | log | durdur)" ;;
esac

mor "🎤 Osman Karaoke kuruluyor…"

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  mor "→ Docker kuruluyor (birkaç dakika)…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || hata "docker compose yok. Docker'ı güncelle: curl -fsSL https://get.docker.com | sh"

# 2) Dosyalar
if [ "$YEREL" = 1 ]; then
  mor "→ Bu klasördeki dosyalar kullanılıyor: $DIZIN"
else
  mor "→ Dosyalar indiriliyor: github.com/$REPO"
  mkdir -p "$DIZIN"
  GECICI="$(mktemp -d)"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$DAL" | tar xz -C "$GECICI" --strip-components=1 \
    || hata "İndirilemedi. Repo herkese açık (public) mı? github.com/$REPO"
  cp -a "$GECICI/." "$DIZIN/"          # veri/ ve .env olduğu gibi kalır
  rm -rf "$GECICI"
fi
cd "$DIZIN"
mkdir -p veri
chmod +x kur.sh 2>/dev/null || true

# 3) Disk ve bellek
BOS_GB=$(df -BG --output=avail "$DIZIN" | tail -1 | tr -dc '0-9')
[ "${BOS_GB:-0}" -ge 8 ] || sari "⚠ Diskte ${BOS_GB} GB boş yer var; en az 8 GB önerilir."
RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
TAKAS_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$RAM_MB" -lt 3800 ] && [ "$TAKAS_MB" -lt 2000 ]; then
  mor "→ Bellek az (${RAM_MB} MB). 4 GB takas alanı ekleniyor…"
  if [ ! -f /swapfile-karaoke ]; then
    fallocate -l 4G /swapfile-karaoke 2>/dev/null || dd if=/dev/zero of=/swapfile-karaoke bs=1M count=4096 status=none
    chmod 600 /swapfile-karaoke
    mkswap /swapfile-karaoke >/dev/null
  fi
  swapon /swapfile-karaoke 2>/dev/null || true
  grep -q swapfile-karaoke /etc/fstab || echo "/swapfile-karaoke none swap sw 0 0" >> /etc/fstab
fi

# 4) Ayarlar (.env) — sadece ilk kurulumda
if [ ! -f .env ]; then
  KOD=$(od -An -N5 -tx1 /dev/urandom | tr -d ' \n')
  IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || curl -4 -fsS --max-time 10 https://ifconfig.me 2>/dev/null || true)
  [ -n "$IP" ] || hata "Sunucunun dış IP adresi bulunamadı."
  ALAN="${IP//./-}.sslip.io"
  PROFIL="https"
  if command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -E '[:.](80|443)$' >/dev/null; then
    PROFIL="tunel"
    sari "→ 80/443 portları başka bir program tarafından kullanılıyor; Cloudflare tüneli kullanılacak."
  fi
  printf 'KOD=%s\nALAN=%s\nCOMPOSE_PROFILES=%s,pot\n' "$KOD" "$ALAN" "$PROFIL" > .env
  chmod 600 .env
fi
set -a; . ./.env; set +a

# PO token yardımcısı bu işlemcide yoksa onsuz devam et
if ! docker pull -q brainicism/bgutil-ytdlp-pot-provider:2.0.2 >/dev/null 2>&1; then
  sari "→ YouTube yardımcısı (pot) bu sunucuda çalışmıyor, onsuz devam ediliyor."
  sed -i 's/,pot$//' .env; set -a; . ./.env; set +a
fi

# 5) Güvenlik duvarı
if [[ "${COMPOSE_PROFILES}" == *https* ]] && command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi

# 6) Kur ve başlat
mor "→ Uygulama hazırlanıyor. İlk seferde 5-15 dakika sürebilir, bekle…"
export GUNCEL="$(date +%Y%m%d)"
docker compose up -d --build --remove-orphans

mor "→ Uygulamanın açılması bekleniyor…"
HAZIR=0
for _ in $(seq 1 120); do
  if docker compose exec -T karaoke curl -fs http://localhost:8000/saglik >/dev/null 2>&1; then HAZIR=1; break; fi
  sleep 2
done
[ "$HAZIR" = 1 ] || hata "Uygulama açılmadı. Kayıtlar: sudo bash $DIZIN/kur.sh log"

if [[ "${COMPOSE_PROFILES}" == *https* ]]; then
  mor "→ HTTPS sertifikası alınıyor…"
  for _ in $(seq 1 45); do
    curl -fsS --max-time 5 "https://$ALAN/saglik" >/dev/null 2>&1 && break
    sleep 2
  done
fi

bilgi_goster
