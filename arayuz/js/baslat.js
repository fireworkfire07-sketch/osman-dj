// ================= BAŞLAT =================
function bagla() {
  // giriş
  $('btnGiris').onclick = () => girisYap($('inKod').value.trim());
  $('inKod').onkeydown = e => { if (e.key === 'Enter') girisYap($('inKod').value.trim()); };
  // ana ekran
  $('btnYap').onclick = yap;
  $('inKaynak').onkeydown = e => { if (e.key === 'Enter') yap(); };
  $('btnYapistir').onclick = yapistir;
  $('inDosya').onchange = e => { const f = e.target.files[0]; e.target.value = ''; dosyaGonder(f); };
  $('isler').onclick = isEylem;
  $('liste').onclick = listeEylem;
  $('liste').onkeydown = e => { if (e.key === 'Enter') listeEylem(e); };
  $('btnAyar').onclick = ayarAc;
  $('btnEkleKapat').onclick = () => { $('ekleIpucu').classList.remove('on'); LS.set('ekleKapat', true); };
  ayarBagla();
  // alt sayfalar
  $('perde').onclick = sayfaKapat;
  document.querySelectorAll('[data-kapat]').forEach(b => b.addEventListener('click', sayfaKapat));
  document.querySelector('#shMenu .menuListe').onclick = menuEylem;
  $('btnSozBul').onclick = e => sozGonder({ baslik: $('inSozAd').value.trim(), sanatci: $('inSozSanatci').value.trim() }, e.currentTarget);
  $('btnSozYerlestir').onclick = e => {
    const m = $('inSozMetin').value.trim();
    if (m.split(/\n/).filter(x => x.trim()).length < 2) { $('sozMesaj').textContent = 'Sözleri alt alta, en az 2 satır olarak yapıştır.'; return; }
    sozGonder({ metin: m }, e.currentTarget);
  };
  $('btnPaylas').onclick = paylas;
  // sahne
  $('btnGeri').onclick = () => {
    if (SAHNE.kayit && !confirm('Kayıt yapılıyor. Çıkarsan kayıt silinir. Çıkılsın mı?')) return;
    sahneKapat();
  };
  $('btnSahneMenu').onclick = () => { if (SAHNE.bilgi) { if (SES.caliyor && !SAHNE.kayit) oynatDurdur(); menuAc(SAHNE.bilgi.id); } };
  $('btnBasla').onclick = basla;
  $('btnOynat').onclick = oynatDurdur;
  $('btnTekrar').onclick = basla;
  $('btnSonGeri').onclick = () => sahneKapat();
  $('btnGeri10').onclick = () => { sesGit(sesZaman() - 10); SAHNE.f = -10; kontrolleriGoster(); };
  $('btnIleri10').onclick = () => { sesGit(sesZaman() + 10); kontrolleriGoster(); };
  $('btnSarkici').onclick = () => {
    sarkiciAyarla((AYAR.sarkici + 1) % 3); butonlariGuncelle(); kontrolleriGoster();
    toast(['🗣️ Şarkıcının sesi kapalı — sahne senin!', '🗣️ Şarkıcı kısık sesle sana yardım ediyor', '🗣️ Şarkıcının sesi açık (orijinal şarkı)'][AYAR.sarkici]);
  };
  $('btnMik').onclick = mikDugme;
  $('btnErken').onclick = () => ayarDegistir(+0.2);
  $('btnGec').onclick = () => ayarDegistir(-0.2);
  $('btnKayit').onclick = kayitDugme;
  $('btnKayitDur').onclick = () => kayitBitir();
  const seek = $('seek');
  seek.addEventListener('input', () => { seekSurukleniyor = true; $('tSimdi').textContent = sure(seek.value / 1000 * (SES.sure || 0)); kontrolleriGoster(); });
  seek.addEventListener('change', () => { seekSurukleniyor = false; if (SAHNE.hazir) { sesGit(seek.value / 1000 * SES.sure); SAHNE.f = -10; } });
  cv.addEventListener('click', () => {
    if (!SAHNE.hazir || SAHNE.kayit) return;
    if ($('ekSahne').classList.contains('gizli')) kontrolleriGoster(); else if (SES.caliyor) kontrolleriGizle();
  });
  $('altBar').addEventListener('pointerdown', kontrolleriGoster);
  // klavye (bilgisayarda)
  document.addEventListener('keydown', e => {
    if (!$('ekSahne').classList.contains('on') || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); if (!$('baslaKatman').hidden && SAHNE.hazir) basla(); else oynatDurdur(); }
    else if (e.code === 'ArrowLeft') { sesGit(sesZaman() - 5); SAHNE.f = -10; }
    else if (e.code === 'ArrowRight') sesGit(sesZaman() + 5);
  });
  // geri tuşu / kaydırma hareketi
  window.addEventListener('popstate', () => {
    if (acikSayfa) { sayfaKapat(); if ($('ekSahne').classList.contains('on')) history.pushState({ sahne: 1 }, '', '#sahne'); return; }
    if ($('ekSahne').classList.contains('on')) sahneKapat(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { if ($('ekAna').classList.contains('on')) anaYenile(); if (SES.caliyor) wakeLockAl(); }
  });
  window.addEventListener('resize', () => { if ($('ekSahne').classList.contains('on')) boyutla(); });
}

function koduAl() {
  const m = /[#&]kod=([^&]+)/.exec(location.hash);
  if (m) history.replaceState(null, '', location.pathname);
  return m ? decodeURIComponent(m[1]) : null;
}
async function baslat() {
  bagla();
  ekleIpucu();
  const kod = koduAl();
  if (!kod && location.hash) history.replaceState(null, '', location.pathname);
  ekran('ekAna');
  window.addEventListener('hashchange', () => { const k = koduAl(); if (k) girisYap(k); });
  if (kod) { await girisYap(kod); return; }
  anaYenile();
  if (document.fonts && document.fonts.load) document.fonts.load(`600 80px Fredoka`).catch(() => { });
}
baslat();
