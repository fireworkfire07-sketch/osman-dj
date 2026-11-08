'use strict';
// ================= TEMEL =================
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('osk2_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('osk2_' + k, JSON.stringify(v)); } catch (e) { } },
};
const AYAR = Object.assign({ kalite: 'normal', kulaklik: false, yanki: true, ekran: 'oto', sarkici: 0 }, LS.get('ayar', {}));
function ayarKaydet() { LS.set('ayar', AYAR); }

function sure(t) { t = Math.max(0, t || 0); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function titret(ms = 30) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

function toast(msg, ms = 2800) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}

class GirisGerekli extends Error { }
async function api(yol, { method = 'GET', json, form } = {}) {
  const opt = { method, headers: {}, credentials: 'same-origin' };
  if (json !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(json); }
  if (form) opt.body = form;
  let r;
  try { r = await fetch(yol, opt); } catch (e) { throw new Error('Sunucuya ulaşılamadı. İnternetini kontrol et.'); }
  if (r.status === 401) { girisGoster(); throw new GirisGerekli('Giriş kodu gerekli'); }
  const veri = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((typeof veri.detail === 'string' && veri.detail) || veri.mesaj || ('Sunucu hatası (' + r.status + ')'));
  return veri;
}

// ---------- ekranlar & alt sayfalar ----------
function ekran(id) {
  document.querySelectorAll('.ekran').forEach(e => e.classList.toggle('on', e.id === id));
  window.scrollTo(0, 0);
}
let acikSayfa = null;
function sayfaAc(id) {
  if (acikSayfa) sayfaKapat();
  acikSayfa = id; $(id).classList.add('on'); $('perde').classList.add('on');
}
function sayfaKapat() {
  if (!acikSayfa) return;
  $(acikSayfa).classList.remove('on'); $('perde').classList.remove('on'); acikSayfa = null;
}

// ---------- giriş kodu ----------
function girisGoster() {
  if ($('ekGiris').classList.contains('on')) return;
  ekran('ekGiris'); setTimeout(() => $('inKod').focus(), 200);
}
async function girisYap(kod) {
  $('girisHata').textContent = '';
  try {
    const r = await fetch('/api/giris', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kod }), credentials: 'same-origin' });
    if (!r.ok) { const v = await r.json().catch(() => ({})); girisGoster(); $('girisHata').textContent = r.status === 429 ? v.mesaj : 'Kod yanlış. Tekrar dene.'; $('inKod').classList.add('sallan'); setTimeout(() => $('inKod').classList.remove('sallan'), 450); return false; }
    ekran('ekAna'); anaYenile(); return true;
  } catch (e) { girisGoster(); $('girisHata').textContent = 'Sunucuya ulaşılamadı.'; return false; }
}
