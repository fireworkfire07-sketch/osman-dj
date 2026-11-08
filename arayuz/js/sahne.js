// ================= KARAOKE SAHNESİ =================
const cv = $('cv'), G = cv.getContext('2d');
const FONT = "'Fredoka', 'Nunito', system-ui, -apple-system, sans-serif";
const SAHNE = {
  bilgi: null, sozler: [], notalar: [], senkron: 'yok', ayar: 0, hazir: false, yuklemeNo: 0,
  f: 0, kapak: null, kapakKucuk: null, pal: null, iz: [], yazilar: [], kayit: false, kayitDikey: false,
  raf: 0, sonUi: 0, sonPerde: 0, sonPr: null, gizleZ: 0, ayarZ: 0, serit: null,
};
const PUAN = { top: 0, isabet: 0, puan: 0, kombo: 0, ptr: 0 };
const duzenOnbellek = new Map();
const parcaciklar = Array.from({ length: 42 }, (_, i) => { const r = ((i * 9301 + 49297) % 233280) / 233280, q = ((i * 7919 + 104729) % 10007) / 10007; return { x: r, y: q, h: 0.008 + q * 0.03, b: 1.5 + r * 4, a: 0.12 + q * 0.3 }; });

const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
function paletAyarla(h) { if (h == null || isNaN(h)) h = 330; SAHNE.pal = { h }; }
paletAyarla(330);

// ---------- aç / kapat ----------
async function sahneAc(id) {
  const bilgi = D.sarkilar.find(x => x.id === id);
  if (!bilgi) { toast('Şarkı bulunamadı'); return; }
  sayfaKapat();
  acHazir();                                     // dokunuşla ses motorunu uyandır (iPhone şartı)
  yeniler.delete(id); LS.set('yeniler', [...yeniler]); listeCiz(); isleriCiz();
  const no = ++SAHNE.yuklemeNo;
  Object.assign(SAHNE, { bilgi, hazir: false, sozler: [], notalar: [], ayar: bilgi.ayar || 0, f: 0, iz: [], yazilar: [], kapak: null, kapakKucuk: null, serit: null });
  puanSifirla();
  sesDurdur();
  ekran('ekSahne');
  if (!history.state || !history.state.sahne) history.pushState({ sahne: id }, '', '#sahne');
  $('sAd').textContent = bilgi.baslik; $('sSanatci').textContent = bilgi.sanatci || '';
  $('baslaKatman').hidden = false; $('yukleniyor').hidden = false; $('btnBasla').hidden = true; $('baslaYazi').hidden = true;
  $('sonKatman').hidden = true; $('yukYazi').textContent = 'Şarkı yükleniyor…';
  $('tSimdi').textContent = '0:00'; $('tToplam').textContent = sure(bilgi.sure); $('seek').value = 0;
  kontrolleriGoster(); butonlariGuncelle(); boyutla();
  cancelAnimationFrame(SAHNE.raf); SAHNE.raf = requestAnimationFrame(kare);
  kapakYukle(bilgi);
  try {
    const [soz, nota] = await Promise.all([
      api(`/paket/${id}/sozler.json?v=${bilgi.surum || 1}`).catch(e => { if (e instanceof GirisGerekli) throw e; return { satirlar: [] }; }),
      api(`/paket/${id}/notlar.json`).catch(() => []),
    ]);
    if (no !== SAHNE.yuklemeNo) return;
    sozHazirla(soz);
    SAHNE.notalar = (Array.isArray(nota) ? nota : []).map(([t, d, m]) => ({ t, d, m, f: 0, h: 0, bitti: false }));
    await sesYukle(bilgi, p => { if (no === SAHNE.yuklemeNo) $('yukYazi').textContent = `Şarkı yükleniyor… %${Math.round(p * 100)}`; });
    if (no !== SAHNE.yuklemeNo) return;
    SAHNE.hazir = true;
    $('yukleniyor').hidden = true; $('btnBasla').hidden = false; $('baslaYazi').hidden = false;
    $('tToplam').textContent = sure(SES.sure);
  } catch (e) {
    if (no !== SAHNE.yuklemeNo) return;
    if (!(e instanceof GirisGerekli)) toast(e.message || 'Şarkı açılamadı', 4500);
    sahneKapat(true);
  }
}
function sozHazirla(soz) {
  SAHNE.sozler = (soz.satirlar || []).map(s => ({ t: s.t, e: s.e, m: s.m, k: (s.k && s.k.length ? s.k : [[s.m, s.t, s.e]]).map(([w, a, b]) => ({ w, a, b })) }));
  SAHNE.senkron = soz.senkron || (SAHNE.sozler.length ? 'otomatik' : 'yok');
  SAHNE.f = 0; duzenOnbellek.clear();
}
async function sahneSozYenile(bilgi) {
  SAHNE.bilgi = bilgi; SAHNE.ayar = bilgi.ayar || 0; butonlariGuncelle();
  try { sozHazirla(await api(`/paket/${bilgi.id}/sozler.json?v=${bilgi.surum}`)); } catch (e) { toast(e.message); }
}
function sahneKapat(gecmisiAtla) {
  if (SAHNE.kayit) kayitBitir(true);
  SAHNE.yuklemeNo++;
  sesDurdur(); SES.inst = SES.vok = null;
  mikKapat(); wakeLockBirak();
  cancelAnimationFrame(SAHNE.raf);
  SAHNE.bilgi = null; SAHNE.hazir = false;
  ekran('ekAna'); anaYenile();
  if (!gecmisiAtla && history.state && history.state.sahne) history.back();
}

