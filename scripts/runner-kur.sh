#!/usr/bin/env bash
# GitHub repolarını VPS'e tanımlar: her repo için izole bir Actions çalıştırıcısı (Docker).
#   Gerekli: /opt/osmandj/.env içinde GH_RUNNER_PAT=...   (README → "GitHub repolarını VPS'e tanımla")
set -e
cd /opt/osmandj
source <(grep -E '^GH_RUNNER_PAT=' .env | sed 's/^/export /')
[ -n "${GH_RUNNER_PAT:-}" ] || { echo "❌ .env içinde GH_RUNNER_PAT yok. README'deki adımlarla oluştur."; exit 1; }
REPOS=$(python3 -c "import json;print(' '.join(json.load(open('config.json')).get('runners',{}).get('repos',[])))")
CPUS=$(python3 -c "import json;print(json.load(open('config.json')).get('runners',{}).get('cpus',3))")
MEM=$(python3 -c "import json;print(json.load(open('config.json')).get('runners',{}).get('memory','6g'))")
{
  echo "services:"
  for R in $REPOS; do N=$(echo "$R" | cut -d/ -f2 | tr 'A-Z' 'a-z');
  cat <<YML
  runner-$N:
    image: ghcr.io/actions/actions-runner:latest
    container_name: runner-$N
    restart: always
    environment:
      - REPO=$R
      - GH_RUNNER_PAT=\${GH_RUNNER_PAT}
      - TZ=Europe/Istanbul
    volumes:
      - ./scripts/runner/entrypoint.sh:/entrypoint.sh:ro
    entrypoint: ["bash", "/entrypoint.sh"]
    cpus: "$CPUS"
    mem_limit: $MEM
YML
  done
} > runners.compose.yml
GH_RUNNER_PAT="$GH_RUNNER_PAT" docker compose -f runners.compose.yml -p osmandj-runners up -d --remove-orphans
echo "⏳ Kayıt bekleniyor..."; sleep 25
docker compose -f runners.compose.yml -p osmandj-runners logs --tail 3 | grep -E "hazır|⚠" || true
echo "✅ Tanımlanan repolar: $REPOS"
echo "   İş akışlarında  runs-on: [self-hosted, osman-vps]  olanlar artık bu VPS'te çalışır."
