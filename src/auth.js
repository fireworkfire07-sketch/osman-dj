#!/usr/bin/env node
// YouTube bağlama (bir kez yapılır): Google izni → refresh token → .env
// 1) Google Cloud'da "Masaüstü uygulaması" OAuth istemcisi oluştur (README), ID ve SECRET'ı .env'ye yaz
// 2) node src/auth.js   →  çıkan linki tarayıcıda aç, ANATOLIAN SHAMANS kanalının hesabıyla izin ver
//    (VPS'teysen önce kendi bilgisayarından:  ssh -L 8085:127.0.0.1:8085 kullanici@vps-ip)
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '..'), ENV = path.join(ROOT, '.env');
const env = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : '';
const get = k => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const id = process.env.YT_CLIENT_ID || get('YT_CLIENT_ID'), sec = process.env.YT_CLIENT_SECRET || get('YT_CLIENT_SECRET');
if (!id || !sec) { console.error('❌ Önce .env içine YT_CLIENT_ID ve YT_CLIENT_SECRET yaz (README: YouTube bağlama).'); process.exit(1); }
const REDIRECT = 'http://127.0.0.1:8085';
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id, redirect_uri: REDIRECT, response_type: 'code', access_type: 'offline', prompt: 'consent',
  scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
});
http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) { res.end('kod yok'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: id, client_secret: sec, redirect_uri: REDIRECT, grant_type: 'authorization_code' }) });
  const j = await r.json();
  if (!j.refresh_token) { res.end('Hata: ' + JSON.stringify(j)); console.error(j); process.exit(1); }
  const line = 'YT_REFRESH_TOKEN=' + j.refresh_token;
  fs.writeFileSync(ENV, /^YT_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^YT_REFRESH_TOKEN=.*$/m, line) : env.replace(/\n?$/, '\n') + line + '\n');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<h2>✅ ANATOLIAN SHAMANS bağlandı. Bu pencereyi kapatabilirsin.</h2>');
  console.log('✅ Refresh token .env dosyasına yazıldı. Artık otomatik yükleme hazır.'); setTimeout(() => process.exit(0), 500);
}).listen(8085, process.env.AUTH_HOST || '127.0.0.1', () => { console.log('\n👉 Bu linki tarayıcıda aç ve kanal hesabınla izin ver:\n\n' + url + '\n'); });
