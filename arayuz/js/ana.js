// ================= ANA EKRAN =================
const D = { sarkilar: [], isler: [], cerez: false, fark: 0, ilk: true };
let anaZamanlayici = null, yukleme = null, menuSarki = null;
const gorulenBitti = new Set(LS.get('gorulenBitti', []));
const yeniler = new Set(LS.get('yeniler', []));
const ADIMLAR = [['indir', '⬇️', 'İndir'], ['ayir', '🎛️', 'Ses ayır'], ['soz', '📝', 'Sözler'], ['nota', '🎵', 'Notalar']];
const ASAMA_YAZI = { sirada: '⏳ Sırada bekliyor', indir: '⬇️ Şarkı indiriliyor', ayir: '🎛️ Şarkıcının sesi ayrılıyor', soz: '📝 Sözler bulunuyor', nota: '🎵 Notalar çıkarılıyor' };

async function anaYenile() {
  clearTimeout(anaZamanlayici);
  try {
    const d = await api('/api/durum');
    D.sarkilar = d.sarkilar || []; D.isler = d.isler || []; D.cerez = !!d.cerez; D.fark = (d.simdi || Date.now() / 1000) - Date.now() / 1000;
    bittiKontrol(); isleriCiz(); listeCiz(); cerezCiz();
  } catch (e) {
    if (e instanceof GirisGerekli) return;
    if (D.ilk) toast(e.message, 4000);
  }
  D.ilk = false;
  const aktif = yukleme || D.isler.some(j => j.durum === 'sirada' || j.durum === 'calisiyor');
  const gorunur = document.visibilityState === 'visible';
  anaZamanlayici = setTimeout(anaYenile, aktif ? (gorunur ? 1500 : 6000) : 20000);
}

function bittiKontrol() {
  for (const j of D.isler) {
    if (j.durum !== 'bitti' || gorulenBitti.has(j.id)) continue;
    gorulenBitti.add(j.id);
    if (j.paket) yeniler.add(j.paket);
    if (!D.ilk) { toast(`🎉 “${j.baslik}” hazır! Hemen söyleyebilirsin.`, 4500); titret([70, 50, 70]); }
  }
  LS.set('gorulenBitti', [...gorulenBitti].slice(-80));
  LS.set('yeniler', [...yeniler].slice(-80));
}

function kisalt(s) { s = String(s || ''); return s.length > 48 ? s.slice(0, 45) + '…' : s; }
function kalanYazi(j) {
  if (j.durum !== 'calisiyor' || !j.basla || j.yuzde < 14) return 'hesaplanıyor…';
  const gecen = Date.now() / 1000 + D.fark - j.basla;
  const kalan = gecen * (100 - j.yuzde) / j.yuzde;
  if (kalan < 50) return '1 dakikadan az kaldı';
  return `yaklaşık ${Math.round(kalan / 60)} dk kaldı`;
}

