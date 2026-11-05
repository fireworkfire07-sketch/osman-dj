#!/usr/bin/env python3
# Çalıştırıcısı çevrimiçi olan repoları VPS'e geçirir (repo değişkeni RUNNER=osman-vps),
# public repolarda yabancı PR'lar için onay zorunluluğunu açar.  "geri" verilirse hepsini GitHub'a döndürür.
import json, os, sys, urllib.request
env = dict(l.strip().split('=', 1) for l in open('/opt/osmandj/.env') if '=' in l and not l.startswith('#'))
PAT = env.get('GH_RUNNER_PAT', '')
repos = json.load(open('/opt/osmandj/config.json'))['runners']['repos']
geri = len(sys.argv) > 1 and sys.argv[1] == 'geri'

def api(method, path, body=None):
    req = urllib.request.Request('https://api.github.com' + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + PAT, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, (json.loads(r.read() or b'{}') if r.status != 204 else {})
    except urllib.error.HTTPError as e: return e.code, {}

for r in repos:
    if geri:
        s, _ = api('DELETE', f'/repos/{r}/actions/variables/RUNNER')
        print(('↩ ' if s in (204, 404) else '⚠ ') + f'{r}: GitHub sunucularına döndü' + ('' if s in (204, 404) else f' (hata {s})')); continue
    s, d = api('GET', f'/repos/{r}/actions/runners')
    online = s == 200 and any(x.get('status') == 'online' and 'osman-vps' in [l['name'] for l in x.get('labels', [])] for x in d.get('runners', []))
    if not online: print(f'⏳ {r}: çalıştırıcı henüz çevrimiçi değil (GitHub\'da çalışmaya devam ediyor)'); continue
    s, _ = api('POST', f'/repos/{r}/actions/variables', {'name': 'RUNNER', 'value': 'osman-vps'})
    if s == 409: s, _ = api('PATCH', f'/repos/{r}/actions/variables/RUNNER', {'name': 'RUNNER', 'value': 'osman-vps'})
    api('PUT', f'/repos/{r}/actions/permissions/fork-pr-contributor-approval', {'approval_policy': 'all_external_contributors'})
    print((f'✅ {r}: artık VPS\'te çalışıyor' if s in (201, 204) else f'⚠ {r}: değişken ayarlanamadı (hata {s}) — PAT\'te "Variables: Read and write" izni var mı?'))
