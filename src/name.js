// İsim Ajanı: her sete arşiv numarası ve şiirsel bir isim verir.
// ANTHROPIC_API_KEY varsa Claude koyar; yoksa Anadolu/şaman sözlüğünden üretir. Aynı isim iki kez verilmez.
'use strict';

const W = {
  yer: ['Bozkırda', 'Dağ Başında', 'Toros\'ta', 'Kapadokya\'da', 'Fırat Kıyısında', 'Ağrı Eteğinde', 'Ege Rüzgârında', 'Akdeniz Gecesinde', 'Kervan Yolunda', 'Yıldız Altında', 'Ateş Başında', 'Cemevinde', 'Sis İçinde', 'Ay Işığında'],
  ad: ['Uyanış', 'Ritüel', 'Göç', 'Semah', 'Dem', 'Nefes', 'Yolculuk', 'Rüya', 'Çağrı', 'Dönüş', 'Sema', 'Turna Sesi', 'Kopuz Sesi', 'Ateş Dansı', 'Şafak', 'Zikir', 'Kanat', 'Gece Yürüyüşü', 'Yıldız Haritası', 'Kayıp Ritim'],
  sifat: ['Kadim', 'Yanık', 'Derin', 'Gizli', 'Son', 'İlk', 'Sonsuz', 'Uykusuz', 'Dönen', 'Kırık', 'Altın', 'Mor', 'Kızıl', 'Sessiz', 'Vahşi'],
  tur: { psy: ['Kozmik', 'Yıldız', 'Sonsuz'], tech: ['Demir', 'Makine', 'Karanlık'], arock: ['Bağlama', 'Hicaz', 'Asi'], dh: ['Gün Batımı', 'Altın', 'Deniz'], neset: ['Bozkır', 'Garip', 'Yanık'], semah: ['Semah', 'Cem', 'Turna'], saman: ['Şaman', 'Kam', 'Davul'] },
};

function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (R, a) => a[Math.floor(R() * a.length)];

function localName(seed, keys, used) {
  const R = rng(seed);
  for (let i = 0; i < 50; i++) {
    const k = pick(R, keys), f = Math.floor(R() * 4);
    const n = f === 0 ? `${pick(R, W.yer)} ${pick(R, W.ad)}`
      : f === 1 ? `${pick(R, W.sifat)} ${pick(R, W.ad)}`
      : f === 2 ? `${pick(R, W.tur[k] || W.sifat)} ${pick(R, W.ad)}`
      : `${pick(R, W.sifat)} ${pick(R, W.tur[k] || W.sifat)} ${pick(R, ['Gecesi', 'Ritüeli', 'Yolculuğu', 'Rüyası', 'Çağrısı'])}`;
    if (!used.has(n.toLocaleLowerCase('tr'))) return n;
  }
  return `Set ${seed % 10000}`;
}

async function nameSet({ seed, keys, G, program, classics, hour, used }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const prompt = `OSMAN DJ (ANATOLIAN SHAMANS) için yeni bir setin arşiv adını koy. Program: "${program}". Türler: ${keys.map(k => G[k].n).join(' → ')}. Klasik bölümler: ${classics.join(', ') || 'yok'}. Saat: ${hour}. Videoda robotların sistemden uyanışını anlatan bir anime var.
Kurallar: Türkçe, 2-4 kelime, şiirsel ve akılda kalıcı, Anadolu/şaman/doğa imgesi, klişe değil. Şu adlar KULLANILDI, tekrar etme: ${[...used].slice(-40).join(', ') || '-'}.
Sadece adı yaz, tırnak ve açıklama yok.`;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 40, messages: [{ role: 'user', content: prompt }] }),
      });
      if (r.ok) {
        const j = await r.json(); const n = j.content.map(c => c.text || '').join('').trim().replace(/^["'“”]+|["'“”.]+$/g, '').split('\n')[0];
        if (n && n.length <= 40 && !used.has(n.toLocaleLowerCase('tr'))) return { name: n, by: 'claude' };
      }
    } catch (e) { /* yerel isme düş */ }
  }
  return { name: localName(seed, keys, used), by: 'sözlük' };
}

module.exports = { nameSet };
