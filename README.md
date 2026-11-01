# YDS Formu

YDS için günlük phrasal verb, edatlı kalıp ve cloze çalışması. Telefonda uygulama gibi çalışır, Claude hesabı gerektirmez, internet olmadan da açılır.

## GitHub Pages'te yayınlama

1. https://github.com adresinde ücretsiz bir hesap aç.
2. Sağ üstteki **+** düğmesi → **New repository**.
   - Repository name: `yds`
   - **Public** seçili kalsın.
   - **Create repository**'ye bas.
3. Açılan sayfada **uploading an existing file** bağlantısına bas.
4. Bu klasörün **içindeki her şeyi** (data klasörü dahil) sürükleyip sayfaya bırak.
5. Aşağıdaki **Commit changes** düğmesine bas.
6. Üstteki **Settings** → soldaki **Pages** →
   - Source: **Deploy from a branch**
   - Branch: **main**, klasör: **/ (root)** → **Save**
7. 1–2 dakika bekle. Uygulaman şu adreste açılır:
   `https://KULLANICI-ADIN.github.io/yds/`

## Telefona kurma

- **iPhone:** Adresi Safari'de aç → Paylaş → **Ana Ekrana Ekle**
- **Android:** Adresi Chrome'da aç → sağ üstteki ⋮ → **Ana ekrana ekle** (ya da **Uygulamayı yükle**)

## İlerleme

İlerlemen telefonun kendisinde saklanır. Telefon değiştirirken **Ayarlar → İlerleme yedeği** bölümündeki kodu kopyalayıp yeni telefonda **Yedeği geri yükle** alanına yapıştır.

## Güncelleme

Dosyalardan birini değiştirirsen `sw.js` içindeki `yds-v1` adını `yds-v2` yap ve dosyaları tekrar yükle. Böylece telefonlar yeni sürümü indirir.
