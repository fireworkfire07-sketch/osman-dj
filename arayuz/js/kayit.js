// ================= VİDEO KAYDI =================
const KAYIT = { rec: null, parcalar: [], mime: '', t0: 0, url: null, dosya: null, iptal: false };
function mimeSec() {
  if (!window.MediaRecorder) return null;
  const liste = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return liste.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
}
function slugJs(s) { return String(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sarki'; }
function damga() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }

async function kayitDugme() {
  if (SAHNE.kayit) { kayitBitir(); return; }
  if (!SAHNE.hazir) return;
  const mime = mimeSec();
  if (mime === null || !cv.captureStream || !SES.kayitHedef) { toast('Bu tarayıcı video kaydını desteklemiyor. Safari ya da Chrome\'u güncelle.', 5000); return; }
  if (!MIK.akis) {
    const ok = await mikAc(); butonlariGuncelle();
    if (!ok && !confirm('Mikrofon açılamadı. Sadece müzik kaydedilsin mi?')) return;
  }
  SAHNE.kayitDikey = AYAR.ekran === 'dikey' || (AYAR.ekran === 'oto' && innerHeight >= innerWidth);
  SAHNE.kayit = true; boyutla();
  const akis = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...SES.kayitHedef.stream.getAudioTracks()]);
  const opt = { videoBitsPerSecond: 8000000, audioBitsPerSecond: 192000 }; if (mime) opt.mimeType = mime;
  try { KAYIT.rec = new MediaRecorder(akis, opt); }
  catch (e) {
    try { KAYIT.rec = new MediaRecorder(akis); } catch (e2) { SAHNE.kayit = false; boyutla(); toast('Kayıt başlatılamadı: ' + e2.message); return; }
  }
  KAYIT.parcalar = []; KAYIT.iptal = false; KAYIT.mime = KAYIT.rec.mimeType || mime || 'video/webm';
  KAYIT.rec.ondataavailable = e => { if (e.data && e.data.size) KAYIT.parcalar.push(e.data); };
  KAYIT.rec.onstop = () => { if (!KAYIT.iptal) kayitHazir(); };
  $('baslaKatman').hidden = true; $('sonKatman').hidden = true;
  puanSifirla(); sesDurdur();
  KAYIT.rec.start(1000); KAYIT.t0 = performance.now();
  $('kayitBant').hidden = false; butonlariGuncelle(); kontrolleriGizle();
  sesOynat(0); wakeLockAl(); butonlariGuncelle();
}
function kayitBitir(iptal) {
  if (!SAHNE.kayit) return;
  SAHNE.kayit = false; KAYIT.iptal = !!iptal;
  try { KAYIT.rec.stop(); } catch (e) { }
  sesDuraklat(); wakeLockBirak();
  $('kayitBant').hidden = true; boyutla(); butonlariGuncelle(); kontrolleriGoster();
}
function kayitHazir() {
  const tip = (KAYIT.mime || 'video/webm').split(';')[0], blob = new Blob(KAYIT.parcalar, { type: tip });
  if (blob.size < 1000) { toast('Kayıt boş çıktı. Tekrar dene.'); return; }
  const uz = tip.includes('mp4') ? 'mp4' : 'webm';
  const ad = `osman-karaoke-${slugJs(SAHNE.bilgi ? SAHNE.bilgi.baslik : 'sarki')}-${damga()}.${uz}`;
  if (KAYIT.url) URL.revokeObjectURL(KAYIT.url);
  KAYIT.url = URL.createObjectURL(blob);
  try { KAYIT.dosya = new File([blob], ad, { type: tip }); } catch (e) { KAYIT.dosya = null; }
  $('kayitOnizleme').innerHTML = `<video controls playsinline src="${KAYIT.url}"></video>`;
  $('lnkIndir').href = KAYIT.url; $('lnkIndir').download = ad;
  let paylasilir = false;
  try { paylasilir = !!(KAYIT.dosya && navigator.canShare && navigator.canShare({ files: [KAYIT.dosya] })); } catch (e) { }
  $('btnPaylas').hidden = !paylasilir;
  const y = sonYuzde();
  $('kayitBilgi').textContent = `${(blob.size / 1048576).toFixed(1)} MB · ${SAHNE.kayitDikey ? 'Dikey (Shorts)' : 'Yatay'} · ${uz.toUpperCase()}${y != null ? ' · Puan %' + y : ''}. ` +
    'Telifli bir şarkıyı YouTube\'a yüklersen Content ID yakalayabilir; reklam geliri hak sahibine gider.';
  sayfaAc('shKayit');
}
async function paylas() {
  if (!KAYIT.dosya) return;
  try { await navigator.share({ files: [KAYIT.dosya], title: SAHNE.bilgi ? SAHNE.bilgi.baslik : 'Osman Karaoke' }); }
  catch (e) { if (e.name !== 'AbortError') toast('Paylaşılamadı: ' + e.message); }
}