function kapakYukle(b) {
  paletAyarla(hash(b.id) % 360);
  if (!b.kapak) return;
  const img = new Image();
  img.onload = () => {
    if (SAHNE.bilgi !== b) return;
    SAHNE.kapak = img;
    const k = document.createElement('canvas'); k.width = k.height = 40;
    const kg = k.getContext('2d'), s = Math.min(img.width, img.height) * 0.8;
    kg.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 40, 40);
    SAHNE.kapakKucuk = k;
    try { const h = baskinTon(kg.getImageData(0, 0, 40, 40).data); if (h != null) paletAyarla(h); } catch (e) { }
  };
  img.src = `/paket/${b.id}/kapak.jpg`;
}
function baskinTon(d) {
  let sx = 0, sy = 0, w = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, c = mx - mn;
    if (c < 0.12) continue;
    const s = c / (1 - Math.abs(2 * l - 1) + 1e-6);
    let h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4; h *= 60;
    const a = s * (1 - Math.abs(l - 0.5) * 1.6);
    sx += Math.cos(h * Math.PI / 180) * a; sy += Math.sin(h * Math.PI / 180) * a; w += a;
  }
  return w < 4 ? null : Math.atan2(sy, sx) * 180 / Math.PI;
}

// ---------- oynatma ----------
function basla() {
  if (!SAHNE.hazir) return;
  acHazir();
  $('baslaKatman').hidden = true; $('sonKatman').hidden = true;
  puanSifirla(); sesOynat(0); wakeLockAl(); kontrolleriGoster(); butonlariGuncelle();
  if (SAHNE.senkron === 'tahmin') toast('Sözler tahmini yerleştirildi. Kayarsa “Yazı erken / geç” tuşlarını kullan.', 5000);
}
function oynatDurdur() {
  if (!SAHNE.hazir) return;
  acHazir();
  if (SES.caliyor) { sesDuraklat(); wakeLockBirak(); }
  else {
    $('baslaKatman').hidden = true; $('sonKatman').hidden = true;
    if (SES.ofs >= SES.sure - 0.3) { SES.ofs = 0; puanSifirla(); }
    sesOynat(); wakeLockAl();
  }
  kontrolleriGoster(); butonlariGuncelle();
}
SES.bitti = () => sarkiBitti();
function sarkiBitti() {
  if (!SES.caliyor && SES.ofs >= SES.sure) return;
  kaynaklariKapat(); SES.caliyor = false; SES.ofs = SES.sure; wakeLockBirak();
  const kayitVardi = SAHNE.kayit;
  if (kayitVardi) setTimeout(() => kayitBitir(), 250);
  const y = sonYuzde();
  let h;
  if (y == null) h = MIK.akis ? 'Puan için mikrofona biraz daha yakın söyle 🙂' : '🎙️ Mikrofonu açarsan puan da alırsın!';
  else {
    const yildiz = y >= 90 ? 5 : y >= 75 ? 4 : y >= 55 ? 3 : y >= 35 ? 2 : 1;
    h = `<span class="yildiz">${'⭐'.repeat(yildiz)}${'☆'.repeat(5 - yildiz)}</span><big>%${y}</big>${PUAN.puan.toLocaleString('tr-TR')} puan`;
  }
  $('sonPuan').innerHTML = h; $('sonKatman').hidden = false;
  kontrolleriGoster(); butonlariGuncelle();
}