function linkAdi(u) { try { return new URL(u).hostname.replace(/^(www|m|music)\./, ''); } catch (e) { return 'link'; } }
function isKarti(j) {
  const linkMi = /^https?:\/\//.test(j.baslik || '');
  const baslik = linkMi ? `🔗 ${linkAdi(j.baslik)} linki` : (j.baslik || 'Şarkı');
  const alt = j.sanatci || (linkMi || j.dosya ? kisalt(j.kaynak) : '');
  const ad = `<div class="isAd"><b>${esc(baslik)}</b><span>${esc(alt || '\u00a0')}</span></div>`;
  if (j.durum === 'hata') {
    return `<div class="is hata" data-id="${j.id}"><div class="isUst"><div class="isIkon">😕</div>${ad}<button class="isX" data-x aria-label="Kapat">✕</button></div>
      <div class="isMesaj">${esc(j.mesaj)}</div>
      <div class="isTuslar"><button class="ikinci" data-tekrar>🔁 Tekrar dene</button><button class="ikinci" data-x>Kapat</button></div></div>`;
  }
  if (j.durum === 'bitti') {
    return `<div class="is bitti" data-id="${j.id}"><div class="isUst"><div class="isIkon">✅</div><div class="isAd"><b>${esc(j.baslik)}</b><span>Hazır! Söylemeye başlayabilirsin.</span></div></div>
      <div class="isTuslar"><button class="dev" data-soyle="${esc(j.paket)}">▶ Hemen söyle</button></div></div>`;
  }
  const idx = j.durum === 'sirada' ? -1 : ADIMLAR.findIndex(a => a[0] === j.asama);
  const adimlar = ADIMLAR.map((a, i) => `<div class="adim ${i < idx ? 'tamam' : i === idx ? 'su' : ''}"><i>${i < idx ? '✓' : a[1]}</i>${a[2]}</div>`).join('');
  const altSatir = j.durum === 'sirada' ? `<span>${j.sira > 1 ? j.sira + '. sırada' : 'Birazdan başlıyor'}</span><span></span>` : `<span>${kalanYazi(j)}</span><span>%${Math.round(j.yuzde)}</span>`;
  return `<div class="is" data-id="${j.id}"><div class="isUst"><div class="isIkon">${j.durum === 'sirada' ? '⏳' : '✨'}</div>${ad}<button class="isX" data-x aria-label="İptal">✕</button></div>
    <div class="adimlar">${adimlar}</div>
    <div class="isMesaj" style="margin:0 0 10px">${ASAMA_YAZI[j.durum === 'sirada' ? 'sirada' : j.asama] || '✨ Hazırlanıyor'}</div>
    <div class="cubuk"><i style="width:${Math.max(3, j.yuzde)}%"></i></div>
    <div class="isAlt">${altSatir}</div></div>`;
}

function isleriCiz() {
  let h = '';
  if (yukleme) {
    h += `<div class="is"><div class="isUst"><div class="isIkon">📤</div><div class="isAd"><b>${esc(yukleme.ad)}</b><span>Dosya sunucuya gönderiliyor</span></div></div>
      <div class="cubuk" style="margin-top:14px"><i style="width:${Math.max(3, yukleme.yuzde)}%"></i></div><div class="isAlt"><span>Ekranı kapatma</span><span>%${yukleme.yuzde}</span></div></div>`;
  }
  h += D.isler.filter(j => j.durum !== 'bitti' || (j.paket && yeniler.has(j.paket) && D.sarkilar.some(s => s.id === j.paket))).reverse().map(isKarti).join('');
  if ($('isler').innerHTML !== h) $('isler').innerHTML = h;
}

function renkGradyan(id) { const h = hash(id) % 360; return `linear-gradient(135deg, hsl(${h} 85% 58%), hsl(${(h + 55) % 360} 80% 42%))`; }
function sarkiKarti(s) {
  const yeni = yeniler.has(s.id);
  const kapak = s.kapak ? `background-image:url('/paket/${s.id}/kapak.jpg')` : `background:${renkGradyan(s.id)}`;
  return `<div class="sarki" data-id="${s.id}" role="button" tabindex="0">
    <div class="kapak" style="${kapak}">${s.kapak ? '' : '🎵'}${yeni ? '<span class="rozet">YENİ</span>' : ''}<span class="sure">${sure(s.sure)}</span><span class="kapakOynat">▶</span></div>
    <div class="sBilgi"><b>${esc(s.baslik)}</b><span>${esc(s.sanatci || ' ')}</span></div>
    <button class="sMenu" data-menu aria-label="Seçenekler">⋯</button></div>`;
}
function listeCiz() {
  const h = D.sarkilar.map(sarkiKarti).join('');
  if ($('liste').innerHTML !== h) $('liste').innerHTML = h;
  $('bos').hidden = D.sarkilar.length > 0;
}
function cerezCiz() {
  $('cerezDurum').textContent = D.cerez ? 'Ekli ✓' : 'Yok';
  $('cerezDurum').classList.toggle('var', D.cerez);
  $('btnCerezSil').hidden = !D.cerez;
}

