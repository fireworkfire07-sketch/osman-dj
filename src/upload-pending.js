#!/usr/bin/env node
// Arşivde olup YouTube'a henüz gitmemiş setleri yükler (YouTube'u sonradan bağladığında).
// Her seti sıradaki boş yayın saatine planlar: günde config.production.publishSlots kadar.
//   node src/upload-pending.js            hepsini yükle
//   node src/upload-pending.js --dry      sadece listele
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const { readCatalog, updateEntry, DIR } = require('./archive');
const { uploadVideo, channelName } = require('./youtube');
const { nextLocalTime } = require('./time');

(async () => {
  const want = (cfg.channel || '').trim(), ch = await channelName();
  console.log(`📺 Bağlı kanal: ${ch}`);
  if (want && ch.toLocaleLowerCase('tr') !== want.toLocaleLowerCase('tr') && !process.argv.includes('--zorla')) {
    console.log(`❌ Yanlış kanal! "${want}" olmalı. Önce:  osmandj bagla  → hesap seçerken ${want}'ı seç.`); return;
  }
  const tz = cfg.timezone || 'Europe/Istanbul';
  const slots = (cfg.production && cfg.production.publishSlots && cfg.production.publishSlots.length) ? cfg.production.publishSlots : ['20:00'];
  // --tekrar 1,2 → bu setleri yanlış kanala gittiyse yeniden yükle
  const ti = process.argv.indexOf('--tekrar');
  if (ti > 0) for (const n of String(process.argv[ti + 1] || '').split(',').map(Number).filter(Boolean)) { updateEntry(n, { youtube: null, publishAt: null }); console.log(`↺ #${String(n).padStart(4, '0')} yeniden yüklenecek`); }
  const pending = readCatalog().sets.filter(s => !s.youtube && s.video && fs.existsSync(path.join(DIR, s.video)));
  if (!pending.length) { console.log('✅ Yüklenecek set yok, hepsi YouTube\'da.'); return; }
  console.log(`📦 ${pending.length} set YouTube'u bekliyor`);
  // yayın saatlerini sırayla dağıt: bugün kalan slotlar, sonra ertesi günler
  let cursor = new Date();
  const nextSlot = () => {
    let best = null;
    for (const sl of slots) { const t = nextLocalTime(sl, tz, cursor); if (!best || t < best) best = t; }
    cursor = new Date(best.getTime() + 60e3); return best;
  };
  for (const s of pending) {
    const rep = JSON.parse(fs.readFileSync(path.join(DIR, s.folder, 'report.json'), 'utf8'));
    const when = (cfg.upload && cfg.upload.approval !== false) || (cfg.upload && cfg.upload.privacy === 'public') || process.argv.includes('--now') ? undefined : nextSlot();
    console.log(`\n#${String(s.no).padStart(4, '0')} "${s.name}" · kalite ${s.score}${when ? ' · yayın ' + when.toLocaleString('tr-TR', { timeZone: tz }) : ''}`);
    if (process.argv.includes('--dry')) continue;
    if (s.score < ((cfg.upload && cfg.upload.minScore) || 80)) { console.log('⏸ kalite düşük, atlandı'); continue; }
    try {
      const r = await uploadVideo({ file: path.join(DIR, s.video), meta: rep.meta, privacy: (cfg.upload && cfg.upload.approval !== false) ? 'private' : ((cfg.upload && cfg.upload.privacy) || 'private'),
        publishAt: when && when.toISOString(), thumb: path.join(DIR, s.folder, 'kapak.jpg'), playlistId: cfg.upload && cfg.upload.playlistId, log: m => process.stdout.write('\r' + m + '   ') });
      updateEntry(s.no, { youtube: r.url, publishAt: when && when.toISOString() });
      console.log(`\n🎉 ${r.url}`);
    } catch (e) { console.log(`\n❌ ${e.message}`); if (/token|eksik|401|403/.test(e.message)) break; }
  }
})();
