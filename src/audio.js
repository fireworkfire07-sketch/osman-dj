// Ses üretimi: başsız Chromium içinde (tarayıcı stüdyosuyla birebir aynı ses motoru),
// offline ve paralel. 60 sn'lik parçalar + 22 sn kuyruk üst üste bindirilir: kesinti olmaz.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const SR = 48000, CHUNK = 60, TAIL = 22;

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const bases = ['/opt/pw-browsers', '/ms-playwright', path.join(os.homedir(), '.cache/ms-playwright')];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base).filter(x => /^chromium-\d+$/.test(x)).sort().reverse())
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) { const p = path.join(base, d, sub); if (fs.existsSync(p)) return p; }
  }
  return undefined;
}

const PAGE_JS = `
window.OSMAN = {
  async init(opts){
    const core = window.__makeCore({OfflineAudioContext});
    const dc = new OfflineAudioContext(1,1,44100);
    let n=0;
    for (const f of opts.samples){ const m=f.match(/^(bag_sha|bag_sit|ney|zurna|davul|darb)_(.+)\\.mp3$/); if(!m) continue;
      try{ const ab=await (await fetch('http://osman.local/samples/'+f)).arrayBuffer(); core.SMP[m[1]][m[2]]=core.normBuf(await dc.decodeAudioData(ab)); n++; }catch(e){} }
    for (const g of Object.keys(core.SMP)) core.SMPK[g]=Object.keys(core.SMP[g]).filter(k=>!isNaN(k)).map(Number).sort((a,b)=>a-b);
    for (const c of opts.custom){ try{ const ab=await (await fetch('http://osman.local/custom/'+c.file)).arrayBuffer(); core.setCustom(c.name, core.normBuf(await dc.decodeAudioData(ab)), c.root);}catch(e){} }
    core.setOpts({smpReady:n>0,useSmp:true,channel:opts.channel});
    window.core=core; return n;
  },
  plan(o){ const p=window.__planSet(window.core,o); window.plan=p; return {dur:p.dur, steps:p.steps.length, setlog:p.setlog}; },
  async chunk(k, CHUNK, TAIL, SR){
    const core=window.core, plan=window.plan;
    const T0=k*CHUNK, T1=Math.min(plan.dur,T0+CHUNK), len=Math.ceil((T1-T0+TAIL)*SR);
    const oc=new OfflineAudioContext(2,len,SR);
    const mg=oc.createGain();mg.gain.value=.85;const f=oc.createBiquadFilter();f.type='lowpass';f.frequency.value=16000;f.Q.value=1.2;
    const ms=oc.createGain();ms.gain.value=.72;const cp=oc.createDynamicsCompressor();cp.threshold.value=-14;cp.ratio.value=10;cp.attack.value=.003;cp.release.value=.2;cp.knee.value=6;
    const lim=oc.createWaveShaper();{const n=2048,cu=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cu[i]=Math.tanh(x*1.15)/Math.tanh(1.15)*.93;}lim.curve=cu;}
    mg.connect(f);f.connect(ms);ms.connect(cp);cp.connect(lim);lim.connect(oc.destination);
    const cutFor=x=>{const S=x.id;return S==='intro'?700+x.bar*350:S==='break'?2600:(S==='build'||S==='build2'||S==='trans')?600*Math.pow(16000/600,(x.bar+1)/x.len):16000;};
    let lo=0,hi=plan.steps.length;while(lo<hi){const m=(lo+hi)>>1;if(plan.steps[m].t<T0)lo=m+1;else hi=m;}
    let lastCut=16000;for(let j=lo-1;j>=0;j--)if(plan.steps[j].as%16===0){lastCut=cutFor(plan.steps[j].info);break;}
    f.frequency.setValueAtTime(lastCut,0);
    for(let si=lo; si<plan.steps.length && plan.steps[si].t<T1; si++){
      const s=plan.steps[si], lt=s.t-T0;
      if(s.as%16===0) core.autoBar(oc,ms,f,s.info,lt,s.sd*16,16000);
      core.playStep(oc,mg,s.key,s.i,s.as,s.info,lt,s.sd);
    }
    const buf=await oc.startRendering();
    const L=buf.getChannelData(0),R=buf.getChannelData(1),n=L.length,out=new Int16Array(n*2);
    for(let i=0;i<n;i++){out[i*2]=Math.max(-32768,Math.min(32767,Math.round(L[i]*32767)));out[i*2+1]=Math.max(-32768,Math.min(32767,Math.round(R[i]*32767)));}
    const u8=new Uint8Array(out.buffer);let s='';const B=0x8000;for(let i=0;i<u8.length;i+=B)s+=String.fromCharCode.apply(null,u8.subarray(i,i+B));
    return {b64:btoa(s), body:Math.round((T1-T0)*SR)};
  }
};`;

