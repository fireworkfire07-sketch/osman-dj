#!/usr/bin/env bash
# İzole, tek kullanımlık GitHub Actions çalıştırıcısı: her işten sonra temizlenip yeniden kaydolur.
set -u
cd /home/runner
NAME="vps-$(echo "$REPO" | cut -d/ -f2 | tr 'A-Z' 'a-z')"
while true; do
  RESP=$(curl -fsS -X POST -H "Authorization: Bearer ${GH_RUNNER_PAT}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/actions/runners/registration-token") || { echo "⚠ $REPO: kayıt anahtarı alınamadı (PAT yetkisi?) · 60 sn"; sleep 60; continue; }
  TOKEN=$(echo "$RESP" | sed -n 's/.*"token": *"\([^"]*\)".*/\1/p')
  ./config.sh --url "https://github.com/${REPO}" --token "$TOKEN" --name "$NAME" --labels "osman-vps" \
    --work _work --ephemeral --unattended --replace >/dev/null && echo "✅ $REPO çalıştırıcısı hazır ($NAME)"
  ./run.sh
  rm -rf _work/* /tmp/* 2>/dev/null || true
  sleep 2
done