function butonlariGuncelle() {
  $('icoOynat').textContent = SES.caliyor ? '❚❚' : '▶';
  const sb = $('btnSarkici'); sb.querySelector('span').textContent = SARKICI_YAZI[AYAR.sarkici] || SARKICI_YAZI[0]; sb.classList.toggle('acik', AYAR.sarkici > 0);
  const mb = $('btnMik'); mb.querySelector('span').textContent = MIK.akis ? 'Mikrofon açık' : 'Mikrofon'; mb.classList.toggle('acik', !!MIK.akis);
  $('ayarDeger').textContent = (SAHNE.ayar > 0 ? '+' : '') + SAHNE.ayar.toFixed(1) + ' sn';
  $('btnKayit').textContent = SAHNE.kayit ? '⏹ Bitir' : '🔴 Kaydet';
}
function kontrolleriGoster() {
  $('ekSahne').classList.remove('gizli');
  clearTimeout(SAHNE.gizleZ);
  SAHNE.gizleZ = setTimeout(() => { if (SES.caliyor && !acikSayfa) $('ekSahne').classList.add('gizli'); }, 4000);
}
function kontrolleriGizle() { clearTimeout(SAHNE.gizleZ); $('ekSahne').classList.add('gizli'); }
function ayarDegistir(fark) {
  SAHNE.ayar = Math.round(clamp(SAHNE.ayar + fark, -15, 15) * 10) / 10; butonlariGuncelle(); kontrolleriGoster();
  clearTimeout(SAHNE.ayarZ);
  const b = SAHNE.bilgi;
  SAHNE.ayarZ = setTimeout(async () => {
    if (!b) return;
    try { const r = await api(`/api/sarki/${b.id}/ayar`, { method: 'POST', json: { ayar: SAHNE.ayar } }); const i = D.sarkilar.findIndex(x => x.id === b.id); if (i >= 0) D.sarkilar[i] = r.bilgi; } catch (e) { }
  }, 1200);
}
async function mikDugme() {
  if (MIK.akis) { mikKapat(); toast('Mikrofon kapandı'); }
  else if (await mikAc()) { PUAN.ptr = 0; toast(SAHNE.notalar.length ? '🎙️ Mikrofon açık! Üstteki çizgide sesini gör, puan topla.' : '🎙️ Mikrofon açık', 3500); }
  butonlariGuncelle(); kontrolleriGoster();
}

let ekranKilidi = null;
async function wakeLockAl() { try { if ('wakeLock' in navigator && !ekranKilidi) { ekranKilidi = await navigator.wakeLock.request('screen'); ekranKilidi.addEventListener('release', () => { ekranKilidi = null; }); } } catch (e) { } }
function wakeLockBirak() { try { if (ekranKilidi) ekranKilidi.release(); } catch (e) { } ekranKilidi = null; }

// ---------- puan ----------
const katla = x => ((x % 12) + 18) % 12 - 6;
function puanSifirla() {
  Object.assign(PUAN, { top: 0, isabet: 0, puan: 0, kombo: 0, ptr: 0 });
  SAHNE.iz = []; SAHNE.yazilar = [];
  for (const n of SAHNE.notalar) { n.f = 0; n.h = 0; n.bitti = false; }
}
function altSinir(N, t) { let a = 0, b = N.length; while (a < b) { const m = (a + b) >> 1; if (N[m].t + N[m].d < t) a = m + 1; else b = m; } return a; }
function puanAdim(t, pr) {
  const N = SAHNE.notalar; if (!N.length) return;
  if (PUAN.ptr > N.length || (PUAN.ptr > 0 && N[PUAN.ptr - 1].t > t)) PUAN.ptr = altSinir(N, t);
  while (PUAN.ptr < N.length && N[PUAN.ptr].t + N[PUAN.ptr].d < t) { notaBitti(N[PUAN.ptr]); PUAN.ptr++; }
  const n = N[PUAN.ptr], aktif = n && n.t <= t ? n : null;
  if (aktif) {
    aktif.f++; PUAN.top++;
    if (pr.midi != null) {
      const fark = katla(pr.midi - aktif.m);
      if (Math.abs(fark) < 1) { aktif.h++; PUAN.isabet += 1; PUAN.puan += 10; }
      else if (Math.abs(fark) < 2) { PUAN.isabet += 0.4; PUAN.puan += 3; }
      SAHNE.iz.push({ t, m: aktif.m + clamp(fark, -5, 5) });
    }
  } else if (pr.midi != null && n) SAHNE.iz.push({ t, m: n.m + clamp(katla(pr.midi - n.m), -5, 5) });
  if (SAHNE.iz.length > 400) SAHNE.iz.splice(0, SAHNE.iz.length - 400);
}
const OVGU = ['Süper!', 'Harika!', 'Bravo!', 'Mükemmel!', 'Çok iyi!'];
function notaBitti(n) {
  if (n.bitti) return; n.bitti = true;
  if (n.f < 4) return;
  const o = n.h / n.f;
  if (o > 0.6) {
    PUAN.kombo++;
    if (o > 0.8 && n.d > 0.3) SAHNE.yazilar = [{ m: OVGU[(n.m + PUAN.kombo) % OVGU.length] + (PUAN.kombo >= 3 ? ` ×${PUAN.kombo}` : ''), t0: performance.now(), m2: n.m }];
  } else PUAN.kombo = 0;
}
function sonYuzde() { return PUAN.top > 40 ? Math.round(clamp(100 * PUAN.isabet / PUAN.top * 1.25, 0, 100)) : null; }

