# OSMAN DJ V5.1 — Otomatik Üretim Stüdyosu + 7/24 Radyo · ANATOLIAN SHAMANS

Sen uyurken sunucu gün boyu set üretir, her birine **isim ve arşiv numarası** verir, YouTube'a yükler ve arşivden **7/24 kesintisiz canlı yayın** yapar.

```
⏰ Zamanlayıcı (sürekli mod) → günde N set, sırayla programlar
  🏷 İsim Ajanı    "Arşiv #0007 — Bozkırda Uyanış" (Claude ya da Anadolu/şaman sözlüğü, isim tekrar etmez)
  🧠 DJ Beyni      60 dk'lık seti adım adım planlar: intro → yükseliş → drop → taksim → klasik bölüm, türler arası yumuşak geçiş
  🎛 Ses           başsız Chromium'da, tarayıcı stüdyosuyla birebir aynı motor, gerçek enstrüman kayıtları, paralel
  🎚 Mastering     -14 LUFS / -1.5 dBTP (YouTube standardı), giriş/çıkış fade
  🎥 Görüntü Yön.  Anime: SİSTEM + kesmeler müziğe göre, kare kare → H.264 MP4 (720p/1080p)
  🖼 Kapak         setin en güçlü sahnesinden + başlık
  🤖 LLM           başlık, açıklama, etiket + YouTube bölümleri (zaman damgalı)
  ✅ Kalite        süre, ses, tepe, sessizlik, görüntü, bölüm çeşitliliği → 100 üzerinden puan
  📺 YouTube       puan yeterliyse yükler, programın yayın saatine planlar, kapağı ve oynatma listesini ayarlar
```

  📼 Arşiv        out/arsiv/0007_bozkirda-uyanis/ + katalog.json + index.html (arşiv sayfası)
