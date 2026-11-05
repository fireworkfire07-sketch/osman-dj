// Mastering: YouTube standardı -14 LUFS, tepe -1.5 dBTP (iki geçişli loudnorm), giriş/çıkış fade.
'use strict';
const { spawn } = require('child_process');

function run(args) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', args); let err = '';
    p.stderr.on('data', d => { err += d; if (err.length > 200000) err = err.slice(-100000); });
    p.on('close', c => c === 0 ? res(err) : rej(new Error('ffmpeg: ' + err.slice(-600))));
  });
}
const lastJson = s => { const i = s.lastIndexOf('{'), j = s.lastIndexOf('}'); return JSON.parse(s.slice(i, j + 1)); };

async function master(inWav, outWav, dur, target = { I: -14, TP: -1.5, LRA: 11 }) {
  const ln = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}`;
  const m = lastJson(await run(['-hide_banner', '-nostats', '-i', inWav, '-af', ln + ':print_format=json', '-f', 'null', '-']));
  const fadeOut = Math.max(0, dur - 8);
  const af = `afade=t=in:d=1.5,afade=t=out:st=${fadeOut}:d=8,${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  const o = lastJson(await run(['-hide_banner', '-nostats', '-y', '-i', inWav, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', outWav]));
  return { before: { I: +m.input_i, TP: +m.input_tp }, after: { I: +o.output_i, TP: +o.output_tp, LRA: +o.output_lra } };
}

module.exports = { master, run };