// ---------- çizim ----------
function boyutla() {
  const iw = innerWidth, ih = innerHeight; let W, H;
  if (SAHNE.kayit) { if (SAHNE.kayitDikey) { W = 1080; H = 1920; } else { W = 1920; H = 1080; } }
  else if (ih >= iw) { W = 1080; H = Math.round(clamp(1080 * ih / iw, 1350, 2400)); }
  else { H = 1080; W = Math.round(clamp(1080 * iw / ih, 1440, 2600)); }
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; duzenOnbellek.clear(); }
}
function yuvarlakDikdortgen(x, y, w, h, r) {
  G.beginPath();
  if (G.roundRect) G.roundRect(x, y, w, h, r);
  else { G.moveTo(x + r, y); G.arcTo(x + w, y, x + w, y + h, r); G.arcTo(x + w, y + h, x, y + h, r); G.arcTo(x, y + h, x, y, r); G.arcTo(x, y, x + w, y, r); G.closePath(); }
}
function sigdir(metin, maxW) { let w = G.measureText(metin).width; if (w > maxW) { const m = /(\d+(?:\.\d+)?)px/.exec(G.font); G.font = G.font.replace(/\d+(?:\.\d+)?px/, (parseFloat(m[1]) * maxW / w) + 'px'); } }

function arkaPlan(W, H, zs, sev) {
  const h = SAHNE.pal.h;
  G.globalCompositeOperation = 'source-over'; G.globalAlpha = 1;
  G.fillStyle = '#07060f'; G.fillRect(0, 0, W, H);
  if (SAHNE.kapakKucuk) {
    const s = Math.max(W, H) * 1.15;
    G.imageSmoothingEnabled = true; G.imageSmoothingQuality = 'high';
    G.globalAlpha = 0.42; G.drawImage(SAHNE.kapakKucuk, (W - s) / 2, (H - s) / 2, s, s); G.globalAlpha = 1;
  }
  G.globalCompositeOperation = 'lighter';
  const R = Math.max(W, H);
  for (let i = 0; i < 3; i++) {
    const x = W * (0.5 + 0.38 * Math.sin(zs * 0.13 + i * 2.1)), y = H * (0.45 + 0.32 * Math.cos(zs * 0.1 + i * 1.7));
    const r = R * (0.34 + 0.1 * sev + 0.04 * Math.sin(zs * 0.6 + i));
    const g = G.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hsl(h + (i - 1) * 55, 90, 55, 0.2 + sev * 0.35)); g.addColorStop(1, hsl(h + (i - 1) * 55, 90, 55, 0));
    G.fillStyle = g; G.fillRect(0, 0, W, H);
  }
  // yükselen ışık parçacıkları
  for (const p of parcaciklar) {
    const y = ((p.y - zs * p.h) % 1 + 1) % 1;
    G.fillStyle = `rgba(255,255,255,${p.a * (0.6 + sev)})`;
    G.beginPath(); G.arc(p.x * W, y * H, p.b * (W / 1080), 0, Math.PI * 2); G.fill();
  }
  G.globalCompositeOperation = 'source-over';
  const v = G.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, R * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0.12)'); v.addColorStop(1, 'rgba(0,0,0,0.72)');
  G.fillStyle = v; G.fillRect(0, 0, W, H);
  // ekolayzır
  if (SES.frekans && SES.caliyor) {
    const n = 48, bw = W / n, maxH = H * 0.07;
    for (let i = 0; i < n; i++) {
      const val = SES.frekans[2 + Math.floor(i * 1.6)] / 255, bh = Math.max(3, val * val * maxH);
      G.fillStyle = hsl(h + i * 2, 90, 62, 0.22);
      yuvarlakDikdortgen(i * bw + bw * 0.18, H - bh, bw * 0.64, bh + 10, bw * 0.3); G.fill();
    }
  }
}