function wavHeader(dataBytes, ch = 2, sr = SR) {
  const b = Buffer.alloc(44);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataBytes, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * ch * 2, 28); b.writeUInt16LE(ch * 2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(dataBytes, 40);
  return b;
}

const shim = src => '(function(){var module={exports:{}};' + src + '\n;return module.exports;})()';

async function openStudio(cfg) {
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const samples = fs.readdirSync(path.join(ROOT, 'samples'));
  const cdir = path.join(ROOT, 'custom');
  const custom = fs.existsSync(cdir) ? fs.readdirSync(cdir).map(f => {
    const m = f.match(/^(baglama|ney|zurna|didj|kopuz|def|hang)_(\d+)\.(wav|mp3|ogg|flac)$/i);
    return m && { file: f, name: m[1].toLowerCase(), root: +m[2] };
  }).filter(Boolean) : [];
  const coreSrc = fs.readFileSync(path.join(ROOT, 'engine/core.js'), 'utf8');
  const planSrc = fs.readFileSync(path.join(ROOT, 'src/plan.js'), 'utf8');

  async function newPage() {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('[motor]', e.message));
    await page.route('http://osman.local/**', async route => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: rel.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    });
    await page.goto('http://osman.local/engine/blank.html');
    await page.addScriptTag({ content: 'window.__makeCore=' + shim(coreSrc) + ';' });
    await page.addScriptTag({ content: 'window.__planSet=' + shim(planSrc) + '.planSet;' });
    await page.addScriptTag({ content: PAGE_JS });
    const n = await page.evaluate(o => window.OSMAN.init(o), { samples, custom, channel: cfg.channel });
    return { page, n };
  }
  const first = await newPage();
  console.log(`🎙 ${first.n} gerçek enstrüman kaydı yüklendi${custom.length ? ' · kendi kayıtların: ' + custom.map(c => c.file).join(', ') : ''}`);
  return { browser, page: first.page, newPage: async () => (await newPage()).page };
}

async function renderAudio(studio, set, outWav, onProgress, workers) {
  const info = await studio.page.evaluate(o => window.OSMAN.plan(o), set);
  const total = Math.round(info.dur * SR), nChunks = Math.ceil(info.dur / CHUNK);
  const W = Math.max(1, Math.min(workers || os.cpus().length, nChunks));
  const pages = [studio.page];
  for (let w = 1; w < W; w++) { const p = await studio.newPage(); await p.evaluate(o => window.OSMAN.plan(o), set); pages.push(p); }
  // parçalar paralel üretilir, sırası gelen hemen diske yazılır ve bellekten atılır
  const fd = fs.openSync(outWav, 'w');
  fs.writeSync(fd, wavHeader(total * 4));
  const results = new Map(); let next = 0, done = 0, flushK = 0, carry = null, written = 0;
  const flush = () => {
    while (results.has(flushK)) {
      const r = results.get(flushK); results.delete(flushK);
      const pcm = new Int16Array(Buffer.from(r.b64, 'base64').buffer.slice(0));
      if (carry) for (let i = 0; i < carry.length && i < pcm.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, pcm[i] + carry[i]));
      const bodyN = Math.min(r.body, total - written) * 2;
      fs.writeSync(fd, Buffer.from(pcm.buffer, 0, bodyN * 2));
      written += bodyN / 2; carry = pcm.slice(bodyN); flushK++;
    }
  };
  await Promise.all(pages.map(async pg => {
    while (next < nChunks) {
      while (results.size > pages.length * 2) await new Promise(r => setTimeout(r, 200)); // bellek sınırı
      const k = next++; results.set(k, await pg.evaluate(a => window.OSMAN.chunk(...a), [k, CHUNK, TAIL, SR])); done++; flush();
      if (onProgress) onProgress(done / nChunks);
    }
  }));
  for (let w = 1; w < pages.length; w++) await pages[w].close();
  flush();
  fs.closeSync(fd);
  return info;
}

module.exports = { openStudio, renderAudio, SR };
