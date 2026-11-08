#!/usr/bin/env bash
# =====================================================================
#  OSMAN KARAOKE — tek komutla kurulum / güncelleme
#  Ubuntu / Debian VPS ya da Windows'taki Ubuntu (WSL) üzerinde çalışır.
#
#  Kur ya da güncelle (TEK satır, bir kere yapıştır):
#    curl -fsSL https://raw.githubusercontent.com/fireworkfire07-sketch/osman-dj/karaoke/kur.sh | sudo bash
#
#  Kurulumdan sonra kısayollar:
#    karaoke            telefon linkini göster (kapalıysa açar)
#    karaoke log        canlı kayıtlar
#    karaoke durdur     kapat
#    karaoke guncelle   en son sürüme güncelle
# =====================================================================
set -euo pipefail
REPO="${REPO:-fireworkfire07-sketch/osman-dj}"
DAL="${DAL:-karaoke}"
DIZIN="${DIZIN:-/opt/osman-karaoke}"
KOMUT="${1:-kur}"

mor() { printf '\033[1;35m%s\033[0m\n' "$*"; }
yesil() { printf '\033[1;32m%s\033[0m\n' "$*"; }
sari() { printf '\033[1;33m%s\033[0m\n' "$*"; }
hata() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || hata "Başına sudo ekle:  curl -fsSL …/kur.sh | sudo bash"

WSL="${OK_WSL:-0}"
if grep -qi microsoft /proc/version 2>/dev/null; then WSL=1; fi

# Dosya olarak çalıştırıldıysa (zip'ten kurulum) yanındaki dosyaları kullan
YEREL=0
KAYNAK="${BASH_SOURCE[0]:-}"
if [ -n "$KAYNAK" ] && [ -f "$KAYNAK" ]; then
  KD="$(cd "$(dirname "$KAYNAK")" && pwd)"
  if [ -f "$KD/docker-compose.yml" ] && [ -d "$KD/sunucu" ]; then DIZIN="$KD"; YEREL=1; fi
fi

docker_calistir() {
  docker info >/dev/null 2>&1 && return 0
  systemctl start docker >/dev/null 2>&1 || service docker start >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && return 0; sleep 1; done
  hata "Docker çalışmıyor. Bilgisayarı yeniden başlatıp tekrar dene."
}

tunel_adresi() {
  local id bas
  id="$(docker compose ps -q tunel 2>/dev/null || true)"
  [ -n "$id" ] || return 0
  bas="$(docker inspect -f '{{.State.StartedAt}}' "$id" 2>/dev/null || true)"
  docker compose logs --since "${bas:-10m}" tunel 2>/dev/null | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true
}

bilgi_goster() {
  cd "$DIZIN"
  [ -f .env ] || hata "Osman Karaoke kurulu değil. Önce kurulum komutunu çalıştır."
  set -a; . ./.env; set +a
  docker_calistir
  docker compose up -d >/dev/null 2>&1 || true
  local URL=""
  if [[ "${COMPOSE_PROFILES:-}" == *tunel* ]]; then
    for _ in $(seq 1 45); do
      URL="$(tunel_adresi)"
      [ -n "$URL" ] && break; sleep 2
    done
  else
    URL="https://$ALAN"
  fi
  [ -n "$URL" ] || hata "Adres bulunamadı. Kayıtlara bak: karaoke log"
  echo
  yesil "✅ Osman Karaoke hazır!"
  echo
  echo "  📱 Telefonunda bu linki aç (giriş kodu linkin içinde):"
  echo
  printf '     \033[1;36m%s/#kod=%s\033[0m\n' "$URL" "$KOD"
  echo
  echo "  🔑 Giriş kodu: $KOD"
  if command -v qrencode >/dev/null 2>&1; then qrencode -t ANSIUTF8 "$URL/#kod=$KOD"; fi
  if [[ "${COMPOSE_PROFILES:-}" == *tunel* ]]; then
    echo
    sari "  Not: Bu adres bilgisayar ya da Ubuntu yeniden açılınca değişir."
    sari "  Yeni linki almak için Ubuntu'da sadece şunu yaz:  karaoke"
  fi
  if [ "$WSL" = 1 ]; then
    sari "  Bilgisayar açık ve bu Ubuntu penceresi açık kaldığı sürece çalışır."
  fi
  echo
}

case "$KOMUT" in
  bilgi) bilgi_goster; exit 0 ;;
  log) cd "$DIZIN"; exec docker compose logs -f --tail 100 karaoke ;;
  durdur) cd "$DIZIN"; docker compose down; yesil "Durduruldu. Tekrar açmak için: karaoke"; exit 0 ;;
  kur) ;;
  *) hata "Bilinmeyen komut: $KOMUT (kur | bilgi | log | durdur)" ;;
esac

mor "🎤 Osman Karaoke kuruluyor…"
[ "$WSL" = 1 ] && mor "→ Windows'taki Ubuntu (WSL) algılandı."

# 1) Docker
if ! command -v docker >/dev/null 2>&1; then
  mor "→ Docker kuruluyor (birkaç dakika)…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || hata "docker compose yok. Docker'ı güncelle: curl -fsSL https://get.docker.com | sudo sh"
docker_calistir
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != root ]; then usermod -aG docker "$SUDO_USER" 2>/dev/null || true; fi

