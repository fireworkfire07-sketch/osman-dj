#!/usr/bin/env node
// ONAY: Osman dinleyip onaylamadan hiçbir set yayına girmez.
//   node src/onay.js liste              setler ve YouTube durumları
//   node src/onay.js ozel hepsi         planlanmış/açık bütün setleri ÖZEL yap (yayından çek)
//   node src/onay.js ozel 3,4           sadece bunları özel yap
//   node src/onay.js onayla 5           #5'i hemen herkese aç
//   node src/onay.js onayla 5 20:00     #5'i bugün/yarın 20:00'de yayına planla
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const { readCatalog, updateEntry } = require('./archive');
const { accessToken, channelName } = require('./youtube');
const { nextLocalTime } = require('./time');
const tz = cfg.timezone || 'Europe/Istanbul';
const vid = s => s.youtube.split('/').pop().split('?')[0];
const nos = a => (a === 'hepsi' ? null : String(a || '').split(',').map(Number).filter(Boolean));

async function getStatus(tok, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status&id=' + ids.slice(i, i + 50).join(','), { headers: { authorization: 'Bearer ' + tok } });
    const j = await r.json(); for (const it of j.items || []) out[it.id] = it.status;
  }
  return out;
}
async function setStatus(tok, id, status) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', { method: 'PUT', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ id, status: { selfDeclaredMadeForKids: false, ...status } }) });
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 160));
}

(async () => {
  const [cmd = 'liste', a1, a2] = process.argv.slice(2);
  const ch = await channelName();
  if (cfg.channel && ch.toLocaleLowerCase('tr') !== cfg.channel.toLocaleLowerCase('tr')) { console.log(`❌ Bağlı kanal "${ch}" — işlem yapılmadı.`); return; }
  const tok = await accessToken();
  const sets = readCatalog().sets.filter(s => s.youtube);
  const st = await getStatus(tok, sets.map(vid));
  const fmt = s => { const x = st[vid(s)]; if (!x) return '❓ YouTube\'da bulunamadı (silinmiş olabilir)'; if (x.publishAt) return `⏰ planlı: ${new Date(x.publishAt).toLocaleString('tr-TR', { timeZone: tz })}`; return x.privacyStatus === 'public' ? '🌍 herkese açık' : x.privacyStatus === 'unlisted' ? '🔗 liste dışı' : '🔒 özel (onay bekliyor)'; };

  if (cmd === 'liste') { for (const s of sets) console.log(`#${String(s.no).padStart(4, '0')} ${s.name.padEnd(28)} ${fmt(s)}  ${s.youtube}`); return; }

  if (cmd === 'ozel') {
    const want = nos(a1); let n = 0;
    for (const s of sets) {
      if (want && !want.includes(s.no)) continue;
      const x = st[vid(s)]; if (!x || (x.privacyStatus === 'private' && !x.publishAt)) continue;
      try { await setStatus(tok, vid(s), { privacyStatus: 'private' }); updateEntry(s.no, { publishAt: null, approved: false }); n++; console.log(`🔒 #${s.no} ${s.name} → özel`); }
      catch (e) { console.log(`⚠ #${s.no}: ${e.message}`); }
    }
    console.log(`\n✅ ${n} video özel yapıldı. Hiçbiri sen onaylamadan yayına girmeyecek.`); return;
  }

  if (cmd === 'onayla') {
    const want = nos(a1); if (!want || !want.length) { console.log('Kullanım: osmandj onayla 5   ya da   osmandj onayla 5 20:00'); return; }
    for (const s of sets.filter(x => want.includes(x.no))) {
      try {
        if (a2) { const at = nextLocalTime(a2, tz).toISOString(); await setStatus(tok, vid(s), { privacyStatus: 'private', publishAt: at }); updateEntry(s.no, { publishAt: at, approved: true }); console.log(`✅ #${s.no} ${s.name} onaylandı → ${new Date(at).toLocaleString('tr-TR', { timeZone: tz })}'de yayında`); }
        else { await setStatus(tok, vid(s), { privacyStatus: 'public' }); updateEntry(s.no, { publishAt: new Date().toISOString(), approved: true }); console.log(`✅ #${s.no} ${s.name} onaylandı → şimdi herkese açık ${s.youtube}`); }
      } catch (e) { console.log(`⚠ #${s.no}: ${e.message}`); }
    }
    return;
  }
  console.log('Komutlar: liste · ozel hepsi · ozel 3,4 · onayla 5 · onayla 5 20:00');
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
