// LLM Ajanı (sunucu): başlık, açıklama, etiket, YouTube bölümleri.
// ANTHROPIC_API_KEY varsa Claude yazar; yoksa şablon kullanılır. Bölüm zaman damgaları her zaman koddan gelir.
'use strict';

const CHN = { intro: 'Açılış', groove: 'Groove', build: 'Yükseliş', build2: 'Yükseliş II', drop: 'Drop', drop2: 'Drop II', break: 'Taksim', klasik: 'Klasik Bölüm', trans: 'Geçiş' };
const fmt = s => { const p = n => String(n).padStart(2, '0'); return s >= 3600 ? `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(Math.floor(s % 60))}` : `${p(Math.floor(s / 60))}:${p(Math.floor(s % 60))}`; };

// Uzun sette her bölümü değil, anlamlı dönüm noktalarını yaz (YouTube: ilk 00:00, en az 3 bölüm, her biri ≥10 sn)
function chapters(setlog, dur, G) {
  // sadece dönüm noktaları: tür değişimi, klasik eser, ve arada en az 4 dk'da bir büyük drop/taksim
  const out = [];
  setlog.forEach((e, i) => {
    if (e.id === 'trans') return;
    const g = G[e.key], newGenre = i === 0 || setlog.slice(0, i).reverse().find(x => x.id !== 'trans').key !== e.key;
    const lab = e.id === 'klasik' && e.motif ? `🎻 ${e.motif.c} — ${e.motif.p}` : newGenre ? `${g.ic} ${g.n}` : `${g.ic} ${g.n} · ${CHN[e.id] || e.n}`;
    const gap = out.length ? e.t - out[out.length - 1].t : 1e9;
    if (newGenre || e.id === 'klasik') { if (gap < 30 && out.length) out[out.length - 1] = { t: out[out.length - 1].t, lab }; else out.push({ t: e.t, lab }); }
    else if ((e.id === 'drop' || e.id === 'break') && gap >= 240) out.push({ t: e.t, lab });
  });
  if (!out.length) return [];
  out[0].t = 0;
  while (out.length && dur - out[out.length - 1].t < 10) out.pop();
  return out.length >= 3 ? out.map(c => `${fmt(c.t)} ${c.lab}`) : [];
}

function classics(setlog) { return [...new Set(setlog.filter(e => e.motif).map(e => `${e.motif.c} — ${e.motif.p}`))]; }

function template(o) {
  const gn = o.keys.map(k => o.G[k].n), kl = classics(o.setlog), cp = chapters(o.setlog, o.dur, o.G);
  return {
    title: `${o.name} | ${gn.join(' → ')} | OSMAN DJ #${String(o.no).padStart(4, '0')} · ${Math.round(o.dur / 60)} dk`.slice(0, 100),
    description: [
      `"${o.name}" — OSMAN DJ Arşiv #${String(o.no).padStart(4, '0')} · ${o.show}. ${gn.join(' → ')}.`,
      `Bağlama, ney, zurna, darbuka, davul, didgeridoo, ağız kopuzu, şaman defi ve hang drum elektronik ritimle buluşuyor.`,
      kl.length ? `🎻 Klasik bölümler: ${kl.join(', ')}` : '',
      '', '🎞 Anime: SİSTEM — ayın sonunu getirmeye çalışan robotlar, ekranlardaki yalanlar ve bir an durup gökyüzüne bakan biri.',
      '', cp.length ? 'Bölümler:\n' + cp.join('\n') : '',
      '', `Neşet Ertaş, Erkin Koray, Barış Manço, Pir Sultan Abdal ve Aşık Veysel'in açtığı yoldan.`,
      `🔔 Abone ol: ${o.channel}`, '', '#osmandj #anatolianshamans #anatolianelectronic #psytrance #techno',
    ].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n'),
    tags: ['osman dj', 'anatolian shamans', ...gn.map(x => x.toLowerCase()), 'anatolian electronic', 'türk elektronik', 'bağlama', 'ney', 'shamanic', 'live set', '1 hour mix', 'anime', ...kl.map(x => x.split(' — ')[0].toLowerCase() + ' remix')].slice(0, 25),
  };
}

async function writeMeta(o) {
  const base = template(o), cp = chapters(o.setlog, o.dur, o.G);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ...base, by: 'şablon' };
  const prompt = `Sen "${o.channel}" YouTube kanalının içerik yöneticisisin. Sanatçı: OSMAN DJ (Antalya) — yeni doğan bir yıldız. Anadolu Rock (Neşet Ertaş, Erkin Koray, Barış Manço, Cem Karaca) ve Alevi müziğini (Pir Sultan Abdal, Aşık Veysel) sever; bağlama, ney, zurna, darbuka, didgeridoo, ağız kopuzu, şaman defi, hang drumu elektronik müzikle buluşturur; setlerinde Beethoven/Mozart/Paganini temalarını Anadolu enstrümanlarıyla yorumlar. Videoda "Anime: SİSTEM" var: kapitalist sistemde ay sonunu getirmeye çalışan, işten eve evden işe giden, ekranlardaki dezenformasyonla uyutulan robotlar; set ilerledikçe uyanıp özgürleşiyorlar.
Setin adı: "${o.name}" (arşiv #${String(o.no).padStart(4, '0')}); başlık bu adla başlasın. Gösteri: "${o.show}", türler ${o.keys.map(k => o.G[k].n).join(' → ')}, süre ${Math.round(o.dur / 60)} dk.
Klasik bölümler: ${classics(o.setlog).join(', ') || 'yok'}.
YouTube için yaz: güçlü ama tık tuzağı olmayan başlık (en fazla 95 karakter), 900-1500 karakter açıklama (ilk 2 satır çok güçlü; hikâyeyi ve sanatçıyı anlat; sonunda abone çağrısı ve 4-6 hashtag), 15-20 etiket. Bölüm listesini ben ekleyeceğim, sen ekleme.
Sadece JSON döndür: {"title":"...","description":"...","tags":["..."]}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
    const j = await r.json(); const txt = j.content.map(c => c.text || '').join('');
    const m = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    if (!m.title) throw new Error('boş başlık');
    m.description = (m.description || '') + (cp.length ? '\n\nBölümler:\n' + cp.join('\n') : '');
    return { title: m.title.slice(0, 100), description: m.description.slice(0, 4900), tags: (m.tags || base.tags).slice(0, 30), by: 'claude' };
  } catch (e) { console.warn('⚠ LLM yazamadı, şablon kullanılıyor:', e.message); return { ...base, by: 'şablon' }; }
}

module.exports = { writeMeta, chapters, classics, fmt };
