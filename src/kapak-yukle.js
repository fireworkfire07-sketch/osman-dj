#!/usr/bin/env node
// YouTube'daki setlerin kapak resimlerini (yeniden) yükler. Kanal telefonla doğrulandıktan sonra kullan.
//   node src/kapak-yukle.js          hepsi
//   node src/kapak-yukle.js 3,4      sadece bu setler
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const { readCatalog, DIR } = require('./archive');
const { accessToken, channelName } = require('./youtube');

(async () => {
  const ch = await channelName();
  console.log(`📺 Bağlı kanal: ${ch}`);
  if (cfg.channel && ch.toLocaleLowerCase('tr') !== cfg.channel.toLocaleLowerCase('tr')) { console.log('❌ Yanlış kanal, durduruldu.'); return; }
  const only = (process.argv[2] || '').split(',').map(Number).filter(Boolean);
  const tok = await accessToken();
  let ok = 0, bad = 0;
  for (const s of readCatalog().sets) {
    if (!s.youtube || (only.length && !only.includes(s.no))) continue;
    const id = s.youtube.split('/').pop().split('?')[0], img = path.join(DIR, s.folder, 'kapak.jpg');
    if (!fs.existsSync(img)) { console.log(`#${s.no} kapak dosyası yok`); continue; }
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}`, { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'image/jpeg' }, body: fs.readFileSync(img) });
    if (r.ok) { ok++; console.log(`🖼 #${String(s.no).padStart(4, '0')} ${s.name} ✓`); }
    else { bad++; console.log(`⚠ #${String(s.no).padStart(4, '0')} ${r.status} ${(await r.text()).slice(0, 120)}`); if (r.status === 403) break; }
  }
  console.log(`\n✅ ${ok} kapak yüklendi${bad ? `, ${bad} hata` : ''}`);
})();
