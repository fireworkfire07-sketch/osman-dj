#!/usr/bin/env node
// 7/24 RADYO: arşivdeki setleri sırayla YouTube canlı yayınına akıtır. Hiç durmaz, yeni setleri kendisi alır.
//   .env → YT_STREAM_KEY=xxxx-xxxx-xxxx-xxxx   (YouTube Studio → Canlı yayına geç → Yayın anahtarı)
//   Deneme (YouTube'suz): node src/live.js --test out/yayin-test.flv 30
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { readCatalog, DIR } = require('./archive');
const tg = require('./notify');
let drops = 0;

const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const live = { enabled: true, rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', newestFirst: 3, hours: 12, ...(cfg.live || {}) };
const ti = process.argv.indexOf('--test');
const TEST = ti > 0 ? { out: process.argv[ti + 1], secs: +(process.argv[ti + 2] || 30) } : null;

function playlist() {
  const sets = readCatalog().sets.filter(s => s.video && fs.existsSync(path.join(DIR, s.video)));
  if (!sets.length) return [];
  const newest = sets.slice(-live.newestFirst).reverse();               // en yeni setler önce
  const rest = sets.slice(0, -live.newestFirst).sort(() => Math.random() - .5);
  const order = [...newest, ...rest];
  const out = []; let mins = 0;
  while (mins < live.hours * 60) for (const s of order) { out.push(s); mins += s.minutes || 60; if (mins >= live.hours * 60) break; }
  return out;
}

let child = null;
async function loop() {
  for (;;) {
    if (!TEST && (!live.enabled || !process.env.YT_STREAM_KEY)) { console.log('⏸ radyo kapalı (config.live.enabled / .env YT_STREAM_KEY) · 5 dk sonra tekrar bakılacak'); await new Promise(r => setTimeout(r, 300e3)); continue; }
    const pl = playlist();
    if (!pl.length) { console.log('⏳ arşivde video yok · ilk set bekleniyor'); await new Promise(r => setTimeout(r, 60e3)); continue; }
    const listFile = path.join(DIR, '.yayin.txt');
    fs.writeFileSync(listFile, 'ffconcat version 1.0\n' + pl.map(s => `file '${path.join(DIR, s.video).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
    console.log(`📻 7/24 yayın · ${pl.length} set · yaklaşık ${Math.round(pl.reduce((a, s) => a + (s.minutes || 60), 0) / 60)} saat:`);
    let t = 0; for (const s of pl.slice(0, 8)) { console.log(`   +${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}  #${String(s.no).padStart(4, '0')} ${s.name}`); t += s.minutes || 60; }
    const dest = TEST ? TEST.out : `${live.rtmpUrl}/${process.env.YT_STREAM_KEY}`;
    const args = ['-hide_banner', '-loglevel', 'warning', '-re', '-f', 'concat', '-safe', '0', '-i', listFile,
      '-c', 'copy', '-flvflags', 'no_duration_filesize', ...(TEST ? ['-t', String(TEST.secs), '-y'] : []), '-f', 'flv', dest];
    const code = await new Promise(res => { child = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] }); child.on('close', res); });
    if (TEST) { console.log(`🧪 test bitti (kod ${code}) → ${TEST.out}`); return; }
    console.log(code === 0 ? '🔁 liste bitti, yenisi hazırlanıyor (yeni setler dahil)' : `⚠ yayın koptu (kod ${code}) · 10 sn sonra yeniden bağlanıyor`);
    if (code !== 0 && ++drops % 5 === 1) tg.send(`⚠ <b>7/24 radyo koptu</b> (kod ${code}) · kendisi yeniden bağlanıyor`);
    await new Promise(r => setTimeout(r, code === 0 ? 1000 : 10000));
  }
}
process.on('SIGTERM', () => { if (child) child.kill('SIGTERM'); process.exit(0); });
loop();
