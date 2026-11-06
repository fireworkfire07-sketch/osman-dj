#!/usr/bin/env node
// OSMAN DJ V5.1 — Üretim Müdürü: bir seti baştan sona üretir, adlandırır, arşivler ve yayınlar.
//   DJ Beyni → Ses → Mastering → İsim Ajanı → Görüntü Yönetmeni + Anime → Kapak → LLM metin → Kalite → YouTube → Arşiv
// Kullanım:
//   node src/produce.js                                   bugünün programı (config.json)
//   node src/produce.js --program "Gece Ritüeli"
//   node src/produce.js --minutes 3 --genres saman,psy --no-upload      hızlı deneme
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
loadEnv(path.join(ROOT, '.env'));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const { openStudio, renderAudio } = require('./audio');
const { master } = require('./master');
const { renderVideo, renderThumb } = require('./video');
const { writeMeta, chapters, classics } = require('./meta');
const { qc } = require('./qc');
const { uploadVideo, channelName } = require('./youtube');
const beyin = require('./beyin');
const { nameSet } = require('./name');
const { usedNames, nextNo, addToArchive, pruneLocal } = require('./archive');
const { localParts, nextLocalTime, todaysProgram } = require('./time');
const tg = require('./notify');

function loadEnv(f) { if (!fs.existsSync(f)) return; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } }
function arg(name, def) { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); }
function gTable() { return require('../engine/core.js')({ OfflineAudioContext: class {} }).G; }

