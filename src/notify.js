// Rapor Ajanı: Telegram'a durum bildirir. .env → TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//   node src/notify.js rapor     anlık rapor gönder
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }

const on = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
const api = m => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`;

async function send(text) {
  if (!on()) return false;
  try {
    const r = await fetch(api('sendMessage'), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: text.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: false }) });
    return r.ok;
  } catch (e) { return false; }
}
async function photo(file, caption) {
  if (!on()) return false;
  if (!file || !fs.existsSync(file)) return send(caption);
  try {
    const fd = new FormData();
    fd.append('chat_id', process.env.TELEGRAM_CHAT_ID); fd.append('caption', caption.slice(0, 1000)); fd.append('parse_mode', 'HTML');
    fd.append('photo', new Blob([fs.readFileSync(file)], { type: 'image/jpeg' }), 'kapak.jpg');
    const r = await fetch(api('sendPhoto'), { method: 'POST', body: fd });
    return r.ok || send(caption);
  } catch (e) { return send(caption); }
}
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function statusText() {
  const out = path.join(ROOT, 'out');
  const st = fs.existsSync(path.join(out, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'state.json'), 'utf8')) : {};
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
  const cat = fs.existsSync(path.join(out, 'arsiv', 'katalog.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'arsiv', 'katalog.json'), 'utf8')).sets : [];
  const working = fs.readdirSync(out).filter(d => d.startsWith('_uretim_')).map(d => { try { return fs.readFileSync(path.join(out, d, 'log.txt'), 'utf8').trim().split('\n').pop(); } catch (e) { return ''; } }).filter(Boolean);
  let free = '?'; try { const s = fs.statfsSync(out); free = (s.bavail * s.bsize / 1073741824).toFixed(0) + ' GB'; } catch (e) {}
  const yt = cat.filter(s => s.youtube).length, hrs = (cat.reduce((a, s) => a + (s.minutes || 0), 0) / 60).toFixed(1);
  const max = cfg.production && cfg.production.maxTotal;
  const L = [
    `🌟 <b>OSMAN DJ raporu</b> · ${new Date().toLocaleString('tr-TR', { timeZone: cfg.timezone || 'Europe/Istanbul' })}`,
    `📼 Arşiv: <b>${cat.length}</b> set · ${hrs} saat müzik · YouTube'da ${yt}`,
    `🎛 Üretim: toplam ${st.total || 0}${max ? '/' + max : ''} · bugün ${st.count || 0} · son sonuç: ${st.lastResult || '-'}`,
    working.length ? `⏳ Şu an: ${esc(working[0].replace(/^\[[^\]]+\]\s*/, ''))}` : (max && (st.total || 0) >= max ? `🏁 Hedef ${max} set tamamlandı, üretim duruyor` : '💤 Sıradaki set bekleniyor'),
    `💾 Boş disk: ${free}`,
    `📺 YouTube: ${process.env.YT_REFRESH_TOKEN ? 'bağlı' : 'bağlı değil'} · 📻 Radyo: ${process.env.YT_STREAM_KEY ? 'anahtar var' : 'anahtar yok'}`,
  ];
  if (cat.length) { L.push('', '<b>Son setler:</b>'); for (const s of cat.slice(-5).reverse()) L.push(`#${String(s.no).padStart(4, '0')} <b>${esc(s.name)}</b> · ${esc(s.program)} · kalite ${s.score}${s.youtube ? ` · <a href="${s.youtube}">YouTube</a>` : ''}`); }
  return L.join('\n');
}

module.exports = { send, photo, statusText, on, esc };

if (require.main === module) {
  if (!on()) { console.log('⚠ .env içinde TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID yok'); process.exit(1); }
  send(statusText()).then(ok => { console.log(ok ? '✅ rapor Telegram\'a gönderildi' : '❌ gönderilemedi (token / chat id?)'); process.exit(ok ? 0 : 1); });
}