function satirDuzeni(i, boy, maxW) {
  const key = i + '|' + boy + '|' + Math.round(maxW);
  let d = duzenOnbellek.get(key); if (d) return d;
  const sat = SAHNE.sozler[i];
  const dene = b => {
    G.font = `600 ${b}px ${FONT}`;
    const bosluk = G.measureText(' ').width;
    const satirlar = []; let cur = [], x = 0;
    for (const k of sat.k) {
      const gw = G.measureText(k.w).width;
      if (cur.length && x + gw > maxW) { satirlar.push({ items: cur, w: x - bosluk }); cur = []; x = 0; }
      cur.push({ k, x, gw }); x += gw + bosluk;
    }
    if (cur.length) satirlar.push({ items: cur, w: x - bosluk });
    return satirlar;
  };
  let b = boy, rows = dene(b);
  while (rows.length > 2 && b > boy * 0.7) { b = Math.round(b * 0.92); rows = dene(b); }
  if (rows.length === 2 && b === boy) { const b2 = Math.round(boy * 0.86), r2 = dene(b2); if (r2.length === 1) { b = b2; rows = r2; } }
  d = { boy: b, rows, lh: b * 1.2, h: rows.length * b * 1.2 };
  duzenOnbellek.set(key, d);
  return d;
}
function satirCiz(i, cx, cy, s, alfa, L, odak, maxW, taban) {
  const d = satirDuzeni(i, taban, maxW), h = SAHNE.pal.h;
  G.save(); G.translate(cx, cy); G.scale(s, s); G.globalAlpha = alfa;
  G.font = `600 ${d.boy}px ${FONT}`; G.textBaseline = 'middle'; G.textAlign = 'left'; G.lineJoin = 'round';
  d.rows.forEach((row, ri) => {
    const ry = -d.h / 2 + d.lh * (ri + 0.5), x0 = -row.w / 2;
    G.lineWidth = d.boy * 0.15; G.strokeStyle = 'rgba(0,0,0,0.55)';
    for (const it of row.items) G.strokeText(it.k.w, x0 + it.x, ry);
    G.fillStyle = '#fff';
    for (const it of row.items) G.fillText(it.k.w, x0 + it.x, ry);
    let fx = x0;
    for (const it of row.items) {
      const p = clamp((L - it.k.a) / Math.max(0.05, it.k.b - it.k.a), 0, 1);
      if (p >= 1) fx = x0 + it.x + it.gw; else { if (p > 0) fx = x0 + it.x + it.gw * p; break; }
    }
    if (fx > x0) {
      G.save(); G.beginPath(); G.rect(x0 - d.boy, ry - d.lh * 0.62, fx - x0 + d.boy, d.lh * 1.24); G.clip();
      const gr = G.createLinearGradient(0, ry - d.boy * 0.5, 0, ry + d.boy * 0.5);
      gr.addColorStop(0, hsl(h + 15, 100, 70)); gr.addColorStop(1, hsl(h + 45, 100, 57));
      G.fillStyle = gr;
      if (odak) { G.shadowColor = hsl(h + 30, 100, 60, 0.9); G.shadowBlur = d.boy * 0.35; }
      for (const it of row.items) G.fillText(it.k.w, x0 + it.x, ry);
      G.restore();
    }
  });
  G.restore();
}
function sozleriCiz(L, dt, W, H, cy, taban) {
  const S = SAHNE.sozler, maxW = W * 0.86;
  let c = -1;
  { let a = 0, b = S.length; while (a < b) { const m = (a + b) >> 1; if (S[m].t <= L) a = m + 1; else b = m; } c = a - 1; }
  let hedef = 0;
  if (c >= 0) { const s2 = S[c + 1]; hedef = s2 && (L > S[c].e + 0.25 || L > s2.t - 0.45) ? c + 1 : c; }
  hedef = Math.min(hedef, S.length - 1);
  if (Math.abs(hedef - SAHNE.f) > 2.5) SAHNE.f = hedef;
  SAHNE.f += (hedef - SAHNE.f) * (1 - Math.exp(-dt * 7));
  if (Math.abs(hedef - SAHNE.f) < 0.002) SAHNE.f = hedef;
  // geri sayım: uzun aradan sonra gelen satırdan önce 3 nokta
  const n = c + 1 < S.length ? c + 1 : -1;
  let sayim = -1, kalan = 0, onceki = 0, bosluk = 0;
  if (n >= 0) {
    onceki = n > 0 ? S[n - 1].e : 0; bosluk = S[n].t - onceki; kalan = S[n].t - L;
    if (bosluk >= 4 && kalan > 0 && kalan <= 3.4) sayim = n;
  }
  SAHNE.gb = (SAHNE.gb || 0) + ((sayim >= 0 ? 1 : 0) - (SAHNE.gb || 0)) * (1 - Math.exp(-dt * 8));
  const ek = SAHNE.gb * taban * 1.1, ekIcin = sayim >= 0 ? sayim : SAHNE.sonSayim;
  if (sayim >= 0) SAHNE.sonSayim = sayim;
  const f = SAHNE.f, fi = Math.floor(f), fr = f - fi, aralik = taban * 0.45;
  const olcek = i => 0.6 + 0.4 * clamp(1 - Math.abs(i - f), 0, 1);
  const yuk = i => (i < 0 || i >= S.length) ? 0 : satirDuzeni(i, taban, maxW).h * olcek(i) + aralik;
  const ys = {}; ys[fi] = 0;
  for (let i = fi + 1; i <= fi + 4; i++) ys[i] = ys[i - 1] + (yuk(i - 1) + yuk(i)) / 2 + (i === ekIcin ? ek : 0);
  for (let i = fi - 1; i >= fi - 3; i--) ys[i] = ys[i + 1] - (yuk(i + 1) + yuk(i)) / 2 - (i + 1 === ekIcin ? ek : 0);
  const kayma = (ys[fi + 1] - ys[fi]) * fr;
  for (let i = fi - 3; i <= fi + 4; i++) {
    if (i < 0 || i >= S.length) continue;
    const y = cy + ys[i] - kayma, u = Math.abs(i - f);
    if (y < -taban * 2 || y > H + taban * 2) continue;
    const alfa = u < 1 ? 1 - u * 0.42 : u < 2 ? 0.58 - (u - 1) * 0.3 : Math.max(0, 0.28 - (u - 2) * 0.16);
    satirCiz(i, W / 2, y, olcek(i), alfa, L, u < 0.5, maxW, taban);
  }
  const h = SAHNE.pal.h;
  if (sayim >= 0 && ys[sayim] !== undefined) {
    const ust = cy + ys[sayim] - kayma - satirDuzeni(sayim, taban, maxW).h * olcek(sayim) / 2 - ek * 0.55, r = taban * 0.17;
    G.save(); G.globalAlpha = SAHNE.gb;
    for (let k = 0; k < 3; k++) {
      const aktif = kalan > k;
      G.fillStyle = aktif ? hsl(h + 30, 100, 65) : 'rgba(255,255,255,0.15)';
      if (aktif) { G.shadowColor = hsl(h + 30, 100, 60); G.shadowBlur = r * 2; }
      const nab = aktif && kalan - k < 1 ? 1 + 0.25 * Math.sin((kalan % 1) * Math.PI) : 1;
      G.beginPath(); G.arc(W / 2 + (k - 1) * r * 3.4, ust, r * nab, 0, Math.PI * 2); G.fill();
      G.shadowBlur = 0;
    }
    G.restore();
  }
  // uzun müzik arası
  if (n > 0 && bosluk >= 9 && L > onceki + 1.5 && S[n].t - L > 4 && ys[n] !== undefined) {
    const yy = cy + ys[n] - kayma - satirDuzeni(n, taban, maxW).h * olcek(n) / 2 - taban * 0.9;
    G.font = `600 ${taban * 0.5}px ${FONT}`; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillStyle = 'rgba(255,255,255,0.8)';
    G.fillText('🎶  Müzik arası', W / 2, yy - taban * 0.45);
    const bw = W * 0.3, p = clamp((L - onceki) / (S[n].t - 3.4 - onceki), 0, 1);
    G.fillStyle = 'rgba(255,255,255,0.15)'; yuvarlakDikdortgen(W / 2 - bw / 2, yy, bw, 10, 5); G.fill();
    G.fillStyle = hsl(h + 30, 100, 65); yuvarlakDikdortgen(W / 2 - bw / 2, yy, bw * p, 10, 5); G.fill();
  }
}
function girisKarti(W, H, alfa, dikey) {
  if (alfa <= 0) return;
  const b = SAHNE.bilgi; if (!b) return;
  G.save(); G.globalAlpha = alfa; G.textAlign = 'center'; G.textBaseline = 'middle';
  const k = dikey ? Math.min(W * 0.4, H * 0.2) : H * 0.24, ky = dikey ? H * 0.2 : H * 0.07;
  if (SAHNE.kapak) {
    const img = SAHNE.kapak, s = Math.min(img.width, img.height);
    G.save(); G.shadowColor = 'rgba(0,0,0,.6)'; G.shadowBlur = 40; yuvarlakDikdortgen(W / 2 - k / 2, ky, k, k, k * 0.12); G.fillStyle = '#000'; G.fill(); G.restore();
    G.save(); yuvarlakDikdortgen(W / 2 - k / 2, ky, k, k, k * 0.12); G.clip();
    G.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, W / 2 - k / 2, ky, k, k); G.restore();
  } else {
    yuvarlakDikdortgen(W / 2 - k / 2, ky, k, k, k * 0.12);
    const g = G.createLinearGradient(W / 2 - k / 2, ky, W / 2 + k / 2, ky + k); g.addColorStop(0, hsl(SAHNE.pal.h, 85, 58)); g.addColorStop(1, hsl(SAHNE.pal.h + 55, 80, 42));
    G.fillStyle = g; G.fill(); G.font = `${k * 0.45}px ${FONT}`; G.fillStyle = '#fff'; G.fillText('🎵', W / 2, ky + k / 2);
  }
  const ty = ky + k + (dikey ? 90 : 70);
  G.font = `700 ${dikey ? 72 : 64}px ${FONT}`; sigdir(b.baslik, W * 0.88); G.fillStyle = '#fff'; G.fillText(b.baslik, W / 2, ty);
  if (b.sanatci) { G.font = `500 ${dikey ? 46 : 40}px ${FONT}`; sigdir(b.sanatci, W * 0.8); G.fillStyle = 'rgba(255,255,255,0.7)'; G.fillText(b.sanatci, W / 2, ty + (dikey ? 70 : 58)); }
  G.restore();
}
function seritCiz(t, W, H, dikey) {
  const N = SAHNE.notalar;
  if (!MIK.akis || !N.length) return 0;
  const x0 = W * 0.04, x1 = W * 0.96, ust = dikey ? H * 0.075 : H * 0.07, yuk = dikey ? H * 0.12 : H * 0.17;
  const simdiX = x0 + (x1 - x0) * 0.25, pencere = dikey ? 4.5 : 7, pps = (x1 - x0) / pencere;
  const tBas = t - (simdiX - x0) / pps, tSon = tBas + pencere;
  let i0 = altSinir(N, tBas - 0.5), mn = 200, mx = -200;
  for (let i = i0; i < N.length && N[i].t < tSon + 2; i++) { mn = Math.min(mn, N[i].m); mx = Math.max(mx, N[i].m); }
  if (mn > mx) { mn = 55; mx = 67; }
  const hedefMn = Math.min(mn, mx - 9) - 2, hedefMx = Math.max(mx, mn + 9) + 2;
  if (!SAHNE.serit) SAHNE.serit = { mn: hedefMn, mx: hedefMx };
  SAHNE.serit.mn += (hedefMn - SAHNE.serit.mn) * 0.05; SAHNE.serit.mx += (hedefMx - SAHNE.serit.mx) * 0.05;
  const smn = SAHNE.serit.mn, aral = SAHNE.serit.mx - smn;
  const y = m => ust + yuk - (m - smn) / aral * yuk;
  const h = SAHNE.pal.h;
  G.fillStyle = 'rgba(0,0,0,0.32)'; yuvarlakDikdortgen(x0, ust - 22, x1 - x0, yuk + 44, 26); G.fill();
  G.save(); yuvarlakDikdortgen(x0, ust - 22, x1 - x0, yuk + 44, 26); G.clip();
  const nh = Math.max(16, yuk / aral * 0.9);
  for (let i = i0; i < N.length && N[i].t < tSon; i++) {
    const n = N[i], nx = simdiX + (n.t - t) * pps, nw = Math.max(8, n.d * pps - 4);
    if (nx + nw < x0) continue;
    const oran = n.f > 3 ? n.h / n.f : 0, aktif = n.t <= t && t < n.t + n.d;
    if (oran > 0.5) { G.fillStyle = hsl(h + 30, 100, 62); G.shadowColor = hsl(h + 30, 100, 60); G.shadowBlur = 16; }
    else { G.fillStyle = aktif ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)'; G.shadowBlur = 0; }
    yuvarlakDikdortgen(nx, y(n.m) - nh / 2, nw, nh, nh / 2); G.fill();
  }
  G.shadowBlur = 0;
  G.fillStyle = hsl(h - 40, 100, 70);
  for (const p of SAHNE.iz) {
    const px = simdiX + (p.t - t) * pps; if (px < x0 || px > simdiX + 2) continue;
    G.globalAlpha = clamp(1 - (t - p.t) / 2.5, 0, 1); G.beginPath(); G.arc(px, y(p.m), 6, 0, Math.PI * 2); G.fill();
  }
  G.globalAlpha = 1; G.restore();
  G.strokeStyle = 'rgba(255,255,255,0.65)'; G.lineWidth = 3; G.beginPath(); G.moveTo(simdiX, ust - 16); G.lineTo(simdiX, ust + yuk + 16); G.stroke();
  const son = SAHNE.iz[SAHNE.iz.length - 1];
  if (son && t - son.t < 0.15) { G.fillStyle = '#fff'; G.shadowColor = hsl(h - 40, 100, 65); G.shadowBlur = 22; G.beginPath(); G.arc(simdiX, y(son.m), 13, 0, Math.PI * 2); G.fill(); G.shadowBlur = 0; }
  // övgü yazıları
  const simdi = performance.now();
  SAHNE.yazilar = SAHNE.yazilar.filter(o => simdi - o.t0 < 1300);
  for (const o of SAHNE.yazilar) {
    const p = (simdi - o.t0) / 1300;
    G.save(); G.globalAlpha = 1 - p; G.font = `700 ${dikey ? 54 : 50}px ${FONT}`; G.textAlign = 'center'; G.textBaseline = 'middle';
    G.lineWidth = 8; G.strokeStyle = 'rgba(0,0,0,.5)'; G.strokeText(o.m, simdiX + 150, ust + yuk * 0.4 - p * 60);
    G.fillStyle = hsl(h + 50, 100, 68); G.fillText(o.m, simdiX + 150, ust + yuk * 0.4 - p * 60); G.restore();
  }
  // puan
  G.font = `700 ${dikey ? 48 : 44}px ${FONT}`; G.textAlign = 'right'; G.textBaseline = 'middle'; G.fillStyle = '#fff';
  G.fillText('🎯 ' + PUAN.puan.toLocaleString('tr-TR'), x1 - 16, ust + yuk + 60);
  return ust + yuk + 22;
}
function filigran(W, H, dikey) {
  G.save(); G.globalAlpha = 0.45; G.font = `600 ${dikey ? 30 : 26}px ${FONT}`; G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillStyle = '#fff';
  const b = SAHNE.bilgi, yazi = '🎤 Osman Karaoke' + (b ? `  ·  ${b.baslik}${b.sanatci ? ' — ' + b.sanatci : ''}` : '');
  sigdir(yazi, W * 0.9); G.fillText(yazi, W / 2, H - (dikey ? 120 : 52)); G.restore();
}
function ciz(zs, dt, t, L) {
  const W = cv.width, H = cv.height, dikey = H > W;
  arkaPlan(W, H, zs, muzikSeviyesi());
  const taban = dikey ? 80 : 88;
  const seritAlt = seritCiz(t, W, H, dikey);
  let cy = dikey ? H * 0.47 + (seritAlt ? H * 0.06 : 0) : (seritAlt ? H * 0.62 : H * 0.56);
  const S = SAHNE.sozler;
  if (!SAHNE.hazir && !S.length) { filigran(W, H, dikey); return; }
  if (!S.length) {
    girisKarti(W, H, 1, dikey);
    G.textAlign = 'center'; G.textBaseline = 'middle'; G.fillStyle = 'rgba(255,255,255,0.85)';
    G.font = `600 ${taban * 0.62}px ${FONT}`; G.fillText('🎤 Sözleri bulamadım', W / 2, cy + (dikey ? H * 0.12 : H * 0.18));
    G.font = `500 ${taban * 0.42}px ${FONT}`; G.fillStyle = 'rgba(255,255,255,0.6)';
    G.fillText('Sağ üstteki ⋯ → “Sözleri düzelt” ile ekleyebilirsin', W / 2, cy + (dikey ? H * 0.12 : H * 0.18) + taban * 0.8);
  } else {
    const giris = S[0].t - 3.4, ga = seritAlt ? 0 : clamp((giris - L) / 0.6, 0, 1);
    if (ga > 0) { girisKarti(W, H, ga, dikey); cy += ga * H * (dikey ? 0.17 : 0.07); }
    sozleriCiz(L, dt, W, H, cy, taban);
  }
  filigran(W, H, dikey);
}

let sonKare = 0;
function kare(now) {
  SAHNE.raf = requestAnimationFrame(kare);
  const dt = clamp((now - (sonKare || now)) / 1000, 0, 0.1); sonKare = now;
  if (!$('ekSahne').classList.contains('on')) return;
  boyutla();
  if (SES.caliyor && sesZaman() >= SES.sure - 0.03) sarkiBitti();
  const t = duyulan(), L = t - SAHNE.ayar;
  if (MIK.akis && SES.caliyor && now - SAHNE.sonPerde > 28) { SAHNE.sonPerde = now; const pr = perdeOku(); if (pr) puanAdim(t, pr); }
  ciz(now / 1000, dt, t, L);
  if (now - SAHNE.sonUi > 200) {
    SAHNE.sonUi = now;
    const d = SES.sure || (SAHNE.bilgi && SAHNE.bilgi.sure) || 0, z = sesZaman();
    $('tSimdi').textContent = sure(z);
    if (!seekSurukleniyor && d) $('seek').value = Math.round(z / d * 1000);
    if (SAHNE.kayit) $('kayitSure').textContent = 'KAYIT ' + sure((performance.now() - KAYIT.t0) / 1000);
  }
}
let seekSurukleniyor = false;
