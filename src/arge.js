#!/usr/bin/env node
// AR-GE AJANI: OSMAN DJ'in beynini her gün geliştirir.
//  1) Dinleyici verisi: YouTube'da yayına girmiş setlerin izlenme/beğeni sayılarını çeker,
//     hangi türlerin daha çok dinlendiğini öğrenir → tür ağırlıklarını günceller.
//  2) Kendi kalitesi: son setlerin kalite puanı ve ses ölçümlerini kontrol eder.
//  3) Piyasa araştırması (ANTHROPIC_API_KEY varsa, ücretli): en çok dinlenen DJ'lerin güncel
//     tempo/yapı/ses trendlerini web'de araştırır, beynin ayarlarını o yöne kaydırır (sınırlar içinde).
//  4) Deney: her gün bir türün temposunu çok az değiştirir; dinleyici verisi hangisinin iyi olduğunu gösterir.
//  Sonuç: out/arge/beyin.json (yeni ayarlar) + out/arge/rapor-TARİH.md + Telegram özeti.
//   node src/arge.js          çalıştır
//   node src/arge.js --dry    sadece raporla, beyni değiştirme
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
for (const l of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const B = require('./beyin');
const { readCatalog, DIR } = require('./archive');
const tg = require('./notify');
const DRY = process.argv.includes('--dry');

const NAME2KEY = { 'Psytrance': 'psy', 'Techno': 'tech', 'Anadolu Rock': 'arock', 'Deep House': 'dh', 'Neşet Ertaş Chill Tekno': 'neset', 'Alevi Semah Tekno': 'semah', 'Şaman Trans': 'saman' };
const GN = { psy: 'Psytrance', tech: 'Techno', arock: 'Anadolu Rock', dh: 'Deep House', neset: 'Neşet Chill', semah: 'Semah Tekno', saman: 'Şaman Trans' };

// 1) YouTube istatistikleri
async function youtubeStats(sets) {
  if (!process.env.YT_REFRESH_TOKEN) return { note: 'YouTube bağlı değil' };
  const { accessToken } = require('./youtube');
  const tok = await accessToken();
  const now = Date.now();
  const live = sets.filter(s => s.youtube && (!s.publishAt || Date.parse(s.publishAt) < now - 24 * 3600e3));
  const out = [];
  for (let i = 0; i < live.length; i += 50) {
    const chunk = live.slice(i, i + 50), ids = chunk.map(s => s.youtube.split('/').pop().split('?')[0]);
    const r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=' + ids.join(','), { headers: { authorization: 'Bearer ' + tok } });
    const j = await r.json();
    for (const it of j.items || []) {
      const s = chunk[ids.indexOf(it.id)], st = it.statistics || {};
      const ageDays = Math.max(1, (now - Date.parse(s.publishAt || s.added)) / 864e5);
      const views = +st.viewCount || 0, likes = +st.likeCount || 0, comments = +st.commentCount || 0;
      out.push({ no: s.no, name: s.name, keys: s.keys || (s.genres || []).map(n => NAME2KEY[n]).filter(Boolean), views, likes, comments, ageDays, privacy: it.status && it.status.privacyStatus,
        score: (views + 15 * likes + 30 * comments) / Math.sqrt(ageDays) });
    }
  }
  return { list: out };
}

// tür ağırlıklarını dinleyiciye göre güncelle (en az 4 yayında set gerekir)
function learnFromListeners(b, stats, log) {
  const L = (stats.list || []).filter(x => x.privacy === 'public');
  if (L.length < 4) { log(`👂 Dinleyici verisi: ${L.length} yayında set var, öğrenmek için en az 4 gerekiyor — ağırlıklar aynı kaldı.`); return; }
  const avg = L.reduce((a, x) => a + x.score, 0) / L.length || 1;
  const per = {};
  for (const x of L) for (const k of new Set(x.keys)) (per[k] = per[k] || []).push(x.score);
  const lines = [];
  for (const [k, arr] of Object.entries(per)) {
    if (!b.genre[k]) continue;
    const rel = arr.reduce((a, c) => a + c, 0) / arr.length / avg; // 1 = ortalama
    const old = b.genre[k].w;
    b.genre[k].w = +B.clamp(old * (1 + 0.25 * (rel - 1)), 0.4, 2.5).toFixed(3);
    lines.push(`${GN[k]} ${rel >= 1 ? '▲' : '▼'} ${old.toFixed(2)}→${b.genre[k].w.toFixed(2)}`);
  }
  // deneylerin sonucu: hangi tempo daha iyi gitti?
  for (const ex of b.experiments.filter(e => !e.done)) {
    const after = L.filter(x => x.no >= ex.fromNo);
    if (after.length < 3) continue;
    const withG = after.filter(x => x.keys.includes(ex.genre));
    if (!withG.length) continue;
    const rel = withG.reduce((a, x) => a + x.score, 0) / withG.length / avg;
    ex.done = true; ex.result = +rel.toFixed(2);
    if (rel < 0.9) { b.genre[ex.genre].bpm = ex.from; lines.push(`🧪 ${GN[ex.genre]} ${ex.to} BPM tutmadı → ${ex.from}'e döndü`); }
    else lines.push(`🧪 ${GN[ex.genre]} ${ex.to} BPM iyi gitti → kalıyor`);
  }
  log('👂 Dinleyici verisi (' + L.length + ' set): ' + (lines.join(' · ') || 'değişiklik yok'));
}

// 2) Kalite özeti
function qualityCheck(sets, log) {
  const last = sets.slice(-4);
  if (!last.length) return;
  const sc = last.map(s => s.score || 0), avg = sc.reduce((a, c) => a + c, 0) / sc.length;
  const lufs = [];
  for (const s of last) { try { const r = JSON.parse(fs.readFileSync(path.join(DIR, s.folder, 'report.json'), 'utf8')); if (r.loudness && r.loudness.after) lufs.push(+r.loudness.after.I); } catch {} }
  log(`🎚 Kalite: son ${last.length} set ortalama ${avg.toFixed(0)}/100${lufs.length ? ` · ses ${(lufs.reduce((a, c) => a + c, 0) / lufs.length).toFixed(1)} LUFS (hedef -14)` : ''}${avg < 85 ? ' · ⚠ düşük, kontrol et' : ''}`);
}

// 3) Piyasa araştırması (Claude API + web araması — ücretli)
async function marketResearch(b, log) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { log('🔎 Piyasa araştırması: ANTHROPIC_API_KEY yok, atlandı (ücretli özellik, isteğe bağlı).'); return null; }
  const cur = Object.fromEntries(Object.entries(B.planOpts(b).bpm));
  const prompt = `Sen bir elektronik müzik A&R araştırmacısısın. Web'de bu haftanın güncel verilerini araştır (Beatport top listeleri, 1001Tracklists, büyük festival setleri; psytrance, melodic/peak-time techno, organic/afro/deep house, etnik-elektronik/Anadolu füzyon).
Bizim DJ'imiz Anadolu enstrümanlarıyla (bağlama, ney, zurna, darbuka, def, didgeridoo) 2-2,5 saatlik setler yapıyor. Tür anahtarları ve şu anki tempolarımız: ${JSON.stringify(cur)}.
Sadece JSON döndür, başka metin yazma:
{"bpm":{"psy":sayı,"tech":sayı,"arock":sayı,"dh":sayı,"neset":sayı,"semah":sayı,"saman":sayı},"transLen":32-128 arası bar*4 adım (şu an ${b.transLen}),"klasikEvery":2-6,"trendler":["kısa madde", "..."],"oneriler":["DJ'in uygulayabileceği somut ses/yapı önerisi","..."]}
Tempo önerileri gerçek güncel piyasa ortalamalarına dayansın; telif'li eser önerme, sadece tarz/tempo/yapı.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ARGE_MODEL || 'claude-sonnet-5-5', max_tokens: 2000, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }], messages: [{ role: 'user', content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) { log('🔎 Piyasa araştırması hata: ' + JSON.stringify(j).slice(0, 200)); return null; }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    const m = text.match(/\{[\s\S]*\}/); if (!m) { log('🔎 Araştırma sonucu okunamadı'); return null; }
    const res = JSON.parse(m[0]);
    // yavaş öğren: önerinin %30'u kadar yaklaş, tür sınırlarının dışına çıkma
    const ch = [];
    for (const [k, v] of Object.entries(res.bpm || {})) {
      if (!b.genre[k] || !B.RANGE[k] || !isFinite(v)) continue;
      const old = b.genre[k].bpm, nw = +B.clamp(old + 0.3 * (v - old), B.RANGE[k][0], B.RANGE[k][1]).toFixed(1);
      if (Math.abs(nw - old) >= 0.3) { b.genre[k].bpm = nw; ch.push(`${GN[k]} ${old}→${nw}`); }
    }
    if (isFinite(res.transLen)) b.transLen = Math.round(B.clamp(b.transLen + 0.3 * (res.transLen - b.transLen), 32, 128));
    if (isFinite(res.klasikEvery)) b.klasikEvery = Math.round(B.clamp(res.klasikEvery, 2, 6));
    log('🔎 Piyasa araştırması: ' + (ch.join(' · ') || 'tempolar zaten güncel'));
    for (const t of (res.trendler || []).slice(0, 5)) log('   • trend: ' + t);
    for (const o of (res.oneriler || []).slice(0, 5)) log('   • öneri: ' + o);
    return res;
  } catch (e) { log('🔎 Piyasa araştırması yapılamadı: ' + e.message); return null; }
}

// 4) Günlük deney: bir türün temposunu ±1-2 BPM oynat (açık deney yoksa)
function experiment(b, sets, log) {
  if (b.experiments.some(e => !e.done)) { const e = b.experiments.find(x => !x.done); log(`🧪 Süren deney: ${GN[e.genre]} ${e.from}→${e.to} BPM (sonuç bekleniyor)`); return; }
  const ks = Object.keys(b.genre).filter(k => B.RANGE[k]);
  const k = ks[Math.floor(Math.random() * ks.length)], old = b.genre[k].bpm;
  const to = +B.clamp(old + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.round(Math.random())), B.RANGE[k][0], B.RANGE[k][1]).toFixed(1);
  if (to === old) return;
  b.genre[k].bpm = to;
  const nextNo = (sets.length ? sets[sets.length - 1].no : 0) + 1;
  b.experiments.push({ genre: k, from: old, to, fromNo: nextNo, at: new Date().toISOString(), done: false });
  b.experiments = b.experiments.slice(-30);
  log(`🧪 Yeni deney: ${GN[k]} ${old}→${to} BPM (#${nextNo}'dan itibaren denenecek)`);
}

(async () => {
  const day = new Date().toISOString().slice(0, 10);
  const lines = [], log = s => { lines.push(s); console.log(s); };
  const b = B.load(), sets = readCatalog().sets || [];
  log(`🧠 AR-GE · ${day} · beyin nesli ${b.gen} → ${b.gen + 1} · arşivde ${sets.length} set`);
  let stats = {};
  try { stats = await youtubeStats(sets); } catch (e) { log('👂 YouTube verisi alınamadı: ' + e.message); }
  if (stats.list) {
    const top = [...stats.list].sort((a, c) => c.score - a.score).slice(0, 3);
    if (top.length) log('🏆 En çok dinlenen: ' + top.map(x => `#${x.no} ${x.name} (${x.views} izlenme, ${x.likes} beğeni)`).join(' · '));
  }
  learnFromListeners(b, stats, log);
  qualityCheck(sets, log);
  await marketResearch(b, log);
  experiment(b, sets, log);
  const bo = B.planOpts(b);
  log('🎛 Yeni ayarlar: ' + Object.entries(bo.bpm).map(([k, v]) => `${GN[k]} ${v}`).join(' · ') + ` · geçiş ${bo.transLen / 16} bar · klasik her ${bo.klasikEvery} döngüde`);
  log('⚖ Tür ağırlıkları: ' + Object.entries(b.genre).map(([k, v]) => `${GN[k]} ${v.w.toFixed(2)}`).join(' · '));
  if (!DRY) {
    b.gen++; b.notes = [...(b.notes || []), { day, summary: lines.slice(1, 6).join(' | ').slice(0, 400) }].slice(-60);
    B.save(b);
    fs.writeFileSync(path.join(B.DIR, `rapor-${day}.md`), '# OSMAN DJ Ar-Ge raporu ' + day + '\n\n' + lines.map(l => '- ' + l).join('\n') + '\n');
    await tg.send('🧠 <b>OSMAN DJ Ar-Ge</b>\n' + lines.map(tg.esc).join('\n').slice(0, 3800));
  } else console.log('(--dry: beyin değiştirilmedi)');
})().catch(e => { console.error('❌ Ar-Ge hata: ' + e.message); process.exit(1); });
