// ================= SES MOTORU =================
const SES = { ac: null, inst: null, vok: null, kaynak: [], t0: 0, ofs: 0, caliyor: false, sure: 0, bitti: null, seviye: 0, bas: 0 };
const SARKICI_SEVIYE = [0, 0.3, 1];
const SARKICI_YAZI = ['Şarkıcı: Kapalı', 'Şarkıcı: Kısık', 'Şarkıcı: Açık'];

function sesOturumu(mik) { try { if (navigator.audioSession) navigator.audioSession.type = mik ? 'play-and-record' : 'playback'; } catch (e) { } }
function acHazir() {
  if (SES.ac) { if (SES.ac.state !== 'running') SES.ac.resume().catch(() => { }); return SES.ac; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!MIK.akis) sesOturumu(false);            // iPhone sessiz moddayken de çalsın
  const ac = new AC({ latencyHint: 'interactive' });
  SES.ac = ac;
  SES.master = ac.createGain();
  SES.muzikG = ac.createGain();
  SES.vokalG = ac.createGain(); SES.vokalG.gain.value = SARKICI_SEVIYE[AYAR.sarkici] || 0;
  SES.muzikG.connect(SES.master); SES.vokalG.connect(SES.master);
  SES.an = ac.createAnalyser(); SES.an.fftSize = 512; SES.an.smoothingTimeConstant = 0.78;
  SES.frekans = new Uint8Array(SES.an.frequencyBinCount);
  SES.master.connect(SES.an); SES.master.connect(ac.destination);
  SES.kayitHedef = ac.createMediaStreamDestination ? ac.createMediaStreamDestination() : null;
  if (SES.kayitHedef) SES.master.connect(SES.kayitHedef);
  ac.resume().catch(() => { });
  return ac;
}

async function indirIlerleme(url, onp) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (r.status === 401) { girisGoster(); throw new GirisGerekli('Giriş kodu gerekli'); }
  if (!r.ok) throw new Error('Şarkı dosyası alınamadı (' + r.status + ')');
  const top = +r.headers.get('content-length') || 0;
  if (!r.body || !r.body.getReader || !top) { const b = await r.arrayBuffer(); onp(1); return b; }
  const okuyucu = r.body.getReader(); const parcalar = []; let al = 0;
  for (; ;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value); al += value.length; onp(Math.min(1, al / top));
  }
  const out = new Uint8Array(al); let o = 0;
  for (const p of parcalar) { out.set(p, o); o += p.length; }
  return out.buffer;
}
function coz(ab) {
  return new Promise((res, rej) => { const p = SES.ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
}
async function sesYukle(bilgi, onp) {
  sesDurdur(); SES.inst = SES.vok = null;
  let a = 0, b = 0; const guncelle = () => onp(a * 0.75 + b * 0.25);
  const [ia, va] = await Promise.all([
    indirIlerleme(`/paket/${bilgi.id}/enstrumantal.mp3`, x => { a = x; guncelle(); }),
    indirIlerleme(`/paket/${bilgi.id}/vokal.mp3`, x => { b = x; guncelle(); }).catch(() => null),
  ]);
  SES.inst = await coz(ia);
  SES.vok = va ? await coz(va).catch(() => null) : null;
  SES.sure = SES.inst.duration; SES.ofs = 0;
}

function kaynaklariKapat() {
  for (const s of SES.kaynak) { try { s.onended = null; s.stop(); s.disconnect(); } catch (e) { } }
  SES.kaynak = [];
}
function sesOynat(from = SES.ofs) {
  const ac = acHazir(); kaynaklariKapat();
  if (!SES.inst) return;
  from = clamp(from, 0, Math.max(0, SES.sure - 0.05));
  const t = ac.currentTime + 0.06;
  const ekle = (buf, hedef) => {
    if (!buf) return null;
    const s = ac.createBufferSource(); s.buffer = buf; s.connect(hedef); s.start(t, Math.min(from, buf.duration - 0.01)); SES.kaynak.push(s); return s;
  };
  const ana = ekle(SES.inst, SES.muzikG); ekle(SES.vok, SES.vokalG);
  ana.onended = () => { if (SES.caliyor && sesZaman() >= SES.sure - 0.4 && SES.bitti) SES.bitti(); };
  SES.t0 = t - from; SES.caliyor = true;
}
function sesDuraklat() { if (!SES.caliyor) return; SES.ofs = sesZaman(); kaynaklariKapat(); SES.caliyor = false; }
function sesDurdur() { kaynaklariKapat(); SES.caliyor = false; SES.ofs = 0; }
function sesZaman() { return SES.caliyor && SES.ac ? clamp(SES.ac.currentTime - SES.t0, 0, SES.sure) : SES.ofs; }
function sesGecikme() { const ac = SES.ac; return ac ? clamp((ac.outputLatency || 0) + (ac.baseLatency || 0), 0, 0.5) : 0; }
function duyulan() { return Math.max(0, sesZaman() - (SES.caliyor ? sesGecikme() : 0)); }
function sesGit(t) { t = clamp(t, 0, SES.sure); if (SES.caliyor) sesOynat(t); else SES.ofs = t; }
function sarkiciAyarla(seviye) {
  AYAR.sarkici = seviye; ayarKaydet();
  if (SES.vokalG) SES.vokalG.gain.setTargetAtTime(SARKICI_SEVIYE[seviye], SES.ac.currentTime, 0.05);
}
function muzikSeviyesi() {
  if (!SES.an || !SES.caliyor) { SES.seviye *= 0.95; SES.bas *= 0.95; return SES.seviye; }
  SES.an.getByteFrequencyData(SES.frekans);
  let b = 0, g = 0;
  for (let i = 1; i < 7; i++) b += SES.frekans[i];
  for (let i = 1; i < 60; i++) g += SES.frekans[i];
  SES.bas = SES.bas * 0.7 + (b / 6 / 255) * 0.3;
  SES.seviye = SES.seviye * 0.8 + (g / 59 / 255) * 0.2;
  return SES.seviye;
}

// ================= MİKROFON =================
const MIK = { akis: null };
function yankiTepkisi(ac, sn = 2.1, sonum = 3.2) {
  const n = Math.floor(ac.sampleRate * sn), b = ac.createBuffer(2, n, ac.sampleRate), atak = ac.sampleRate * 0.015;
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, sonum) * Math.min(1, i / atak) * 0.6; }
  return b;
}
async function mikAc() {
  const ac = acHazir();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Bu tarayıcı mikrofonu desteklemiyor.'); return false; }
  mikKapat(true);
  sesOturumu(true);
  const k = AYAR.kulaklik;
  let akis;
  try {
    akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: !k, noiseSuppression: !k, autoGainControl: false, channelCount: 1 } });
  } catch (e) {
    sesOturumu(false);
    toast(e.name === 'NotAllowedError' ? '🎙️ Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.' : 'Mikrofon açılamadı: ' + e.message, 5000);
    return false;
  }
  if (ac.state !== 'running') await ac.resume().catch(() => { });
  const M = MIK; M.akis = akis;
  M.src = ac.createMediaStreamSource(akis);
  M.hp = ac.createBiquadFilter(); M.hp.type = 'highpass'; M.hp.frequency.value = 90;
  M.an = ac.createAnalyser(); M.an.fftSize = 2048; M.buf = new Float32Array(2048);
  M.komp = ac.createDynamicsCompressor(); M.komp.threshold.value = -24; M.komp.ratio.value = 3.5; M.komp.attack.value = 0.004; M.komp.release.value = 0.16;
  M.kuru = ac.createGain(); M.yas = ac.createGain(); M.rev = ac.createConvolver(); M.rev.buffer = yankiTepkisi(ac);
  M.bus = ac.createGain(); M.dinle = ac.createGain(); M.dinle.gain.value = 0;
  M.src.connect(M.hp); M.hp.connect(M.an); M.hp.connect(M.komp);
  M.komp.connect(M.kuru).connect(M.bus); M.komp.connect(M.rev).connect(M.yas).connect(M.bus);
  M.bus.connect(M.dinle).connect(ac.destination);
  if (SES.kayitHedef) M.bus.connect(SES.kayitHedef);
  mikSeviye();
  return true;
}
function mikSeviye() {
  if (!MIK.akis) return;
  const t = SES.ac.currentTime;
  MIK.bus.gain.setTargetAtTime(1.3, t, 0.05);
  MIK.kuru.gain.setTargetAtTime(1, t, 0.05);
  MIK.yas.gain.setTargetAtTime(AYAR.yanki ? 0.35 : 0, t, 0.05);
  MIK.dinle.gain.setTargetAtTime(AYAR.kulaklik ? 0.9 : 0, t, 0.05);
}
function mikKapat(sessiz) {
  if (!MIK.akis) return;
  MIK.akis.getTracks().forEach(t => t.stop());
  try { MIK.src.disconnect(); MIK.bus.disconnect(); } catch (e) { }
  MIK.akis = null;
  if (!sessiz) sesOturumu(false);
}

