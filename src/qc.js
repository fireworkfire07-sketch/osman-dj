// Kalite Müdürü (sunucu): yüklemeden önce videoyu ölçer, 100 üzerinden puan verir.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');

function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height', '-of', 'json', file]).toString());
  const v = j.streams.find(s => s.codec_type === 'video') || {}, a = j.streams.find(s => s.codec_type === 'audio') || {};
  return { dur: +j.format.duration, size: +j.format.size, br: +j.format.bit_rate, w: v.width, h: v.height, vcodec: v.codec_name, acodec: a.codec_name };
}

function silence(file) {
  try {
    const out = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'silencedetect=n=-45dB:d=2', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
    return [...out.matchAll(/silence_duration: ([\d.]+)/g)].reduce((s, m) => s + +m[1], 0);
  } catch (e) { return 0; }
}

function qc({ mp4, masterInfo, meta, chapters, setlog, plannedDur }) {
  const R = [], add = (ok, txt, w) => R.push({ ok: !!ok, txt, w });
  const p = probe(mp4);
  add(Math.abs(p.dur - plannedDur) < 3, `Süre ${(p.dur / 60).toFixed(1)} dk (plan ${(plannedDur / 60).toFixed(0)} dk)`, 10);
  add(p.h >= 720, `Görüntü ${p.w}×${p.h} ${p.vcodec}`, 15);
  add(p.br >= 1.0e6, `Bit hızı ${(p.br / 1e6).toFixed(1)} Mbps`, 10);
  const I = masterInfo.after.I, TP = masterInfo.after.TP;
  add(I > -16 && I < -12, `Ses yüksekliği ${I.toFixed(1)} LUFS (YouTube hedefi -14)`, 20);
  add(TP <= -1, `Gerçek tepe ${TP.toFixed(1)} dBTP`, 10);
  const sil = silence(mp4);
  add(sil < Math.max(6, p.dur * .02), `Sessizlik toplamı ${sil.toFixed(0)} sn`, 10);
  const secs = new Set(setlog.map(e => e.id));
  add(secs.size >= 5, `Bölüm çeşitliliği: ${secs.size} farklı bölüm (müzik akıyor)`, 10);
  add(chapters.length >= 3, `YouTube bölümleri: ${chapters.length}`, 5);
  add(meta.title && meta.title.length >= 20 && meta.title.length <= 100, `Başlık ${meta.title.length} karakter`, 5);
  add((meta.description || '').length >= 300, `Açıklama ${(meta.description || '').length} karakter`, 3);
  add((meta.tags || []).length >= 8, `Etiket ${(meta.tags || []).length}`, 2);
  if (p.dur > 900) R.push({ ok: true, txt: 'ℹ 15 dk üstü: kanalın telefonla doğrulanmış olmalı', w: 0 });
  const tot = R.reduce((a, r) => a + r.w, 0), got = R.reduce((a, r) => a + (r.ok ? r.w : 0), 0);
  const score = Math.round(got / tot * 100);
  return { score, verdict: score >= 85 ? 'YAYINA HAZIR' : score >= 65 ? 'YÜKLENEBİLİR' : 'DÜZELT', checks: R, probe: p };
}

module.exports = { qc, probe };