function sallan(el) { el.classList.remove('sallan'); void el.offsetWidth; el.classList.add('sallan'); }
async function yap() {
  const v = $('inKaynak').value.trim();
  if (!v) { sallan($('inKaynak')); toast('Önce bir link yapıştır ya da şarkı adı yaz 🙂'); $('inKaynak').focus(); return; }
  $('btnYap').disabled = true;
  try {
    const r = await api('/api/yap', { method: 'POST', json: { kaynak: v, kalite: AYAR.kalite } });
    $('inKaynak').value = ''; $('inKaynak').blur(); titret();
    toast('👍 Tamam! Hazırlamaya başladım. Bitince haber veririm.', 3500);
    D.isler.push(r.is); isleriCiz(); anaYenile();
  } catch (e) { if (!(e instanceof GirisGerekli)) toast(e.message, 4500); }
  finally { $('btnYap').disabled = false; }
}
async function yapistir() {
  try {
    const t = await navigator.clipboard.readText();
    if (t && t.trim()) { $('inKaynak').value = t.trim(); titret(); return; }
    toast('Panoda bir şey yok. Önce linki kopyala.');
  } catch (e) { $('inKaynak').focus(); toast('Kutuya uzun bas ve “Yapıştır”ı seç.'); }
}
function dosyaGonder(f) {
  if (!f) return;
  if (f.size > 120 * 1024 * 1024) { toast('Dosya çok büyük (en fazla 120 MB).'); return; }
  yukleme = { ad: f.name.replace(/\.[^.]+$/, ''), yuzde: 0 }; isleriCiz();
  const fd = new FormData(); fd.append('dosya', f); fd.append('kalite', AYAR.kalite);
  const x = new XMLHttpRequest(); x.open('POST', '/api/yukle'); x.withCredentials = true;
  x.upload.onprogress = e => { if (e.lengthComputable && yukleme) { yukleme.yuzde = Math.round(e.loaded / e.total * 100); isleriCiz(); } };
  x.onload = () => {
    yukleme = null;
    if (x.status === 401) { girisGoster(); return; }
    if (x.status >= 400) { let m = 'Dosya gönderilemedi.'; try { m = JSON.parse(x.responseText).detail || m; } catch (e) { } toast(m, 4500); }
    else toast('👍 Dosya geldi, hazırlıyorum!');
    anaYenile();
  };
  x.onerror = () => { yukleme = null; isleriCiz(); toast('Dosya gönderilemedi. İnternetini kontrol et.'); };
  x.send(fd);
}

async function isEylem(e) {
  const kart = e.target.closest('.is'); if (!kart) return;
  const id = kart.dataset.id;
  const soyle = e.target.closest('[data-soyle]');
  if (soyle) { sahneAc(soyle.dataset.soyle); return; }
  try {
    if (e.target.closest('[data-tekrar]')) { await api(`/api/is/${id}/tekrar`, { method: 'POST' }); anaYenile(); }
    else if (e.target.closest('[data-x]')) {
      const j = D.isler.find(x => x.id === id);
      if (j && j.durum === 'calisiyor' && !confirm('Bu şarkının hazırlanması durdurulsun mu?')) return;
      await api(`/api/is/${id}`, { method: 'DELETE' }); D.isler = D.isler.filter(x => x.id !== id); isleriCiz(); anaYenile();
    }
  } catch (err) { if (!(err instanceof GirisGerekli)) toast(err.message); }
}

