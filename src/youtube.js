// Kanal Yöneticisi (sunucu): YouTube'a otomatik yükleme. Refresh token ile çalışır, süresi dolmaz.
'use strict';
const fs = require('fs');

async function accessToken() {
  const { YT_CLIENT_ID: id, YT_CLIENT_SECRET: sec, YT_REFRESH_TOKEN: rt } = process.env;
  if (!id || !sec || !rt) throw new Error('.env içinde YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN eksik (README: YouTube bağlama)');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: sec, refresh_token: rt, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('token alınamadı: ' + JSON.stringify(j));
  return j.access_token;
}

async function uploadVideo({ file, meta, privacy = 'private', publishAt, thumb, playlistId, log = console.log }) {
  const tok = await accessToken();
  const size = fs.statSync(file).size;
  const status = { privacyStatus: publishAt ? 'private' : privacy, selfDeclaredMadeForKids: false };
  if (publishAt) status.publishAt = publishAt; // planlı yayın: belirtilen saatte otomatik herkese açılır
  const body = { snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: '10', defaultLanguage: 'tr', defaultAudioLanguage: 'tr' }, status };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) },
    body: JSON.stringify(body),
  });
  if (!init.ok) throw new Error('yükleme başlatılamadı: ' + init.status + ' ' + (await init.text()).slice(0, 300));
  const url = init.headers.get('location');
  // 64 MB'lık parçalarla yükle; kopma olursa kaldığı yerden devam eder
  const CH = 64 * 1024 * 1024; let off = 0, res = null, tries = 0;
  const fd = fs.openSync(file, 'r');
  while (off < size) {
    const n = Math.min(CH, size - off), buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, off);
    try {
      const r = await fetch(url, { method: 'PUT', headers: { 'content-length': String(n), 'content-range': `bytes ${off}-${off + n - 1}/${size}` }, body: buf });
      if (r.status === 308) { const rg = r.headers.get('range'); off = rg ? +rg.split('-')[1] + 1 : off + n; tries = 0; }
      else if (r.ok) { res = await r.json(); off = size; }
      else throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
      log(`📤 YouTube %${Math.round(off / size * 100)}`);
    } catch (e) {
      if (++tries > 6) { fs.closeSync(fd); throw e; }
      log('⚠ yükleme kesildi, tekrar deneniyor: ' + e.message);
      await new Promise(r => setTimeout(r, 5000 * tries));
      const q = await fetch(url, { method: 'PUT', headers: { 'content-length': '0', 'content-range': `bytes */${size}` } });
      if (q.status === 308) { const rg = q.headers.get('range'); off = rg ? +rg.split('-')[1] + 1 : 0; } else if (q.ok) { res = await q.json(); off = size; }
    }
  }
  fs.closeSync(fd);
  const id = res && res.id;
  if (!id) throw new Error('video kimliği dönmedi');
  if (thumb && fs.existsSync(thumb)) {
    const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${id}`, { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'image/jpeg' }, body: fs.readFileSync(thumb) });
    log(t.ok ? '🖼 kapak görseli yüklendi' : '⚠ kapak yüklenemedi (kanal doğrulanmamış olabilir): ' + t.status);
  }
  if (playlistId) {
    const p = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: id } } }) });
    log(p.ok ? '📃 oynatma listesine eklendi' : '⚠ oynatma listesine eklenemedi: ' + p.status);
  }
  return { id, url: 'https://youtu.be/' + id };
}

async function channelName() {
  const tok = await accessToken();
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: 'Bearer ' + tok } });
  const j = await r.json(); return (j.items && j.items[0] && j.items[0].snippet.title) || '(kanal yok)';
}

module.exports = { uploadVideo, accessToken, channelName };
