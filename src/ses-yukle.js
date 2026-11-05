#!/usr/bin/env node
// Eski kayıtları (tarayıcı stüdyosundan indirilen ses/video) YouTube'a "ses + kapak" videosu olarak yükler.
// Dosyaları out/ses/ klasörüne koy →  node src/ses-yukle.js        (hepsini hazırla + planla + yükle)
//                                      node src/ses-yukle.js --dry  (sadece listele)
//                                      node src/ses-yukle.js --now  (planlamadan, hemen özel olarak yükle)
// Her dosya: ses -14 LUFS'a ayarlanır, kanal kapağıyla 720p video yapılır, sıradaki boş yayın saatine planlanır.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const { uploadVideo } = require('./youtube');
const { nextLocalTime } = require('./time');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const IN = path.join(ROOT, 'out', 'ses');
const DONE = path.join(IN, '_yuklendi');
const EXT = /\.(webm|wav|mp3|m4a|ogg|opus|flac|mp4|mkv|mov)$/i;
const CH = cfg.channel || 'ANATOLIAN SHAMANS';
const tz = cfg.timezone || 'Europe/Istanbul';
const arg = k => process.argv.includes(k);

function fontFam() {
  for (const f of ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'])
    if (fs.existsSync(f)) { GlobalFonts.registerFromPath(f, 'OsmanSans'); return 'OsmanSans'; }
  return 'sans-serif';
}

function duration(f) {
  try { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim() || 0; }
  catch { return 0; }
}
const hms = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} sa ${m} dk` : `${m} dk`; };

// dosya adından okunur başlık: OsmanDJ_Psytrance_2026-11-04_ses.webm → Psytrance
function niceName(file) {
  let n = path.basename(file).replace(EXT, '').replace(/^osman_?dj_?/i, '').replace(/_(ses|ham|pro_klip)$/i, '');
  n = n.replace(/\d{4}[-_.]\d{2}[-_.]\d{2}([T_ -]?\d{2}[-_.:]?\d{2}([-_.:]?\d{2})?)?/g, '').replace(/[_-]+/g, ' ').trim();
  return n || 'Canlı Set';
}

function cover(out, title, no, dur, fam) {
  const W = 1280, H = 720, c = createCanvas(W, H), g = c.getContext('2d');
  // gece gökyüzü + bozkır ufku
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0620'); bg.addColorStop(.55, '#2a0f3d'); bg.addColorStop(1, '#5a1a1a');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  let s = no * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${.2 + rnd() * .7})`; g.fillRect(rnd() * W, rnd() * H * .6, rnd() < .1 ? 2 : 1, rnd() < .1 ? 2 : 1); }
  // ay + şaman davulu halkaları
  const cx = W / 2, cy = 300;
  for (let r = 210; r > 60; r -= 30) { g.strokeStyle = `rgba(255,190,90,${.08 + (210 - r) / 900})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  const mg = g.createRadialGradient(cx, cy, 10, cx, cy, 90); mg.addColorStop(0, '#ffe2a8'); mg.addColorStop(1, '#d9772b');
  g.fillStyle = mg; g.beginPath(); g.arc(cx, cy, 80, 0, Math.PI * 2); g.fill();
  // dağ silueti
  g.fillStyle = '#12060f'; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 520 + Math.sin(x / 130 + no) * 40 + Math.sin(x / 47) * 15);
  g.lineTo(W, H); g.closePath(); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#ffd38a';
  g.font = `bold 64px ${fam}`; g.fillText(CH, cx, 600);
  g.fillStyle = '#ffffff'; g.font = `bold 34px ${fam}`; g.fillText(title.toLocaleUpperCase('tr').slice(0, 48), cx, 650);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `24px ${fam}`; g.fillText(`OSMAN DJ · Canlı Kayıt #${no} · ${hms(dur)}`, cx, 690);
  fs.writeFileSync(out, c.toBuffer('image/jpeg', 90));
}

function meta(title, no, dur) {
  const t = `${title} · OSMAN DJ Canlı Kayıt #${no} | Psytrance · Anadolu Rock · Şaman Ritimleri`;
  return {
    title: t.slice(0, 100),
    description: `${CH} — OSMAN DJ'in stüdyo kayıtlarından: ${title} (${hms(dur)}).\n\n` +
      `Bağlama, ney, zurna, darbuka, davul, didgeridoo, şaman defi ve hang drum; psytrance ve techno ritimleriyle buluşuyor. ` +
      `Müzik hep değişir — bu kayıtta o değişimi hisset.\n\n` +
      `🎧 Kulaklıkla dinle · 🔔 Yeni setler için abone ol\n\n#psytrance #anadolurock #shamanic #OsmanDJ #AnatolianShamans`,
    tags: ['psytrance', 'anadolu rock', 'shamanic', 'şaman müziği', 'bağlama', 'ney', 'didgeridoo', 'hang drum', 'techno', 'OSMAN DJ', 'ANATOLIAN SHAMANS', 'dj set'],
  };
}