// perde (YIN)
function perdeBul(buf, sr) {
  const W = 1024;
  let rms = 0; for (let i = 0; i < W; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / W);
  if (rms < 0.008) return { f: -1, rms, guven: 0 };
  const minLag = Math.floor(sr / 1100), maxLag = Math.min(Math.floor(sr / 65), buf.length - W - 1);
  const d = new Float32Array(maxLag + 2);
  for (let tau = 1; tau <= maxLag + 1; tau++) { let s = 0; for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; } d[tau] = s; }
  let run = 0; d[0] = 1;
  for (let tau = 1; tau <= maxLag + 1; tau++) { run += d[tau]; d[tau] = run ? d[tau] * tau / run : 1; }
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) { if (d[t] < 0.15) { while (t + 1 <= maxLag && d[t + 1] < d[t]) t++; tau = t; break; } }
  if (tau < 1) return { f: -1, rms, guven: 0 };
  const x0 = d[tau - 1], x1 = d[tau], x2 = d[tau + 1];
  const den = 2 * (2 * x1 - x2 - x0), iyi = den ? tau + (x2 - x0) / den : tau;
  return { f: sr / iyi, rms, guven: 1 - x1 };
}
let perdeGecmis = [];
function perdeOku() {
  if (!MIK.akis) return null;
  MIK.an.getFloatTimeDomainData(MIK.buf);
  const r = perdeBul(MIK.buf, SES.ac.sampleRate);
  if (r.f > 65 && r.f < 1100 && r.guven > 0.8) {
    perdeGecmis.push(69 + 12 * Math.log2(r.f / 440)); if (perdeGecmis.length > 3) perdeGecmis.shift();
    const s = [...perdeGecmis].sort((a, b) => a - b);
    return { midi: s[s.length >> 1], rms: r.rms };
  }
  perdeGecmis = [];
  return { midi: null, rms: r.rms };
}
