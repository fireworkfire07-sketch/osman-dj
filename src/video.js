// Video üretimi: Görüntü Yönetmeni + Anime: SİSTEM, kare kare (gerçek zamandan hızlı).
// Her kare, mastering sonrası sesin o anki spektrumuna göre çizilir ve doğrudan ffmpeg'e (H.264) akar.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const makeCore = require('../engine/core.js');
const OfflineAudioContext = class {}; // video tarafında ses motoru gerekmez

// Yazı tipleri: tarayıcıdaki adları sunucudaki fontlara bağla
function registerFonts() {
  const F = [
    ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 'Consolas'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 'Consolas'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf', 'Georgia'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf', 'Georgia'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'Segoe UI'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'Arial'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 'serif'],
  ];
  for (const [p, n] of F) if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, n);
  for (const p of ['/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', '/usr/share/fonts/noto/NotoColorEmoji.ttf'])
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, 'Noto Color Emoji');
}

// Tarayıcıdaki AnalyserNode'un birebir benzeri: fftSize 512, Blackman pencere, 0.8 yumuşatma, -100..-30 dB
function makeAnalyser() {
  const N = 512, H = N / 2, win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N), sm = new Float32Array(H);
  for (let i = 0; i < N; i++) win[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N);
  const rev = new Uint16Array(N); for (let i = 0, j = 0; i < N; i++) { rev[i] = j; let b = N >> 1; while (j & b) { j ^= b; b >>= 1; } j |= b; }
  const fd = new Uint8Array(H), wd = new Uint8Array(N);
  return (mono) => {
    for (let i = 0; i < N; i++) { const x = mono[i]; wd[i] = Math.max(0, Math.min(255, Math.round(128 * (1 + x)))); re[rev[i]] = x * win[i]; im[rev[i]] = 0; }
    for (let s = 2; s <= N; s <<= 1) {
      const h = s >> 1, a = -2 * Math.PI / s;
      for (let k = 0; k < N; k += s) for (let j = 0; j < h; j++) {
        const c = Math.cos(a * j), si = Math.sin(a * j), tr = c * re[k + j + h] - si * im[k + j + h], ti = si * re[k + j + h] + c * im[k + j + h];
        re[k + j + h] = re[k + j] - tr; im[k + j + h] = im[k + j] - ti; re[k + j] += tr; im[k + j] += ti;
      }
    }
    for (let i = 0; i < H; i++) {
      const mag = Math.hypot(re[i], im[i]) / N; sm[i] = 0.8 * sm[i] + 0.2 * mag;
      const db = 20 * Math.log10(sm[i] || 1e-12); fd[i] = Math.max(0, Math.min(255, Math.round((db + 100) * 255 / 70)));
    }
    return { fd, wd };
  };
}

