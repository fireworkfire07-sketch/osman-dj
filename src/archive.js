// Arşiv: out/arsiv/NNNN_isim/  +  katalog.json  +  index.html (tarayıcıda açılan arşiv sayfası)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'out', 'arsiv');
const CAT = path.join(DIR, 'katalog.json');

function readCatalog() { fs.mkdirSync(DIR, { recursive: true }); return fs.existsSync(CAT) ? JSON.parse(fs.readFileSync(CAT, 'utf8')) : { sets: [] }; }
function usedNames() { return new Set(readCatalog().sets.map(s => s.name.toLocaleLowerCase('tr'))); }
function nextNo() { const c = readCatalog(); return c.sets.reduce((m, s) => Math.max(m, s.no), 0) + 1; }
const slug = s => s.toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Üretim klasörünü arşive taşır, kataloğa yazar
function addToArchive(workDir, entry) {
  const c = readCatalog();
  const folder = `${String(entry.no).padStart(4, '0')}_${slug(entry.name)}`;
  const dest = path.join(DIR, folder);
  fs.renameSync(workDir, dest);
  const mp4 = fs.readdirSync(dest).find(f => f.endsWith('.mp4'));
  const e = { ...entry, folder, video: mp4 ? `${folder}/${mp4}` : null, cover: `${folder}/kapak.jpg`, added: new Date().toISOString() };
  c.sets = c.sets.filter(s => s.no !== e.no).concat(e).sort((a, b) => a.no - b.no);
  fs.writeFileSync(CAT, JSON.stringify(c, null, 2));
  writeIndex(c);
  return { dest, entry: e };
}

function updateEntry(no, patch) {
  const c = readCatalog(); const e = c.sets.find(s => s.no === no); if (!e) return;
  Object.assign(e, patch); fs.writeFileSync(CAT, JSON.stringify(c, null, 2)); writeIndex(c);
}

// Diskte en çok `keep` set tutar; YouTube'a gitmiş en eskilerin videosunu siler (katalog ve kapak kalır)
function pruneLocal(keep, log = console.log) {
  const c = readCatalog(); const withVid = c.sets.filter(s => s.video && fs.existsSync(path.join(DIR, s.video)));
  for (const s of withVid.slice(0, Math.max(0, withVid.length - keep))) {
    if (!s.youtube) continue;
    fs.unlinkSync(path.join(DIR, s.video)); s.video = null; s.localDeleted = new Date().toISOString(); log(`🧹 #${s.no} "${s.name}" videosu diskten silindi (YouTube'da duruyor)`);
  }
  fs.writeFileSync(CAT, JSON.stringify(c, null, 2)); writeIndex(c);
}

const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function writeIndex(c) {
  const rows = c.sets.slice().reverse().map(s => `
  <article>
    <img src="${esc(s.cover)}" loading="lazy" alt="">
    <div class="b">
      <div class="no">ARŞİV #${String(s.no).padStart(4, '0')} · ${esc(s.date)} · ${s.minutes} dk</div>
      <h2>${esc(s.name)}</h2>
      <div class="g">${esc(s.program)} · ${esc((s.genres || []).join(' → '))}</div>
      ${s.classics && s.classics.length ? `<div class="k">🎻 ${esc(s.classics.join(' · '))}</div>` : ''}
      <div class="l">${s.video ? `<a href="${esc(s.video)}">▶ Video</a>` : '<span>video sadece YouTube\'da</span>'}
        ${s.youtube ? `<a href="${esc(s.youtube)}">📺 YouTube</a>` : ''} <span class="q">Kalite ${s.score ?? '-'}/100</span></div>
      ${s.chapters && s.chapters.length ? `<details><summary>Bölümler</summary><pre>${esc(s.chapters.join('\n'))}</pre></details>` : ''}
    </div>
  </article>`).join('');
  fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ANATOLIAN SHAMANS — OSMAN DJ Arşivi</title>
<style>body{margin:0;background:#05050c;color:#e2e8f0;font:15px system-ui,sans-serif}header{padding:28px 20px;border-bottom:1px solid #1a1a30}h1{margin:0;letter-spacing:4px;color:#c084fc}
header p{margin:6px 0 0;color:#64748b}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:20px}
article{background:#0d0d1a;border:1px solid #1a1a30;border-radius:10px;overflow:hidden}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.b{padding:12px 14px}
.no{font-size:11px;color:#64748b;letter-spacing:1px}h2{margin:4px 0;font-size:20px}.g{color:#22d3ee;font-size:13px}.k{color:#fbbf24;font-size:12px;margin-top:4px}
.l{margin-top:8px;display:flex;gap:12px;align-items:center;font-size:13px}a{color:#10b981}.q{margin-left:auto;color:#64748b}pre{white-space:pre-wrap;font-size:12px;color:#94a3b8}</style>
<header><h1>ANATOLIAN SHAMANS</h1><p>OSMAN DJ arşivi · ${c.sets.length} set · ${Math.round(c.sets.reduce((a, s) => a + (s.minutes || 0), 0) / 60)} saat müzik</p></header>
<main>${rows}</main></html>`);
}

module.exports = { readCatalog, usedNames, nextNo, addToArchive, updateEntry, pruneLocal, DIR };