async function produce(opts = {}) {
  const tz = cfg.timezone || 'Europe/Istanbul';
  const prog = opts.program ? (cfg.programs.find(p => p.name === opts.program) || { name: opts.program, genres: ['psy'] }) : todaysProgram(cfg, tz);
  const seed = +(opts.seed || (Date.now() % 1e9));
  // süre: config "minutes" tek sayı ya da [en az, en çok] aralığı (5 dk adımlarla)
  const M = opts.minutes || prog.minutes || cfg.minutes || 60;
  const minutes = Array.isArray(M) ? M[0] + 5 * Math.floor(((seed % 1000) / 1000) * ((M[1] - M[0]) / 5 + 1)) : +M;
  const brain = beyin.load(), bo = beyin.planOpts(brain);
  const genres = opts.genres ? String(opts.genres).split(',') : (minutes > 75 ? beyin.pickGenres(brain, prog, minutes, seed, cfg.taste || {}) : prog.genres);
  const L = localParts(new Date(), tz);
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const lock = path.join(ROOT, 'out', '.lock');
  if (fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs < 10 * 3600e3) throw new Error('başka bir üretim sürüyor (out/.lock)');
  fs.writeFileSync(lock, String(process.pid));
  const dir = path.join(ROOT, 'out', `_uretim_${Date.now()}`); fs.mkdirSync(dir, { recursive: true });
  let logf = path.join(dir, 'log.txt');
  const log = (...a) => { const line = `[${new Date().toISOString().slice(11, 19)}] ${a.join(' ')}`; console.log(line); try { fs.appendFileSync(logf, line + '\n'); } catch (e) {} };
  const report = { program: prog.name, minutes, genres, seed, brain: { gen: brain.gen, ...bo }, date: L.date, started: new Date().toISOString(), steps: {} };
  const save = () => fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  const T = () => { const t = Date.now(); return () => ((Date.now() - t) / 60000).toFixed(1) + ' dk'; };
  const G = gTable();
  try {
    log(`🌟 OSMAN DJ — "${prog.name}" · ${minutes} dk · ${genres.join(' → ')} · seed ${seed}`);
    // 1) DJ Beyni + Ses
    let t = T(), pct = -1;
    const studio = await openStudio({ channel: cfg.channel });
    const raw = path.join(dir, 'raw.wav');
    const info = await renderAudio(studio, { minutes, genres, seed, klasik: prog.klasik !== false, anime: cfg.video.anime !== false, klasikEvery: bo.klasikEvery || cfg.klasikEvery || 3, bpm: bo.bpm, transLen: bo.transLen, freqs: prog.freqs }, raw,
      p => { const q = Math.floor(p * 10); if (q !== pct) { pct = q; log(`🎛 ses %${q * 10}`); } }, +cfg.workers || os.cpus().length);
    await studio.browser.close();
    report.steps.audio = t(); report.setlog = info.setlog; save();
    const keys = [...new Set(info.setlog.map(e => e.key))], kl = classics(info.setlog), cps = chapters(info.setlog, info.dur, G);
    log(`✅ ses hazır (${report.steps.audio}) · ${info.setlog.length} bölüm`);
    // 2) İsim Ajanı + arşiv numarası
    const no = nextNo();
    const nm = await nameSet({ seed, keys, G, program: prog.name, classics: kl, hour: L.hm, used: usedNames() });
    report.no = no; report.name = nm.name; save();
    log(`🏷 Arşiv #${String(no).padStart(4, '0')} — "${nm.name}" (${nm.by})`);
    // 3) Mastering
    t = T();
    const mw = path.join(dir, 'master.wav');
    const mi = await master(raw, mw, info.dur);
    report.steps.master = t(); report.loudness = mi; save(); fs.unlinkSync(raw);
    log(`🎚 mastering: ${mi.before.I} → ${mi.after.I} LUFS, tepe ${mi.after.TP} dBTP`);
    // 4) Video
    t = T(); pct = -1;
    const fileBase = `OSMAN-DJ_${String(no).padStart(4, '0')}`;
    const mp4 = path.join(dir, `${fileBase}.mp4`);
    const v = await renderVideo({ masterWav: mw, outMp4: mp4, setlog: info.setlog, dur: info.dur, keys, channel: cfg.channel,
      fps: cfg.video.fps, width: cfg.video.width, height: cfg.video.height, anime: cfg.video.anime !== false, crf: cfg.video.crf, theme: prog.theme || cfg.video.theme || 'anime',
      onProgress: p => { const q = Math.floor(p * 10); if (q !== pct) { pct = q; log(`🎥 video %${q * 10}`); } } });
    report.steps.video = t(); report.video = v; save(); fs.unlinkSync(mw);
    log(`✅ video hazır (${report.steps.video}) · ${v.shots} kesme · ${v.scenes} sahne türü`);
    // 5) Metin + kapak
    const meta = await writeMeta({ name: nm.name, no, show: prog.name, keys, setlog: info.setlog, dur: info.dur, channel: cfg.channel, G });
    fs.writeFileSync(path.join(dir, 'youtube.txt'), `BAŞLIK:\n${meta.title}\n\nAÇIKLAMA:\n${meta.description}\n\nETİKETLER:\n${meta.tags.join(', ')}\n`);
    const thumb = path.join(dir, 'kapak.jpg');
    await renderThumb({ outJpg: thumb, setlog: info.setlog, dur: info.dur, keys, channel: cfg.channel, title: nm.name, no, anime: cfg.video.anime !== false, theme: prog.theme || cfg.video.theme || 'anime' });
    report.meta = meta; save();
    log(`🤖 metin (${meta.by}): ${meta.title}`);
    // 6) Kalite
    const q = qc({ mp4, masterInfo: mi, meta, chapters: cps, setlog: info.setlog, plannedDur: info.dur });
    report.qc = q; save();
    log(`✅ KALİTE ${q.score}/100 · ${q.verdict}`); q.checks.forEach(c => log(`   ${c.ok ? '✓' : '✗'} ${c.txt}`));
    // 7) YouTube
    const up = cfg.upload || {};
    let doUpload = up.enabled && !opts.noUpload && process.env.YT_REFRESH_TOKEN, chOk = true;
    if (doUpload && cfg.channel) { try { const ch = await channelName(); chOk = ch.toLocaleLowerCase('tr') === cfg.channel.toLocaleLowerCase('tr'); if (!chOk) log(`⚠ Bağlı kanal "${ch}", "${cfg.channel}" değil — yükleme bekletildi (osmandj bagla)`); } catch (e) { log('⚠ kanal kontrolü yapılamadı: ' + e.message); } }
    doUpload = doUpload && chOk;
    if (!doUpload && chOk) log(`⏸ YouTube yüklemesi atlandı (${opts.noUpload ? '--no-upload' : !up.enabled ? 'config.upload.enabled=false' : '.env YouTube bilgisi yok'})`);
    else if (q.score < (up.minScore || 80)) log(`⏸ kalite ${q.score} < ${up.minScore} · yüklenmedi`);
    else {
      t = T();
      const slot = opts.publish || prog.publish;
      // onay modu: Osman dinleyip onaylamadan yayına girmez (özel yüklenir, planlanmaz)
      const publishAt = up.approval !== false ? undefined : slot ? nextLocalTime(slot, tz).toISOString() : undefined;
      const r = await uploadVideo({ file: mp4, meta, privacy: up.approval !== false ? 'private' : (up.privacy || 'private'), publishAt, thumb, playlistId: prog.playlistId || up.playlistId, log });
      report.youtube = { ...r, publishAt }; report.steps.upload = t(); save();
      log(`🎉 YOUTUBE: ${r.url}${publishAt ? ' · yayın: ' + new Date(publishAt).toLocaleString('tr-TR', { timeZone: tz }) : ''}`);
    }
    // 8) Arşiv
    report.finished = new Date().toISOString(); report.ok = true; save();
    const { dest } = addToArchive(dir, { no, name: nm.name, date: L.date, time: L.hm, program: prog.name, genres: keys.map(k => G[k].n), keys, brainGen: brain.gen, minutes,
      classics: kl, chapters: cps, score: q.score, youtube: report.youtube ? report.youtube.url : null, title: meta.title });
    logf = path.join(dest, 'log.txt');
    log(`📼 arşivlendi: ${path.relative(ROOT, dest)}`);
    try { await tg.photo(path.join(dest, 'kapak.jpg'), [
      `🎉 <b>Yeni set hazır!</b>`,
      `#${String(no).padStart(4, '0')} <b>${tg.esc(nm.name)}</b>`,
      `${tg.esc(prog.name)} · ${keys.map(k => G[k].n).join(' → ')} · ${minutes} dk`,
      kl.length ? `🎻 ${tg.esc(kl.join(', '))}` : '',
      `✅ Kalite ${q.score}/100 · ${(+mi.after.I).toFixed(1)} LUFS · ${v.shots} kesme`,
      report.youtube ? `📺 ${report.youtube.url}${report.youtube.publishAt ? ' · yayın ' + new Date(report.youtube.publishAt).toLocaleString('tr-TR', { timeZone: tz }) : ''}` : '📺 YouTube: henüz yüklenmedi (arşivde bekliyor)',
      `⏱ ses ${report.steps.audio} · video ${report.steps.video}`,
    ].filter(Boolean).join('\n')); } catch (e) { log('⚠ Telegram bildirimi gönderilemedi: ' + e.message); }
    try { pruneLocal(+(cfg.archive && cfg.archive.keepLocal) || 30, log); } catch (e) { log('⚠ arşiv temizliği: ' + e.message); }
    return { ...report, dir: dest };
  } catch (e) {
    report.error = String(e.stack || e); report.ok = false; try { save(); } catch {} log('❌ ' + e.message);
    await tg.send(`❌ <b>OSMAN DJ üretim hatası</b>\n${tg.esc(prog.name)} · ${minutes} dk\n<code>${tg.esc(String(e.message).slice(0, 500))}</code>\nAyrıntı: out/${path.basename(dir)}/log.txt`);
    throw e;
  } finally { try { fs.unlinkSync(lock); } catch (e) {} }
}

module.exports = { produce };

if (require.main === module) {
  produce({ program: arg('program'), minutes: arg('minutes'), genres: arg('genres'), seed: arg('seed'), publish: arg('publish'), noUpload: !!arg('no-upload', false) })
    .then(() => process.exit(0)).catch(() => process.exit(1));
}