(async () => {
  fs.mkdirSync(DONE, { recursive: true });
  const files = fs.readdirSync(IN).filter(f => EXT.test(f) && !f.startsWith('_')).sort().map(f => path.join(IN, f));
  if (!files.length) { console.log(`📂 out/ses/ klasöründe kayıt yok. Dosyaları oraya kopyala, sonra tekrar çalıştır.`); return; }
  const fam = fontFam();
  const slots = (cfg.production && cfg.production.publishSlots && cfg.production.publishSlots.length) ? cfg.production.publishSlots : ['20:00'];
  // planlı yayınlar: diğer setlerle çakışmasın diye kayıtlı en son yayın zamanından sonra başla
  let cursor = new Date();
  const catF = path.join(ROOT, 'out', 'arsiv', 'katalog.json');
  try { for (const s of JSON.parse(fs.readFileSync(catF, 'utf8')).sets || []) if (s.publishAt && new Date(s.publishAt) > cursor) cursor = new Date(+new Date(s.publishAt) + 60e3); } catch {}
  for (const f of fs.readdirSync(DONE).filter(f => f.endsWith('.json'))) { try { const j = JSON.parse(fs.readFileSync(path.join(DONE, f), 'utf8')); if (j.publishAt && new Date(j.publishAt) > cursor) cursor = new Date(+new Date(j.publishAt) + 60e3); } catch {} }
  const nextSlot = () => { let best = null; for (const sl of slots) { const t = nextLocalTime(sl, tz, cursor); if (!best || t < best) best = t; } cursor = new Date(best.getTime() + 60e3); return best; };
  const prevNo = fs.readdirSync(DONE).filter(f => f.endsWith('.json')).length;

  console.log(`🎙 ${files.length} kayıt bulundu`);
  let no = prevNo;
  for (const f of files) {
    const dur = duration(f);
    no++;
    const title = niceName(f);
    const when = arg('--now') ? undefined : nextSlot();
    console.log(`\n#${no} ${path.basename(f)} · ${hms(dur)} → "${title}"${when ? ' · yayın ' + when.toLocaleString('tr-TR', { timeZone: tz }) : ' · hemen (özel)'}`);
    if (arg('--dry')) continue;
    if (dur < 60) { console.log('⏸ 1 dakikadan kısa veya okunamadı, atlandı'); no--; continue; }
    const base = path.join(IN, `_kayit_${String(no).padStart(3, '0')}`);
    const jpg = base + '.jpg', mp4 = base + '.mp4';
    try {
      cover(jpg, title, no, dur, fam);
      console.log('🎚 ses ayarlanıyor ve video hazırlanıyor (kayıt uzunluğuna göre birkaç dakika)...');
      execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-framerate', '1', '-i', jpg, '-i', f,
        '-map', '0:v', '-map', '1:a:0', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000',
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage', '-r', '1', '-g', '10', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
      const r = await uploadVideo({ file: mp4, meta: meta(title, no, dur), privacy: 'private', publishAt: when && when.toISOString(), thumb: jpg,
        playlistId: cfg.upload && cfg.upload.playlistId, log: m => process.stdout.write('\r' + m + '   ') });
      fs.writeFileSync(path.join(DONE, path.basename(f) + '.json'), JSON.stringify({ no, file: path.basename(f), title, dur, youtube: r.url, publishAt: when && when.toISOString() }, null, 2));
      fs.renameSync(f, path.join(DONE, path.basename(f)));
      fs.rmSync(mp4, { force: true });
      console.log(`\n🎉 ${r.url}`);
      try { await require('./notify').send(`🎙 Eski kayıt yüklendi: <b>${title}</b> (${hms(dur)})\n${r.url}`); } catch {}
    } catch (e) {
      console.log(`\n❌ ${e.message}`); fs.rmSync(mp4, { force: true }); no--;
      if (/token|eksik|401|403|quota/i.test(e.message)) break;
    }
  }
})();
