// DJ Beyni hafızası: Ar-Ge ajanının her gün öğrendiği ayarlar → out/arge/beyin.json
// Üretim her sette bu ayarları kullanır; Ar-Ge her gün dinleyici verisine ve trendlere göre günceller.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'out', 'arge');
const FILE = path.join(DIR, 'beyin.json');

// Türlerin güvenli tempo aralıkları (Ar-Ge bu sınırların dışına çıkamaz)
const RANGE = { psy: [138, 148], tech: [125, 140], arock: [96, 120], dh: [118, 126], neset: [88, 104], semah: [100, 120], saman: [100, 128] };
const BASE_BPM = { psy: 145, tech: 135, arock: 108, dh: 122, neset: 96, semah: 112, saman: 118 };
// Türden türe doğal geçiş komşuları (motordaki NEXT ile aynı mantık)
const NEXT = { psy: ['tech', 'saman', 'dh'], tech: ['psy', 'semah'], arock: ['neset', 'semah'], dh: ['psy', 'neset', 'saman'], neset: ['saman', 'arock', 'dh'], semah: ['saman', 'arock', 'tech'], saman: ['semah', 'psy', 'dh'] };

function def() {
  const genre = {};
  for (const g of Object.keys(BASE_BPM)) genre[g] = { bpm: BASE_BPM[g], w: 1 };
  return { v: 1, gen: 0, updated: null, genre, transLen: 64, klasikEvery: 3, segMin: 22, notes: [], experiments: [] };
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function load() {
  const d = def();
  try {
    const b = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...d, ...b, genre: { ...d.genre, ...(b.genre || {}) } };
  } catch { return d; }
}
function save(b) { fs.mkdirSync(DIR, { recursive: true }); b.updated = new Date().toISOString(); fs.writeFileSync(FILE, JSON.stringify(b, null, 2)); }

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Uzun set için tür sırası: programın türleriyle başlar, sonra beynin ağırlıklarına göre komşu türlere akar.
function pickGenres(b, prog, minutes, seed) {
  const R = rng(seed || Date.now());
  const n = clamp(Math.round(minutes / (b.segMin || 22)), 3, 8);
  const seq = prog.genres.filter(g => BASE_BPM[g]).slice(0, n);
  while (seq.length < n) {
    const cur = seq[seq.length - 1], prev = seq[seq.length - 2];
    const cands = (NEXT[cur] || Object.keys(BASE_BPM)).filter(g => g !== cur && g !== prev);
    const ws = cands.map(g => (b.genre[g] ? b.genre[g].w : 1));
    let r = R() * ws.reduce((a, c) => a + c, 0), pick = cands[0];
    for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r <= 0) { pick = cands[i]; break; } }
    seq.push(pick);
  }
  return seq;
}

// Motora gidecek ayarlar
function planOpts(b) {
  const bpm = {};
  for (const [g, v] of Object.entries(b.genre)) if (RANGE[g]) bpm[g] = clamp(Math.round(v.bpm), RANGE[g][0], RANGE[g][1]);
  return { bpm, transLen: clamp(b.transLen || 64, 32, 128), klasikEvery: clamp(b.klasikEvery || 3, 2, 6) };
}

// Programı beynin tür ağırlıklarına göre seç (iyi giden türler daha sık çalınır, ama hepsi döner)
function pickProgram(b, programs) {
  const R = Math.random;
  const ws = programs.map(p => { const g = p.genres.filter(x => b.genre[x]); return g.length ? g.reduce((a, x) => a + b.genre[x].w, 0) / g.length : 1; });
  let r = R() * ws.reduce((a, c) => a + c, 0);
  for (let i = 0; i < programs.length; i++) { r -= ws[i]; if (r <= 0) return programs[i]; }
  return programs[0];
}

module.exports = { load, save, def, pickGenres, planOpts, pickProgram, RANGE, BASE_BPM, NEXT, DIR, FILE, clamp };