📻 Radyo (ayrı servis) → arşivdeki setleri en yenisi önce olmak üzere 7/24 YouTube canlı yayınına kesintisiz akıtır
```

Her set `out/arsiv/NNNN_isim/` klasörüne düşer: `OSMAN-DJ_NNNN.mp4`, `kapak.jpg`, `youtube.txt`, `report.json`, `log.txt`.
Bütün arşiv: `out/arsiv/index.html` (kapaklar, isimler, bölümler, YouTube linkleri). Diskte son 40 set tutulur, YouTube'a gitmiş eskilerin sadece videosu silinir.

---

## ⚡ Hızlı kurulum (tek komut)

VPS'e bağlan (`ssh root@IP`) ve yapıştır:
```bash
curl -fsSL https://raw.githubusercontent.com/fireworkfire07-sketch/osman-dj/main/scripts/kur.sh | bash
```
Docker, takas alanı, stüdyo ve radyo kurulur. Sürekli üretim hemen başlar (günde 4 set, ilk 10 set).

Yönetim: `osmandj durum` · `osmandj log` · `osmandj yukle` (biriken setleri YouTube'a) · `osmandj bagla` (YouTube izni) · `osmandj guncelle` · `osmandj dur` / `basla`

## 1) VPS

**Önerilen:** 8 vCPU · 16-24 GB RAM · 200 GB NVMe · sınırsız ya da bol trafik · Ubuntu 24.04 · Almanya veri merkezi.
- Günde 4 set × 60 dk üretim + 7/24 yayın bu boyutta rahat döner. Yayın neredeyse CPU harcamaz (video kopyalanır), ayda yaklaşık 0,7 TB çıkış trafiği yapar.
- Disk: her 60 dk'lık set yaklaşık 1 GB, 40 set yaklaşık 40 GB, üretim sırasında da geçici 1,5 GB.
- Daha az çekirdekte de çalışır, sadece yavaşlar. Ses parçaları çekirdek sayısı kadar paralel üretilir.

## 2) Kurulum (tek komut)

Kendi bilgisayarından klasörü VPS'e gönder:
```bash
scp -r osmandj-v5 root@VPS_IP:/opt/osmandj
ssh root@VPS_IP
cd /opt/osmandj && bash scripts/vps-kur.sh
```
Script Docker'ı kurar, stüdyoyu hazırlar, **3 dakikalık deneme seti** üretir (`out/arsiv/`), sonra **sürekli üretimi** ve **7/24 radyoyu** başlatır.

## 3) YouTube bağlama (bir kez)

1. https://console.cloud.google.com → yeni proje → **YouTube Data API v3**'ü etkinleştir
2. **OAuth izin ekranı**: External, uygulama adı "OSMAN DJ Studio", kendi e-postan. Sonra **"Uygulamayı yayınla / In production"** yap.
   Test modunda kalırsa izin 7 günde bir düşer.
3. **Kimlik bilgileri → OAuth istemci kimliği → Masaüstü uygulaması** → ID ve SECRET'ı `.env` dosyasına yaz:
   ```
   YT_CLIENT_ID=...
   YT_CLIENT_SECRET=...
   ```
4. İzni al. Kendi bilgisayarında bir terminal aç:
   ```bash
   ssh -L 8085:127.0.0.1:8085 root@VPS_IP
   cd /opt/osmandj && docker compose run --rm --network host studio node src/auth.js
   ```
   Çıkan linki kendi tarayıcında aç, **ANATOLIAN SHAMANS kanalının hesabıyla** izin ver. `YT_REFRESH_TOKEN` otomatik `.env`'ye yazılır. Süresi dolmaz.

> ⚠ **Önemli YouTube kuralı:** Doğrulanmamış (denetimden geçmemiş) API projeleriyle yüklenen videolar YouTube tarafından **"Özel"de kilitlenir**. İki yol var:
> 1. Video otomatik yüklenir, Studio'da tek tıkla "Herkese açık" yaparsın.
> 2. Google'a ücretsiz **API denetimi** başvurusu yaparsın; onaylanınca planlı yayın tamamen otomatik olur.
>
> Ayrıca 15 dakikadan uzun video için kanalın **telefonla doğrulanmış** olması gerekir.

## 3b) 7/24 canlı yayın (radyo)

1. YouTube Studio → **Oluştur → Canlı yayına geç**. Kanalda ilk kez açılıyorsa YouTube 24 saat bekletir.
2. **Yayın anahtarı**nı kopyala, `.env` → `YT_STREAM_KEY=` satırına yapıştır.
3. `docker compose up -d radyo`

Radyo, arşivdeki setleri en yenileri önce gelecek şekilde 12 saatlik bir listeye dizer, bitince yeni setleri de alarak listeyi yeniler. Setler arası geçiş kesintisizdir. Bağlantı koparsa 10 sn sonra kendisi yeniden bağlanır.

## 4) Elle çalıştırma

```bash
docker compose run --rm studio node src/produce.js --minutes 3 --no-upload       # hızlı deneme
docker compose run --rm studio node src/produce.js                               # bugünün programı, 60 dk, yükle
docker compose run --rm studio node src/produce.js --program "Semah Gecesi"
docker compose run --rm studio node src/produce.js --genres saman,psy,tech --minutes 60
docker compose logs -f studio                                                     # üretimi izle
docker compose logs -f radyo                                                      # yayını izle
```

## 5) Program ve takvim — `config.json`

| Ayar | Anlamı |
|---|---|
| `production.mode` | `surekli` = gün boyu arka arkaya üretir · `gunluk` = her gün `time` saatinde 1 set |
| `production.setsPerDay` | Günde kaç set (YouTube günde 100 yüklemeye izin veriyor) |
| `production.publishSlots` | Günün 1., 2., 3.… setinin YouTube'da yayınlanacağı saatler |
| `production.minFreeGB` | Disk bu kadarın altına inerse üretim durur |
| `archive.keepLocal` | Diskte tutulacak son set sayısı |
| `live` | 7/24 radyo: açık/kapalı, kaç saatlik liste, en yeni kaç set önce |
| `programs[]` | Gösteriler: `genres` sırayla çalınır (eşit sürelerle, yumuşak geçişle) |
| `weekly` | Günün ilk seti hangi programla açılsın (`pzt sal car per cum cmt paz`), sonra programlar sırayla döner |
| `upload.privacy` | `private` / `unlisted` / `public` (planlı yayında otomatik açılır) |
| `upload.minScore` | Bu puanın altındaki set yüklenmez |
| `video.width/height` | 1280×720 (hızlı) veya 1920×1080 |
| `video.anime` | `true` = Anime: SİSTEM, `false` = soyut görseller |

Türler: `psy` Psytrance · `tech` Techno · `arock` Anadolu Rock · `dh` Deep House · `neset` Neşet Ertaş Chill Tekno · `semah` Alevi Semah Tekno · `saman` Şaman Trans

## 6) Kendi enstrüman kayıtların

`custom/` klasörüne `<enstrüman>_<kök nota>.wav` adıyla koy. Bir sonraki set onunla çalar:

```
custom/kopuz_38.wav      ← ağız kopuzu (Re2)      ★ Osman'ın kendi kopuzu buraya
custom/baglama_57.wav    ← bağlama (La3)
custom/def_36.wav        ← şaman defi
```
Enstrümanlar: `baglama ney zurna didj kopuz def hang` · Nota numaraları: 36=Do2, 38=Re2, 45=La2, 50=Re3, 57=La3, 62=Re4

## 7) Claude ile metin (isteğe bağlı)

`.env` içine `ANTHROPIC_API_KEY=` yazarsan başlık ve açıklamayı Claude yazar; yoksa hazır şablon kullanılır. Bölüm zaman damgaları her iki durumda da otomatik eklenir.

## 8) GitHub repolarını VPS'e tanımla (self-hosted runner)

Otomasyon repoların (shp-engine, AITUBE2, Nobody-Tells-You, secret-history-plants, osman-ai) VPS'in gücüyle çalışır. Secrets GitHub'da kalır, hiçbir şey taşınmaz.

1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**
   - Repository access: **Only select repositories** → bu 5 repo
   - Permissions → Repository → **Administration: Read and write**
   - Süre: 1 yıl. Token'ı kopyala.
2. VPS'te: `nano /opt/osmandj/.env` → `GH_RUNNER_PAT=` satırına yapıştır, kaydet
3. `osmandj runner-kur` → her repo için izole, tek kullanımlık bir çalıştırıcı açılır (`osman-vps` etiketi, en fazla 3 CPU / 6 GB)
4. İş akışlarında `runs-on: ubuntu-latest` yerine `runs-on: [self-hosted, osman-vps]` yazılan işler VPS'te çalışır.

Güvenlik: Repolar public. Her repoda **Settings → Actions → General → Fork pull request workflows → "Require approval for all external contributors"** seç. Çalıştırıcılar her işten sonra sıfırlanır ve sunucuya erişemez.

## Ses kaynakları

Darbuka: pybuka (Maksim Koltsov, MIT). Bağlama/ney/zurna/davul tınıları: FluidR3 GM (Frank Wen) via gleitz/midi-js-soundfonts, **CC BY 3.0**. Bunlar enstrümanların kendisi değil, onlara en yakın gerçek akustik kayıtlar. Didgeridoo, ağız kopuzu, şaman defi ve hang sentezle üretilir. Klasik temalar kamu malıdır.
