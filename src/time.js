// Saat dilimi yardımcıları (Europe/Istanbul) ve günün programı
'use strict';

function localParts(d, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hh: +p.hour, mm: +p.minute, hm: `${p.hour}:${p.minute}`, wd: p.weekday };
}
// tz'deki yerel saat "HH:MM" için bir sonraki an (UTC Date)
function nextLocalTime(hm, tz, from = new Date()) {
  const [H, M] = hm.split(':').map(Number);
  for (let add = 0; add < 3; add++) {
    const base = new Date(from.getTime() + add * 864e5), L = localParts(base, tz);
    // yerel tarihin H:M'ini UTC'ye çevir: ofseti hesapla
    const guess = new Date(`${L.date}T${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}:00Z`);
    const gl = localParts(guess, tz), off = ((gl.hh * 60 + gl.mm) - (H * 60 + M) + 1440 * 2) % 1440;
    const at = new Date(guess.getTime() - (off > 720 ? off - 1440 : off) * 60000);
    if (at.getTime() > from.getTime() + 15 * 60000) return at; // en az 15 dk sonrası
  }
  return new Date(from.getTime() + 864e5);
}
const WD = { Mon: 'pzt', Tue: 'sal', Wed: 'car', Thu: 'per', Fri: 'cum', Sat: 'cmt', Sun: 'paz' };
function todaysProgram(cfg, tz) {
  const L = localParts(new Date(), tz), gun = WD[L.wd];
  const sched = cfg.weekly && cfg.weekly[gun];
  if (sched) return cfg.programs.find(p => p.name === sched) || cfg.programs[0];
  const dayN = Math.floor(Date.parse(L.date + 'T00:00:00Z') / 864e5);
  return cfg.programs[dayN % cfg.programs.length];
}

module.exports = { localParts, nextLocalTime, todaysProgram };
