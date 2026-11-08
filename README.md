# 🎤 Osman Karaoke

Şarkının linkini yapıştır ya da adını yaz, **KARAOKE YAP**'a bas. Birkaç dakika sonra şarkının vokalsiz tam hâli, kayan sözleriyle hazır olur. Söyle, puan al, videonu kaydet.

- YouTube, YouTube Music, Spotify, SoundCloud linki ya da sadece `Tarkan Şımarık` gibi bir ad yazabilirsin. Telefondaki bir ses dosyası da olur.
- Şarkıcının sesi yapay zekâyla (Demucs) ayrılır. Müzik kesilmez, şarkının tamamı kalır.
- Sözler kendiliğinden bulunur ve şarkıcının sesine göre kelime kelime yerleştirilir.
- Mikrofonu açarsan nota çizgisi ve puan görünür. 🔴 Kaydet ile YouTube veya Shorts videosu çekebilirsin.

## Kurulum (bir kere)

Gerekenler: Ubuntu veya Debian bir VPS, en az 2 GB RAM (az ise kurulum takas alanı ekler), 8 GB boş disk ve açık 80/443 portları.

1. Kod `osman-dj` reposunun **karaoke** dalında durur. Repo herkese açık (public) olmalı. Repoda şarkı yok; şarkılar sadece senin sunucunda durur.
2. VPS'e bağlan ve şunu yapıştır:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/fireworkfire07-sketch/osman-dj/karaoke/kur.sh | sudo bash
   ```

3. Sonunda çıkan linki telefonunda aç. iPhone'da **Paylaş → Ana Ekrana Ekle** dersen uygulama gibi açılır.

Güncellemek için aynı komutu tekrar çalıştırman yeter. Şarkıların ve ayarların silinmez.

## Kullanım

| Tuş | Ne yapar |
|---|---|
| 🗣️ Şarkıcı | Orijinal vokal: Kapalı → Kısık (yardım için) → Açık |
| 🎙️ Mikrofon | Nota çizgisi ve puanı açar |
| Yazı erken / Yazı geç | Sözler kayıksa 0,2 saniye düzeltir; ayar o şarkı için saklanır |
| 🔴 Kaydet | Şarkıyı baştan çalar; ekranı, müziği ve sesini videoya kaydeder |
| ⋯ → Sözleri düzelt | Doğru adla yeniden arar ya da yapıştırdığın sözleri vokale göre yerleştirir |
| ⋯ → Müziği indir | Vokalsiz müziği mp3 olarak indirir |

## Sorun olursa

| Sorun | Çözüm |
|---|---|
| “YouTube sunucuyu robot sandı” | Ayarlar → **YouTube çerezi** ekle (cookies.txt) ya da şarkıyı telefondan dosya olarak seç |
| Linki ya da kodu unuttum | `sudo bash /opt/osman-karaoke/kur.sh bilgi` |
| Neler oluyor bakmak istiyorum | `sudo bash /opt/osman-karaoke/kur.sh log` |
| Kapatmak istiyorum | `sudo bash /opt/osman-karaoke/kur.sh durdur` |

## Nasıl çalışıyor

`yt-dlp` sesi indirir. `Demucs htdemucs` vokali ayırır (Ayarlar'daki “Süper temiz” seçeneği `htdemucs_ft` kullanır). Sözler `lrclib.net`'ten gelir ve vokal zarfına göre kaydırılıp kelime kelime zamanlanır. Notalar vokalden NSDF yöntemiyle çıkarılır. Sunucu FastAPI ile, HTTPS ise Caddy ile çalışır; adres `<ip>.sslip.io` olur. YouTube indirici her gün kendini günceller.

## Telif

Telifli şarkılarla yapılan karaoke kişisel kullanım içindir. Bu kayıtları YouTube'a yüklersen Content ID yakalayabilir: reklam geliri hak sahibine gider, video engellenebilir. Kanalın için telifsiz ya da izinli şarkıları kullan.
