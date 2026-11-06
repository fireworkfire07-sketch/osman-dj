#!/usr/bin/env node
// Otomatik üretim akışı.
//   mod "surekli": gün boyu arka arkaya set üretir (günde setsPerDay kadar), her birini sıradaki yayın saatine planlar.
//   mod "gunluk":  her gün "time" saatinde günün programından 1 set üretir.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { localParts, todaysProgram } = require('./time');
const tg = require('./notify');
const beyin = require('./beyin');
const WDTR = { Mon: 'pzt', Tue: 'sal', Wed: 'car', Thu: 'per', Fri: 'cum', Sat: 'cmt', Sun: 'paz' };
let argeRunning = false;
function runArge() {
  argeRunning = true; console.log('🧠 Ar-Ge başlıyor');
  const p = spawn(process.execPath, [path.join(__dirname, 'arge.js')], { stdio: 'inherit' });
  p.on('close', c => { argeRunning = false; console.log(c === 0 ? '🧠 Ar-Ge bitti' : '⚠ Ar-Ge hata ile bitti'); });
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const STATE = path.join(OUT, 'state.json');
fs.mkdirSync(OUT, { recursive: true });
const readCfg = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const readSt = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeSt = s => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
const freeGB = () => { try { const s = fs.statfsSync(OUT); return s.bavail * s.bsize / 1073741824; } catch (e) { return 999; } };
let running = false, failStreak = 0;

function pcfg(cfg) { return { mode: 'gunluk', time: cfg.productionTime || '02:00', setsPerDay: 1, publishSlots: [], minFreeGB: 15, ...(cfg.production || {}) }; }

function runOne(prog, publish, reason) {
  running = true;
  const cfg = readCfg(), tz = cfg.timezone, L = localParts(new Date(), tz);
  console.log(`\n⏰ ${L.date} ${L.hm} · ${reason} · program: ${prog.name}${publish ? ' · yayın ' + publish : ''} · boş disk ${freeGB().toFixed(0)} GB`);
  const args = [path.join(__dirname, 'produce.js'), '--program', prog.name];
  if (publish) args.push('--publish', publish);
  const p = spawn(process.execPath, args, { stdio: 'inherit' });
  p.on('close', code => {
    running = false;
    const s = readSt(); s.lastResult = code === 0 ? 'ok' : 'hata'; s.lastEnd = new Date().toISOString();
    if (s.date !== L.date) { s.date = L.date; s.count = 0; }
    if (code === 0) { s.count = (s.count || 0) + 1; failStreak = 0; } else failStreak++;
    s.total = (s.total || 0) + (code === 0 ? 1 : 0);
    writeSt(s);
    console.log(code === 0 ? `✅ set bitti · bugün ${s.count} set · toplam ${s.total}` : '❌ üretim hata ile bitti (out/_uretim_*/log.txt)');
  });
}

function tick() {
  if (running) return;
  const cfg = readCfg(), tz = cfg.timezone || 'Europe/Istanbul', L = localParts(new Date(), tz), P = pcfg(cfg);
  const s = readSt();
  if (s.date !== L.date) { s.date = L.date; s.count = 0; writeSt(s); }
  if (failStreak >= 3) { if (failStreak === 3) console.log('⚠ 3 hata üst üste · 30 dk bekleniyor'); failStreak++; setTimeout(() => { failStreak = 0; }, 30 * 60e3); return; }
  if (freeGB() < P.minFreeGB) { console.log(`⚠ disk az (${freeGB().toFixed(1)} GB) · üretim bekliyor`); return; }
  // günlük rapor
  const rt = (cfg.report && cfg.report.time) || '09:00';
  if (L.hm >= rt && s.lastReport !== L.date) { s.lastReport = L.date; writeSt(s); tg.send(tg.statusText()); }
  if (P.maxTotal && (s.total || 0) >= P.maxTotal) { if (!s.capLogged) { console.log(`🏁 ${P.maxTotal} set tamamlandı · üretim durdu (config.json → production.maxTotal'ı artır)`); s.capLogged = true; writeSt(s); tg.send(`🏁 <b>${P.maxTotal} set tamamlandı!</b> Üretim durdu.\nDevam için config.json → production.maxTotal değerini artır.\n\n` + tg.statusText()); } return; }
  // Ar-Ge: her gün bir kez (üretimle paralel çalışabilir, hafif)
  const at = (cfg.arge && cfg.arge.time) || '05:00';
  if ((!cfg.arge || cfg.arge.enabled !== false) && !argeRunning && L.hm >= at && s.lastArge !== L.date) { s.lastArge = L.date; writeSt(s); runArge(); }
  if (P.mode === 'haftalik') {
    // haftada belirli günler, günde 1 uzun set; programı beyin seçer
    const days = P.days || ['pzt', 'car', 'cum', 'paz'];
    if (days.includes(WDTR[L.wd]) && L.hm >= P.time && s.lastDaily !== L.date) {
      s.lastDaily = L.date; writeSt(s);
      const prog = beyin.pickProgram(beyin.load(), cfg.programs, Date.now() % 1e9);
      runOne(prog, P.publish || prog.publish, `haftalık üretim (${days.join(', ')})`);
    }
    return;
  }
  if (P.mode === 'surekli') {
    if ((s.count || 0) >= P.setsPerDay) return;
    // programları sırayla döndür; günün ilk seti haftalık takvimden
    const idx = s.count ? ((s.progIdx || 0) + 1) % cfg.programs.length : cfg.programs.indexOf(todaysProgram(cfg, tz));
    s.progIdx = idx; writeSt(s);
    runOne(cfg.programs[idx], P.publishSlots[s.count || 0], `sürekli üretim (${(s.count || 0) + 1}/${P.setsPerDay})`);
  } else if (L.hm >= P.time && s.lastDaily !== L.date) {
    s.lastDaily = L.date; writeSt(s);
    runOne(todaysProgram(cfg, tz), null, 'günlük üretim saati');
  }
}

// açılışta: yarım kalmış üretimi temizle (konteyner yeniden başladıysa kilit kalmış olabilir)
try { fs.unlinkSync(path.join(OUT, '.lock')); console.log('🧹 eski üretim kilidi kaldırıldı'); } catch (e) {}
for (const d of fs.readdirSync(OUT).filter(x => x.startsWith('_uretim_'))) {
  fs.mkdirSync(path.join(OUT, '_yarim'), { recursive: true });
  for (const f of ['raw.wav', 'master.wav']) { try { fs.unlinkSync(path.join(OUT, d, f)); } catch (e) {} }
  fs.renameSync(path.join(OUT, d), path.join(OUT, '_yarim', d)); console.log('🧹 yarım kalan üretim kenara alındı: ' + d);
}
const c0 = readCfg(), P0 = pcfg(c0);
console.log(`🌟 OSMAN DJ V5.1 zamanlayıcı${P0.maxTotal ? ` · hedef ${P0.maxTotal} set (şu ana kadar ${readSt().total || 0})` : ''} · mod: ${P0.mode === 'haftalik' ? `HAFTALIK (${(P0.days || []).join(', ')} · ${P0.time} · yayın ${P0.publish})` : P0.mode === 'surekli' ? `SÜREKLİ (günde ${P0.setsPerDay} set, yayın saatleri ${P0.publishSlots.join(', ') || '-'})` : `GÜNLÜK (${P0.time})`} · ${c0.timezone}`);
tg.send(`🟢 <b>OSMAN DJ zamanlayıcı başladı</b>\nmod: ${P0.mode === 'haftalik' ? `haftalık · ${(P0.days || []).join(', ')}` : P0.mode === 'surekli' ? `sürekli · günde ${P0.setsPerDay} set` : 'günlük'}${P0.maxTotal ? ` · hedef ${P0.maxTotal} set` : ''}`);
if (process.argv.includes('--now')) runOne(todaysProgram(c0, c0.timezone), null, 'elle başlatıldı (--now)');
setInterval(tick, 30000); setTimeout(tick, 2000);