async function renderVideo({ masterWav, outMp4, setlog, dur, keys, channel, fps = 30, width = 1280, height = 720, anime = true, crf = 21, theme = 'anime', onProgress }) {
  registerFonts();
  const core = makeCore({ OfflineAudioContext });
  core.setOpts({ channel, animeOn: anime, animeDur: dur, klasikOn: true, visual: theme });
  const take = { setlog, dur, keys, video: null };
  const shots = core.buildEDL(take);

  const canvas = createCanvas(1280, 720), c = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1280x720', '-r', String(fps), '-i', '-',
    '-i', masterWav, '-map', '0:v', '-map', '1:a',
    ...(width !== 1280 ? ['-vf', `scale=${width}:${height}:flags=lanczos`] : []),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', String(fps * 2),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', outMp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg video hata kodu ' + code))));

  // master ses: s16 stereo
  const fdw = fs.openSync(masterWav, 'r');
  const hdr = Buffer.alloc(44); fs.readSync(fdw, hdr, 0, 44, 0);
  const SR = hdr.readUInt32LE(24);
  let dataOff = 12; // 'data' bloğunu bul
  { const b = Buffer.alloc(4096); fs.readSync(fdw, b, 0, 4096, 0); const i = b.indexOf('data'); dataOff = i + 8; }
  const an = makeAnalyser(), mono = new Float32Array(512), raw = Buffer.alloc(512 * 4);

  const nFrames = Math.floor(dur * fps);
  let si = 0;
  for (let f = 0; f < nFrames; f++) {
    const at = f / fps;
    const s0 = Math.max(0, Math.floor(at * SR) - 512);
    const got = fs.readSync(fdw, raw, 0, raw.length, dataOff + s0 * 4);
    for (let i = 0; i < 512; i++) mono[i] = i * 4 + 3 < got ? (raw.readInt16LE(i * 4) + raw.readInt16LE(i * 4 + 2)) / 65536 : 0;
    const { fd, wd } = an(mono);
    while (si < shots.length - 1 && at >= shots[si].t1) si++;
    core.renderShot(c, shots[si], at, fd, wd, null, take, shots[si - 1], dur);
    const px = c.getImageData(0, 0, 1280, 720).data;
    if (!ff.stdin.write(Buffer.from(px.buffer, px.byteOffset, px.byteLength))) await new Promise(r => ff.stdin.once('drain', r));
    if (onProgress && f % 300 === 0) onProgress(f / nFrames);
  }
  ff.stdin.end();
  fs.closeSync(fdw);
  await ffDone;
  if (onProgress) onProgress(1);
  return { shots: shots.length, scenes: new Set(shots.map(s => s.sc)).size };
}

// Kapak görseli: setin en güçlü sahnesinden bir kare + büyük başlık
async function renderThumb({ outJpg, setlog, dur, keys, channel, title, no, anime = true, theme = 'anime' }) {
  registerFonts();
  const core = makeCore({ OfflineAudioContext });
  core.setOpts({ channel, animeOn: anime, animeDur: dur, visual: theme });
  const take = { setlog, dur, keys, video: null };
  const shots = core.buildEDL(take);
  const pick = shots.find(s => s.sc === 's_bless') || shots.find(s => s.sc === 's_ritual') || shots.find(s => s.sc === 'a_free') || shots.find(s => s.sc === 'a_dream') || shots.find(s => /drop|klasik/.test(s.sec.id)) || shots[0];
  const canvas = createCanvas(1280, 720), c = canvas.getContext('2d');
  const fd = new Uint8Array(256).map((_, i) => Math.max(0, 230 - i * 1.6)), wd = new Uint8Array(512).map((_, i) => 128 + Math.round(60 * Math.sin(i / 9)));
  const at = Math.min(dur - 9, Math.max(pick.t0 + 3.6, pick.sec.t + 4.8, 6)); // alt yazı/bölüm etiketi geçtikten sonra
  core.renderShot(c, { ...pick, tr: 'cut' }, at, fd, wd, null, take, null, 1e9);
  const g = core.G[keys[0]];
  c.fillStyle = 'rgba(1,1,7,.55)'; c.fillRect(0, 430, 1280, 290);
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '900 92px Consolas'; c.fillText('OSMAN DJ', 50, 540);
  c.fillStyle = g.c; c.font = '900 44px Consolas'; c.fillText(title.slice(0, 40).toLocaleUpperCase('tr'), 54, 605);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '700 30px Consolas'; c.fillText(`${channel} · ${keys.map(k => core.G[k].n).join(' → ')}`.slice(0, 64), 54, 660);
  if (no) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 24px Consolas'; c.textAlign = 'left'; c.fillText(`ARŞİV #${String(no).padStart(4, '0')}`, 56, 455); }
  c.fillStyle = '#dc2626'; c.fillRect(1060, 470, 180, 64); c.fillStyle = '#fff'; c.font = '900 34px Consolas'; c.textAlign = 'center'; c.fillText(`${Math.round(dur / 60)} DK`, 1150, 514);
  fs.writeFileSync(outJpg, await canvas.encode('jpeg', 90));
  return outJpg;
}

module.exports = { renderVideo, renderThumb };
