// DJ Beyni (sunucu): bir saatlik setin tamamını 16'lık adım adım planlar.
// Tarayıcıdaki canlı zamanlayıcının birebir aynısı, sadece önceden hesaplanır.
'use strict';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/**
 * @param core   motor
 * @param o.minutes   set süresi (dk)
 * @param o.genres    sırayla çalınacak türler, örn ['saman','psy','tech']
 * @param o.seed      aynı seed = aynı set
 */
function planSet(core, o) {
  const { G, secInfo } = core;
  const T = o.minutes * 60;
  const genres = o.genres.filter(g => G[g]);
  if (!genres.length) throw new Error('geçerli tür yok: ' + o.genres);
  const R = rng(o.seed || Date.now());
  core.setOpts({ klasikOn: o.klasik !== false, klasikSel: -1, motBase: Math.floor(R() * 6), animeOn: o.anime !== false, animeDur: T });

  let t = 0.1, step = 0, arrStep = 0, cur = genres[0], bpm = G[cur].bpm, trans = null, pendTrans = null, jump = false, lastKey = '';
  const steps = [], setlog = [];
  const per = T / genres.length;
  let kIdx = 0; const kBase = Math.floor(R() * 6); // altı klasik eser sırayla
  while (t < T - 0.2) {
    if (arrStep % 16 === 0 && !trans && pendTrans) { trans = { to: pendTrans, st: step, len: 64, fb: bpm, tb: G[pendTrans].bpm }; pendTrans = null; }
    if (trans) {
      const p = (step - trans.st) / trans.len;
      if (p >= 1) { cur = trans.to; bpm = G[cur].bpm; arrStep = Math.floor(arrStep / 1024) * 1024 + 128; trans = null; jump = true; }
      else bpm = trans.fb + (trans.tb - trans.fb) * p;
    }
    // klasik bölüm her döngüde değil, 'klasikEvery' döngüde bir (1 saatlik sette ~6-8 kez) — değerini korusun
    if (!trans && arrStep % 1024 === 0) {
      const cyc = Math.floor(arrStep / 1024), on = o.klasik !== false && cyc % (o.klasikEvery || 3) === 1;
      if (on) { const want = (kBase + kIdx++) % 6; core.setOpts({ klasikOn: true, motBase: ((want - cyc) % 6 + 6) % 6 }); } else core.setOpts({ klasikOn: false });
    }
    const sd = 60 / bpm / 4, as = trans ? step - trans.st : arrStep;
    const info = trans
      ? { id: 'trans', base: 'trans', n: '🔀 GEÇİŞ', bar: Math.floor(as / 16), len: 4, cb: Math.floor(as / 16), cyc: 0, secStart: 0, motif: null, to: trans.to }
      : secInfo(arrStep);
    if (as % 16 === 0) {
      info.jump = jump; jump = false;
      const key = info.id + '|' + cur + '|' + (info.motif ? info.motif.p : '');
      if (key !== lastKey) {
        lastKey = key;
        setlog.push({ t, key: cur, id: info.id, n: info.n, motif: info.id === 'klasik' ? info.motif : null });
        // yeni döngünün başında: takvime göre sıradaki türe geç
        if (!trans && info.base === 'intro' && info.cyc > 0) {
          const want = genres[Math.min(genres.length - 1, Math.floor((t + 20) / per))];
          if (want !== cur) pendTrans = want;
        }
      }
    }
    steps.push({ t, key: cur, i: step, as, info, sd, bpm });
    t += sd; step++; if (!trans) arrStep++;
  }
  return { steps, setlog, dur: T, genres };
}

module.exports = { planSet };