# 2) Dosyalar
if [ "$YEREL" = 1 ]; then
  mor "→ Bu klasördeki dosyalar kullanılıyor: $DIZIN"
else
  mor "→ Dosyalar indiriliyor: github.com/$REPO ($DAL)"
  mkdir -p "$DIZIN"
  GECICI="$(mktemp -d)"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$DAL" | tar xz -C "$GECICI" --strip-components=1 \
    || hata "Dosyalar indirilemedi. İnternet bağlantını kontrol et."
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
if [ "$WSL" = 0 ] && [ "$RAM_MB" -lt 3800 ] && [ "$TAKAS_MB" -lt 2000 ]; then
  mor "→ Bellek az (${RAM_MB} MB). 4 GB takas alanı ekleniyor…"
  if [ ! -f /swapfile-karaoke ]; then
    fallocate -l 4G /swapfile-karaoke 2>/dev/null || dd if=/dev/zero of=/swapfile-karaoke bs=1M count=4096 status=none
    chmod 600 /swapfile-karaoke
    mkswap /swapfile-karaoke >/dev/null
  fi
  swapon /swapfile-karaoke 2>/dev/null || true
  grep -q swapfile-karaoke /etc/fstab || echo "/swapfile-karaoke none swap sw 0 0" >> /etc/fstab
fi
if [ "$WSL" = 1 ] && [ "$RAM_MB" -lt 3000 ]; then
  sari "⚠ Ubuntu'ya ${RAM_MB} MB bellek ayrılmış; şarkı hazırlarken yetmeyebilir."
fi

# 4) Ayarlar (.env) — sadece ilk kurulumda
if [ ! -f .env ]; then
  KOD=$(od -An -N5 -tx1 /dev/urandom | tr -d ' \n')
  PROFIL="${PROFIL:-}"
  if [ -z "$PROFIL" ]; then
    if [ "$WSL" = 1 ]; then
      PROFIL="tunel"
      mor "→ Telefondan erişim için güvenli Cloudflare tüneli kullanılacak (HTTPS, port açmaya gerek yok)."
    elif command -v ss >/dev/null 2>&1 && ss -ltnH 2>/dev/null | awk '{print $4}' | grep -E '[:.](80|443)$' >/dev/null; then
      PROFIL="tunel"
      sari "→ 80/443 portları dolu; Cloudflare tüneli kullanılacak."
    else
      PROFIL="https"
    fi
  fi
  ALAN="localhost"
  if [ "$PROFIL" = "https" ]; then
    IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || curl -4 -fsS --max-time 10 https://ifconfig.me 2>/dev/null || true)
    [ -n "$IP" ] || hata "Sunucunun dış IP adresi bulunamadı."
    ALAN="${IP//./-}.sslip.io"
  fi
  printf 'KOD=%s\nALAN=%s\nCOMPOSE_PROFILES=%s,pot\n' "$KOD" "$ALAN" "$PROFIL" > .env
  chmod 600 .env
fi
set -a; . ./.env; set +a

# YouTube yardımcısı (pot) bu işlemcide yoksa onsuz devam et
if [[ "${COMPOSE_PROFILES}" == *pot* ]] && ! docker pull -q brainicism/bgutil-ytdlp-pot-provider:2.0.2 >/dev/null 2>&1; then
  sari "→ YouTube yardımcısı (pot) bu sistemde çalışmıyor, onsuz devam ediliyor."
  sed -i 's/,pot$//' .env; set -a; . ./.env; set +a
fi

# 5) Güvenlik duvarı (yalnızca VPS'te HTTPS için)
if [[ "${COMPOSE_PROFILES}" == *https* ]] && command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi

# 6) Kur ve başlat
mor "→ Uygulama hazırlanıyor. İlk seferde 10-20 dakika sürebilir, pencereyi kapatma…"
GUNCEL="$(date +%Y%m%d)"; export GUNCEL
docker compose up -d --build --remove-orphans

mor "→ Uygulamanın açılması bekleniyor…"
HAZIR=0
for _ in $(seq 1 120); do
  if docker compose exec -T karaoke curl -fs http://localhost:8000/saglik >/dev/null 2>&1; then HAZIR=1; break; fi
  sleep 2
done
[ "$HAZIR" = 1 ] || hata "Uygulama açılmadı. Kayıtlar: karaoke log"

if [[ "${COMPOSE_PROFILES}" == *https* ]]; then
  mor "→ HTTPS sertifikası alınıyor…"
  for _ in $(seq 1 45); do
    curl -fsS --max-time 5 "https://$ALAN/saglik" >/dev/null 2>&1 && break
    sleep 2
  done
fi

# 7) "karaoke" kısayolu
cat > /usr/local/bin/karaoke <<KISAYOL
#!/usr/bin/env bash
# Osman Karaoke:  karaoke | karaoke log | karaoke durdur | karaoke guncelle
case "\${1:-bilgi}" in
  guncelle) cd / && curl -fsSL "https://raw.githubusercontent.com/$REPO/$DAL/kur.sh" | sudo bash ;;
  *) sudo bash "$DIZIN/kur.sh" "\${1:-bilgi}" ;;
esac
KISAYOL
chmod +x /usr/local/bin/karaoke

bilgi_goster