function listeEylem(e) {
  const kart = e.target.closest('.sarki'); if (!kart) return;
  if (e.target.closest('[data-menu]')) { menuAc(kart.dataset.id); return; }
  sahneAc(kart.dataset.id);
}
function menuAc(id) {
  const s = D.sarkilar.find(x => x.id === id); if (!s) return;
  menuSarki = id; $('menuBaslik').textContent = s.baslik; sayfaAc('shMenu');
}
async function menuEylem(e) {
  const b = e.target.closest('[data-is]'); if (!b || !menuSarki) return;
  const id = menuSarki, s = D.sarkilar.find(x => x.id === id);
  const is = b.dataset.is;
  if (is === 'soyle') { sayfaKapat(); sahneAc(id); }
  else if (is === 'soz') { sozAc(id); }
  else if (is === 'indir') { sayfaKapat(); const a = document.createElement('a'); a.href = `/paket/${id}/enstrumantal.mp3?indir=1`; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
  else if (is === 'sil') {
    if (!confirm(`“${s ? s.baslik : 'Bu şarkı'}” silinsin mi?`)) return;
    sayfaKapat();
    try { await api(`/api/sarki/${id}`, { method: 'DELETE' }); D.sarkilar = D.sarkilar.filter(x => x.id !== id); listeCiz(); toast('🗑️ Silindi'); } catch (err) { toast(err.message); }
  }
}

// ---------- sözleri düzelt ----------
let sozSarki = null;
function sozAc(id) {
  const s = D.sarkilar.find(x => x.id === id) || (SAHNE.bilgi && SAHNE.bilgi.id === id ? SAHNE.bilgi : null); if (!s) return;
  sozSarki = id; $('inSozAd').value = s.baslik || ''; $('inSozSanatci').value = s.sanatci || ''; $('inSozMetin').value = ''; $('sozMesaj').textContent = '';
  sayfaAc('shSoz');
}
async function sozGonder(json, tus) {
  tus.disabled = true; $('sozMesaj').textContent = '⏳ Bekle, şarkıcının sesine göre yerleştiriyorum…';
  try {
    const r = await api(`/api/sarki/${sozSarki}/soz`, { method: 'POST', json });
    const i = D.sarkilar.findIndex(x => x.id === sozSarki); if (i >= 0) D.sarkilar[i] = r.bilgi;
    listeCiz(); sayfaKapat(); toast(`✨ Sözler güncellendi (${r.bilgi.satir} satır)`);
    if (SAHNE.bilgi && SAHNE.bilgi.id === sozSarki) sahneSozYenile(r.bilgi);
  } catch (e) { $('sozMesaj').textContent = '😕 ' + e.message; }
  finally { tus.disabled = false; }
}

// ---------- ayarlar ----------
function ayarAc() {
  document.querySelectorAll('input[name=kalite]').forEach(r => r.checked = r.value === AYAR.kalite);
  document.querySelectorAll('input[name=ekran]').forEach(r => r.checked = r.value === AYAR.ekran);
  $('ayKulaklik').checked = AYAR.kulaklik; $('ayYanki').checked = AYAR.yanki;
  cerezCiz(); sayfaAc('shAyar');
}
function ayarBagla() {
  document.querySelectorAll('input[name=kalite]').forEach(r => r.onchange = () => { AYAR.kalite = r.value; ayarKaydet(); });
  document.querySelectorAll('input[name=ekran]').forEach(r => r.onchange = () => { AYAR.ekran = r.value; ayarKaydet(); });
  $('ayKulaklik').onchange = () => { AYAR.kulaklik = $('ayKulaklik').checked; ayarKaydet(); if (MIK.akis) mikAc(); };
  $('ayYanki').onchange = () => { AYAR.yanki = $('ayYanki').checked; ayarKaydet(); mikSeviye(); };
  $('inCerez').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { await api('/api/cerez', { method: 'POST', json: { metin: await f.text() } }); D.cerez = true; cerezCiz(); toast('🍪 Çerez eklendi. Hata veren şarkıyı tekrar dene.'); }
    catch (err) { toast(err.message, 4500); }
  };
  $('btnCerezSil').onclick = async () => { try { await api('/api/cerez', { method: 'DELETE' }); D.cerez = false; cerezCiz(); toast('Çerez kaldırıldı'); } catch (err) { toast(err.message); } };
}

function ekleIpucu() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ekli = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (ios && !ekli && !LS.get('ekleKapat', false)) $('ekleIpucu').classList.add('on');
}
