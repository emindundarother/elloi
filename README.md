# Elloi Kasa

Kafe ve küçük ölçekli yeme-içme işletmeleri için geliştirilmiş, **web tabanlı POS (Point of Sale) kasa uygulaması**. Kasiyer sipariş ekranı, gerçek zamanlı stok takibi, çoklu ödeme yöntemi desteği, gün sonu kapanış raporları ve tam kapsamlı admin portalı içerir.

---

## İçindekiler

- [1. Proje Genel Bakış](#1-proje-genel-bakış)
- [2. Amaç ve Kapsam](#2-amaç-ve-kapsam)
- [3. Özellikler](#3-özellikler)
- [4. Mimari](#4-mimari)
- [5. Teknoloji Yığını](#5-teknoloji-yığını)
- [6. Kurulum](#6-kurulum)
- [7. Kullanım](#7-kullanım)
- [8. Yapılandırma](#8-yapılandırma)
- [9. Deployment](#9-deployment)
- [10. Geliştirici Rehberi](#10-geliştirici-rehberi)
- [11. Veritabanı](#11-veritabanı)
- [12. Güvenlik](#12-güvenlik)
- [13. Sınırlamalar](#13-sınırlamalar)
- [14. Yol Haritası](#14-yol-haritası)

---

## 1. Proje Genel Bakış

### Ne Yapar

Elloi Kasa, kafe ortamında kasiyerlerin sipariş oluşturma, ödeme yönetimi, stok takibi ve gün sonu kapanış işlemlerini dijital ortamda yönetmesini sağlayan bir web uygulamasıdır. Uygulama iki temel kullanıcı rolü üzerinden çalışır: **Kasiyer** ve **Admin**.

### Çözdüğü Problem

Küçük ölçekli kafe işletmelerinde kâğıt tabanlı veya manuel kasa yönetiminin yarattığı sorunları ortadan kaldırır:

- **Sipariş karışıklığı:** Sıralı sipariş numaralandırma ve durumunu takip (açık → teslim edildi → iptal) ile siparişler kaybolmaz.
- **Stok tutarsızlığı:** Sipariş kaydedildiğinde stok otomatik düşer, iptal edildiğinde geri eklenir — transaction seviyesinde korunur.
- **Gün sonu hesap kontrolü:** Z raporu toplamı ile sistem cirosu otomatik karşılaştırılır; fark varsa uyarı üretilir.
- **Fiyat geçmişi kaybı:** Sipariş satırlarında ürün adı ve fiyat snapshot olarak saklanır; sonradan yapılan fiyat değişiklikleri eski siparişleri etkilemez.

### Neden Geliştirildi

Mevcut POS çözümlerinin lisans maliyeti, karmaşıklığı veya internet bağımlılığı küçük işletmeler için pragmatik değildir. Elloi Kasa, **sıfır lisans maliyeti**, **SQLite ile sunucusuz çalışabilme** ve **tek cihazda tam işlevsellik** sunarak bu boşluğu doldurur.

### Hedef Kullanıcı Kitlesi

| Rol | Profil |
|-----|--------|
| **Kasiyer** | Kafe çalışanı; sipariş alma, teslim etme, iptal etme işlemlerini hızlıca yapar. |
| **Admin** | İşletme sahibi veya yöneticisi; ürün/fiyat/stok yönetimi, raporlama, kullanıcı yönetimi, gün sonu kapanışı yapar. |

### Gerçek Kullanım Senaryoları

1. **Kasiyer sipariş akışı:** Kasiyer giriş yapar → Ana sayfada açık siparişleri görür → `+ Yeni Sipariş` ile ürün seçer → İçecek özelleştirmesi (boyut, süt tipi) yapar → Ödeme yöntemini seçer → Kaydeder. Stok otomatik düşer.
2. **Gün sonu kapanış:** Admin/Kasiyer → Gün sonu raporunu açar → Z raporu toplamını girer → Sistem cirosu ile karşılaştırılır → Fark varsa uyarı gösterilir → Rapor PDF/CSV olarak dışa aktarılır. Kapanış sonrası yeni sipariş açılması engellenir.
3. **Fiyat güncelleme:** Admin → Ürün yönetimine girer → Fiyatı düzenler → `Tüm Değişiklikleri Kaydet` ile onaylar. Mevcut açık siparişler etkilenmez (snapshot mekanizması).

---

## 2. Amaç ve Kapsam

### Kullanım Amacı

Tek şube, az sayıda kasiyer ile çalışan kafe/restoran operasyonlarının günlük kasa süreçlerini dijitalleştirmek.

### Hangi Durumlar İçin Tasarlanmıştır

- ✅ Tek şubeli kafe/restoran operasyonu
- ✅ 1–10 arası eşzamanlı kasiyer
- ✅ Tablet veya bilgisayar üzerinden kasa kullanımı
- ✅ Günlük ciro takibi ve Z raporu karşılaştırması
- ✅ Ürün menüsünün yöneticiler tarafından düzenlenmesi
- ✅ İçecek özelleştirmesi (boyut, süt tipi) ve dinamik fiyatlandırma

### Hangi Durumlar İçin Uygun Değildir

- ❌ Çok şubeli zincir operasyonları (merkezi raporlama yok)
- ❌ Donanım entegrasyonu (yazarkasa, barkod okuyucu, yazıcı)
- ❌ Online sipariş / müşteriye açık sipariş ekranı
- ❌ Envanter yönetimi (hammadde bazlı reçete takibi)
- ❌ Muhasebe / e-fatura entegrasyonu

### Uygulama Tipi

**Dahili araç (internal tool).** İşletme personeli tarafından lokal ağ veya bulut üzerinden kullanılmak üzere tasarlanmıştır. Doğrudan müşteriye açık bir arayüz içermez.

---

## 3. Özellikler

### Sipariş Yönetimi

| Özellik | Açıklama |
|---------|----------|
| Sipariş oluşturma | Ürün seçimi, adet, özelleştirme, ödeme yöntemi ve serbest not ile |
| Sipariş numaralandırma | `ELL-YYYYMMDD-NNN` formatında otomatik sıralı; çakışma durumunda 3 denemeye kadar retry |
| Sipariş durumu | `OPEN` → `DELIVERED` → `CANCELED` yaşam döngüsü |
| Sipariş iptali | Açık veya teslim edilmiş siparişler iptal edilebilir; stok otomatik geri eklenir |
| Sipariş silme | Rapor ekranından `Sil` aksiyonu; zorunlu onay diyaloğu ile |
| Snapshot mekanizması | Her sipariş satırında `productNameSnapshot` ve `unitPriceSnapshot` saklanır |

### İçecek Özelleştirmesi

| Özellik | Açıklama |
|---------|----------|
| Boyut | Küçük / Büyük — Büyük boyut +10₺ ek ücret |
| Süt tipi | Normal / Laktozsuz / Badem Sütü / Yulaf Sütü / Sütsüz — Bitkisel süt +40₺ |
| Ek ücret hesaplama | Hem UI'da canlı hem backend'de server-side doğrulama ile uygulanır |

### Stok Takibi

- Ürün bazlı `trackStock` açma/kapama
- Sipariş kaydında transaction içinde koşullu stok düşümü (`stockQty >= qty` guard)
- İptalde otomatik stok iadesi
- Admin panelinden stok düzeltmesi (delta + açıklama ile)
- `StockMovement` loglama: `SALE`, `CANCEL_REVERT`, `ADJUSTMENT`, `RESTOCK`

### Gün Sonu Kapanış

- Z raporu toplamı girilmeden kapanış yapılamaz
- Sistem cirosu ile Z raporu otomatik karşılaştırılır
- Fark varsa `gün sonu rakamları tutmuyor` uyarısı
- Kapanış sonrası yeni sipariş açılması otomatik engellenir (`/order/new` rotası dahil)
- DB kaydı + `logs/day-close.log` dosya logu birlikte tutulur
- Admin'e özel kapanış sıfırlama: DB kaydı + log satırı birlikte temizlenir

### Raporlama

- Günlük/tarih aralığı raporu: toplam ciro, sipariş sayısı, ödeme yöntemi kırılımı, ürün kırılımı
- Sipariş detay expand (satır bazlı ürünler)
- CSV dışa aktarma: `/api/reports/day.csv` ve `/api/reports/day-close.csv`
- PDF yazdırma desteği (`window.print()` ile)
- Kapanış raporunda: raporcu adı, oluşturulma tarihi/saati

### Admin Portalı

- **Ürün yönetimi:** Ad, kategori, alt kategori, fiyat (ana ücret + küsürat), stok takip durumu, aktif/pasif durumu
- **Toplu kaydetme:** Tüm değişiklikler tek `Tüm Değişiklikleri Kaydet` butonuyla; kaydedilmemiş değişiklikler için uyarı
- **Kullanıcı yönetimi:** Kullanıcı oluşturma (ad, şifre, rol), aktif/pasif yönetimi
- **Admin raporları:** Tarih aralığı seçimli detaylı raporlar

### Ödeme Yöntemleri

4 ödeme yöntemi desteklenir:

| Enum | Etiket |
|------|--------|
| `CASH` | Nakit |
| `CARD` | Kredi Kartı |
| `METROPOL` | Metropol Kart |
| `EDENRED` | Ticket Edenred |

### Ürün Kategorileri ve Alt Kategorileri

Ana kategoriler: `FOOD`, `DRINK`, `EXTRAS`

| Alt Kategori | Etiket | Üst Kategori |
|-------------|--------|--------------|
| `HOT_COFFEES` | Sıcak Kahveler | DRINK |
| `COLD_COFFEES` | Soğuk Kahveler | DRINK |
| `OTHER_HOT_DRINKS` | Diğer Sıcak İçecekler | DRINK |
| `TEAS` | Çaylar | DRINK |
| `COLD_TEAS` | Soğuk Çaylar | DRINK |
| `SOFT_DRINKS` | Soft İçecekler | DRINK |
| `SAVORIES` | Sandviçler / Tuzlular | FOOD |
| `DESSERTS` | Tatlılar | FOOD |
| `EXTRAS` | Ekstralar | EXTRAS |

Sipariş ekranında ürünler alt kategoriye göre accordion yapısıyla gruplanır.

### Edge-Case Yönetimi

- **Stok yarış koşulu:** Sadece UI kontrolü değil, transaction içinde `stockQty >= qty` koşullu update
- **Sipariş numarası çakışması:** `P2002` unique constraint hatası yakalanır, 3 denemeye kadar retry
- **Gün sonu sonrası sipariş engeli:** Dashboard'da buton inaktif + rota seviyesinde engel
- **Pasif ürün koruması:** Sipariş oluşturmada aktif olmayan ürünler reddedilir
- **Fiyat tutarsızlığı koruması:** Ek ücretler (boyut, süt tipi) hem frontend hem backend'de hesaplanır
- **Eski enum taşıma:** `TICKET` → `EDENRED` değişikliğinde mevcut kayıtlar SQL patch ile migrate edilir

---

## 4. Mimari

### Sistem Tasarımı

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App Router                │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Login   │  │  (protected) │  │  API Routes   │  │
│  │  Page    │  │   Layout     │  │  /api/reports  │  │
│  └──────────┘  │              │  │  ├─ day.csv    │  │
│                │  ┌─────────┐ │  │  └─ day-close  │  │
│                │  │Dashboard│ │  │      .csv      │  │
│                │  │Order    │ │  └───────────────┘  │
│                │  │Reports  │ │                      │
│                │  │Admin/*  │ │                      │
│                │  └─────────┘ │                      │
│                └──────────────┘                      │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │  Server Actions │                     │
│              │  (auth, orders, │                     │
│              │  admin, day-    │                     │
│              │  close)         │                     │
│              └────────┬────────┘                     │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │    src/lib/     │                     │
│              │  Business Logic │                     │
│              │  (orders, auth, │                     │
│              │  reports, time, │                     │
│              │  validators)    │                     │
│              └────────┬────────┘                     │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │  Prisma Client  │                     │
│              │  (better-sqlite3│                     │
│              │   adapter)      │                     │
│              └────────┬────────┘                     │
│                       │                              │
│              ┌────────┴────────┐                     │
│              │    SQLite DB    │                     │
│              │  prisma/dev.db  │                     │
│              └─────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### Katman Sorumlulukları

| Katman | Konum | Sorumluluk |
|--------|-------|------------|
| **UI (Server Components)** | `src/app/` | Sayfa render, layout, veri çekme |
| **UI (Client Components)** | `src/components/` | İnteraktif formlar, tablolar, state yönetimi |
| **Server Actions** | `src/app/actions/` | Mutation'lar: form submit, sipariş oluşturma/iptal, gün sonu kapanış |
| **İş Mantığı** | `src/lib/` | Sipariş oluşturma, stok yönetimi, rapor hesaplama, doğrulama şemaları |
| **Veri Erişimi** | `src/lib/db.ts` | Prisma client singleton yönetimi |
| **API Routes** | `src/app/api/` | CSV dışa aktarma endpoint'leri |

### Veri Akışı

1. **Sipariş oluşturma:** Client Component (form) → `createOrderAction` (Server Action) → `createOrder` (lib) → Prisma transaction (`$transaction`) → SQLite
2. **Rapor görüntüleme:** Server Component → `getReportByRange` (lib) → Prisma query → UI render
3. **CSV dışa aktarma:** Tarayıcı GET → API Route handler → `getReportByRange` → CSV response

### Önemli Mimari Kararlar

| Karar | Gerekçe |
|-------|---------|
| **SQLite (better-sqlite3)** | Sunucusuz deployment, sıfır yapılandırma, tek dosya yedekleme. Küçük işletme trafiği için yeterli. |
| **Idempotent SQL bootstrap** | Prisma 7 + Node 24 ortamında schema engine migration sorunları nedeniyle, `init.sql` + `patch.js` ile doğrudan tablo oluşturma. |
| **Server Actions (mutation)** | Client-server sınırında tip güvenliği, otomatik revalidation, framework-native yaklaşım. |
| **Snapshot alanları** | Sipariş satırlarında ürün adı/fiyat snapshot ile tarihsel doğruluk; fiyat değişikliklerinden bağımsız raporlama. |
| **Transaction içinde stok kontrolü** | Yarış koşullarında sadece UI kontrolü yeterli değil; DB seviyesinde koşullu güncelleme şart. |
| **Cihaz zaman dilimi** | Sabit `Europe/Istanbul` yerine `Intl.DateTimeFormat().resolvedOptions().timeZone` ile runtime zaman dilimi; farklı cihazlarda tutarlılık. |

---

## 5. Teknoloji Yığını

### Core

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **Next.js** | 16.1.6 | App Router, Server Components, Server Actions ile tek framework'te full-stack geliştirme |
| **React** | 19.2.3 | Server Components ve `useActionState` hook desteği |
| **TypeScript** | ^5 | Tip güvenliği, IDE otomatik tamamlama, derleme zamanı hata yakalama |

### Stil ve UI

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **Tailwind CSS** | ^4 | Utility-first CSS, hızlı prototipleme, tutarlı tasarım tokenleri |
| **Manrope** | Google Fonts | Modern, okunabilir UI fontu |
| **JetBrains Mono** | Google Fonts | Monospace font (fiyatlar, kodlar için) |

### Veritabanı ve ORM

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **Prisma** | ^7.4.0 | Tip güvenli ORM, schema-first yaklaşım, transaction desteği |
| **better-sqlite3** | ^12.6.2 | Sıfır yapılandırma, sunucusuz çalışma, tek dosya DB |
| **@prisma/adapter-better-sqlite3** | ^7.4.0 | Prisma'nın better-sqlite3 ile çalışması için driver adapter |

### Kimlik Doğrulama ve Güvenlik

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **jose** | ^6.1.3 | Edge-uyumlu JWT imzalama/doğrulama (Node.js crypto'ya bağımlı değil) |
| **bcryptjs** | ^3.0.3 | Şifre hash'leme (salt round: 10) |

### Doğrulama ve Yardımcılar

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **Zod** | ^4.3.6 | Runtime şema doğrulama, TypeScript tip çıkarımı |
| **date-fns** + **date-fns-tz** | ^4.1.0 / ^3.2.0 | Zaman dilimi duyarlı tarih formatlama ve dönüşüm |
| **clsx** | ^2.1.1 | Koşullu CSS sınıf birleştirme |

### Geliştirme Araçları

| Araç | Seçim Nedeni |
|------|-------------|
| **ESLint** | Kod kalitesi ve tutarlılık |
| **tsx** | TypeScript dosyalarını doğrudan çalıştırma (seed script) |
| **PostCSS** | Tailwind CSS derlemesi |

---

## 6. Kurulum

### Ön Gereksinimler

| Gereksinim | Minimum Versiyon | Not |
|-----------|-----------------|-----|
| **Node.js** | 20+ | Node 24 ile test edilmiştir |
| **npm** | 10+ | `package-lock.json` ile tutarlı bağımlılıklar |
| **sqlite3** | 3.x | CLI komutları `db:migrate` script'inde kullanılır |

### Adım Adım Kurulum

```bash
# 1. Projeyi klonla
git clone <repo-url> elloi-kasa
cd elloi-kasa

# 2. Bağımlılıkları kur
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenleyerek SESSION_SECRET değerini değiştir

# 4. Veritabanını oluştur ve şemayı uygula
npm run db:migrate

# 5. Örnek veriyi yükle (ürünler + kullanıcılar)
npm run db:seed

# 6. Geliştirme sunucusunu başlat
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

### Demo Hesaplar

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| `admin` | `113521` | Admin |
| `deniz` | `123689` | Admin |
| `ecrin` | `1024` | Kasiyer |
| `nurseli` | `9854` | Kasiyer |
| `enes` | `1905` | Kasiyer |

---

## 7. Kullanım

### Uygulama Nasıl Çalıştırılır

```bash
# Geliştirme modu (hot reload)
npm run dev

# Production build
npm run build
npm run start
```

### Route Haritası

| Route | Açıklama | Erişim |
|-------|----------|--------|
| `/login` | Giriş sayfası | Herkese açık |
| `/` | Ana sayfa — açık siparişler, günün geçmiş siparişleri, yeni sipariş butonu | Kasiyer, Admin |
| `/order/new` | Yeni sipariş oluşturma | Kasiyer, Admin |
| `/reports/day` | Günlük rapor ve gün sonu kapanış | Kasiyer, Admin |
| `/reports/close` | Gün sonu kapanış raporu detayı | Kasiyer, Admin |
| `/admin/products` | Ürün yönetimi (ekleme, düzenleme, fiyat, stok) | Sadece Admin |
| `/admin/reports` | Admin detaylı raporlar | Sadece Admin |
| `/admin/users` | Kullanıcı yönetimi | Sadece Admin |

### API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/reports/day.csv` | `GET` | Günlük sipariş raporunu CSV olarak indirir |
| `/api/reports/day-close.csv` | `GET` | Gün sonu kapanış raporunu CSV olarak indirir |

### Örnek Kullanım Akışları

**Sipariş Oluşturma:**
1. Giriş yap → Ana sayfada `+ Yeni Sipariş` butonuna tıkla
2. Alt kategori başlıklarına tıklayarak ürün listesini aç (accordion yapısı)
3. Ürün seçiminde içecek ise: boyut (Küçük/Büyük) ve süt tipi seç
4. Ödeme yöntemini seç (Nakit, Kredi Kartı, Metropol Kart, Ticket Edenred)
5. İsterseniz sipariş notu ekle
6. `Kaydet` → Ana sayfaya yönlendirilir, sipariş açık siparişler tablosunda görünür

**Gün Sonu Kapanış:**
1. `Özet` menüsünden gün sonu raporuna git
2. `Günü Sonlandır` butonuna tıkla
3. Açılan modalda günlük ciroyu gör, Z Raporu Toplamını gir
4. `Raporu Oluştur` → Fark analizi yapılır + log kaydı oluşur
5. Kapanış sonrası yeni sipariş açılamaz hale gelir

---

## 8. Yapılandırma

### Environment Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
|----------|---------|-----------|----------|
| `DATABASE_URL` | ✅ | — | SQLite veritabanı dosya yolu. Format: `file:./prisma/dev.db` |
| `SESSION_SECRET` | ✅ | — | JWT imzalama anahtarı. **En az 32 karakter** uzunluğunda rastgele string olmalı. |
| `NODE_ENV` | ❌ | `development` | `development`: Prisma warn+error log, HTTP cookie secure=false. `production`: Sadece error log, cookie secure=true. |

### Uygulama Sabitleri

Aşağıdaki değerler `src/lib/constants.ts` dosyasında tanımlıdır ve kod değişikliği gerektirir:

| Sabit | Değer | Açıklama |
|-------|-------|----------|
| `APP_NAME` | `"Elloi Kasa"` | UI'da gösterilen uygulama adı |
| `SESSION_COOKIE_NAME` | `"elloi_session"` | Session cookie adı |
| `DRINK_LARGE_SIZE_EXTRA` | `10` | Büyük boy içecek ek ücreti (₺) |
| `DRINK_PLANT_BASED_MILK_EXTRA` | `40` | Bitkisel süt ek ücreti (₺) |

### Deployment Notları

- `SESSION_SECRET` production'da mutlaka güçlü, rastgele bir değer olmalıdır.
- SQLite dosyası (`prisma/dev.db`) `.gitignore`'da listelenmiştir; her ortam kendi DB'sini oluşturmalıdır.
- `logs/` dizini de `.gitignore`'dadır; gün sonu logları her ortamda ayrı tutulur.

---

## 9. Deployment

### Production Build

```bash
npm run build    # Next.js production build
npm run start    # Production sunucusu başlat (varsayılan: port 3000)
```

### Self-Hosted (VPS / Dedicated Server)

1. Sunucuda Node.js 20+ ve sqlite3 kurulu olduğundan emin ol.
2. Projeyi sunucuya klonla veya kopyala.
3. `.env` dosyasını oluştur:
   ```
   DATABASE_URL="file:./prisma/dev.db"
   SESSION_SECRET="<en-az-32-karakter-rastgele-deger>"
   ```
4. Kurulum:
   ```bash
   npm ci --production
   npm run db:migrate
   npm run db:seed    # Sadece ilk kurulumda
   npm run build
   npm run start
   ```
5. Process manager (PM2, systemd) ile uygulamayı arka planda çalıştır.

### Vercel + Hosting Önerileri

> **Not:** SQLite dosya tabanlıdır ve serverless ortamlarda (Vercel, AWS Lambda) kalıcı dosya sistemi olmadığı için **doğrudan uygun değildir**. Vercel'e deploy etmek istiyorsanız aşağıdaki seçenekleri değerlendirin:

**Seçenek 1: Turso (LibSQL)**
- SQLite uyumlu, edge-ready veritabanı servisi
- Prisma'nın `@prisma/adapter-libsql` adapter'ı ile çalışır

**Seçenek 2: VPS Deployment**
- DigitalOcean, Hetzner veya benzeri VPS sağlayıcılarda Node.js sunucu
- SQLite doğrudan dosya sisteminde çalışır

**Seçenek 3 (Mevcut README'deki yöntem — dikkatli kullanılmalı):**
1. Neon'da PostgreSQL projesi aç → `DATABASE_URL` al
2. Vercel'de repo'yu import et
3. Environment Variables: `DATABASE_URL`, `SESSION_SECRET`
4. Lokalden schema + seed gönder:
   ```bash
   DATABASE_URL="NEON_URL" npm run db:setup
   ```

> **Uyarı:** Bu yöntem Prisma adapter'ının `better-sqlite3`'ten PostgreSQL adapter'ına değiştirilmesini gerektirir.

---

## 10. Geliştirici Rehberi

### Klasör Yapısı

```
elloi-kasa/
├── prisma/
│   ├── schema.prisma        # Veri modeli tanımı
│   ├── init.sql              # Idempotent tablo oluşturma SQL'i
│   ├── patch.js              # Mevcut DB'ye kolon ekleme script'i
│   ├── seed.ts               # Demo veri yükleme script'i
│   └── dev.db                # SQLite veritabanı dosyası (gitignored)
├── prisma.config.ts          # Prisma yapılandırma
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout (font, metadata, HTML shell)
│   │   ├── globals.css       # Global stiller
│   │   ├── login/            # Giriş sayfası
│   │   ├── (protected)/      # Auth gerektiren route group
│   │   │   ├── layout.tsx    # Header, navigasyon, session kontrolü
│   │   │   ├── page.tsx      # Ana sayfa (dashboard)
│   │   │   ├── order/new/    # Yeni sipariş sayfası
│   │   │   ├── reports/      # Raporlama sayfaları
│   │   │   │   ├── day/      # Günlük rapor
│   │   │   │   └── close/    # Gün sonu kapanış raporu
│   │   │   └── admin/        # Admin sayfaları
│   │   │       ├── products/ # Ürün yönetimi
│   │   │       ├── reports/  # Admin raporları
│   │   │       └── users/    # Kullanıcı yönetimi
│   │   ├── actions/          # Server Actions (mutation'lar)
│   │   │   ├── auth.ts       # Login / Logout
│   │   │   ├── orders.ts     # Sipariş CRUD
│   │   │   ├── admin.ts      # Ürün / kullanıcı yönetimi
│   │   │   └── day-close.ts  # Gün sonu kapanış / sıfırlama
│   │   └── api/
│   │       └── reports/      # CSV export route handler'ları
│   ├── components/           # Client Components
│   │   ├── order-create-form.tsx       # Sipariş oluşturma formu
│   │   ├── admin-products-table.tsx    # Ürün yönetim tablosu
│   │   ├── admin-product-create-form.tsx # Yeni ürün formu
│   │   ├── admin-user-create-form.tsx  # Yeni kullanıcı formu
│   │   ├── day-close-form.tsx          # Gün sonu kapanış formu/modal
│   │   ├── report-view.tsx             # Rapor görüntüleme bileşeni
│   │   ├── confirm-submit-button.tsx   # Onaylı submit butonu
│   │   ├── fullscreen-toggle.tsx       # Tam ekran geçişi
│   │   └── print-button.tsx            # Yazdırma butonu
│   └── lib/                  # Paylaşılan iş mantığı
│       ├── auth.ts           # Session oluşturma, doğrulama, JWT
│       ├── db.ts             # Prisma client singleton
│       ├── constants.ts      # Uygulama sabitleri, etiketler
│       ├── orders.ts         # Sipariş CRUD iş mantığı
│       ├── reports.ts        # Rapor hesaplama
│       ├── validators.ts     # Zod doğrulama şemaları
│       ├── time.ts           # Zaman dilimi yardımcıları
│       ├── format.ts         # Para/tarih formatlama
│       └── product-subcategory.ts # Alt kategori tanım ve inference
├── public/                   # Statik dosyalar (favicon, SVG'ler)
├── logs/                     # Gün sonu kapanış logları (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── LESSONS.md                # Geliştirme sürecinde öğrenilen dersler
```

### Kodlama Standartları

- **TypeScript strict mode** aktif (`"strict": true`)
- **Zod ile runtime doğrulama:** Tüm form girdileri ve mutation parametreleri Zod şemaları ile doğrulanır
- **Server Actions kullanımı:** Mutation'lar için `"use server"` direktifi; try/catch ile hata yakalama, error state dönüşü
- **Transaction kullanımı:** Stok değişikliği içeren tüm operasyonlar `prisma.$transaction()` içinde yapılır
- **Türkçe hata mesajları:** Kullanıcıya gösterilen tüm hata mesajları Türkçe
- **İsimlendirme:** Dosya adları kebab-case, bileşen adları PascalCase, değişkenler camelCase

### Katkı Süreci

1. Feature branch oluştur: `git checkout -b feature/yeni-ozellik`
2. Değişiklikleri yap ve lint kontrolü çalıştır: `npm run lint`
3. Build'in geçtiğinden emin ol: `npm run build`
4. Commit ve push: `git push origin feature/yeni-ozellik`
5. Pull request aç

### Yeni Bir Model/Kolon Ekleme

Prisma 7 + SQLite ortamında migration akışı sorunlu olabileceğinden, projenin izlediği yaklaşım:

1. `prisma/schema.prisma` dosyasına modeli/kolonu ekle
2. `prisma/init.sql` dosyasına karşılık gelen `CREATE TABLE IF NOT EXISTS` veya `ALTER TABLE` komutunu ekle
3. Gerekirse `prisma/patch.js` dosyasına `hasColumn` kontrolü ile koşullu `ALTER TABLE` ekle
4. `npm run db:migrate` çalıştır (SQL çalıştırır + Prisma client üretir)

---

## 11. Veritabanı

### Şema Genel Görünüm

```
┌──────────┐       ┌───────────┐       ┌────────────┐
│   User   │──1:N──│   Order   │──1:N──│ OrderItem  │
│          │       │           │       │            │
│ id       │       │ id        │       │ id         │
│ username │       │ orderNo   │       │ orderId    │
│ password │       │ status    │       │ productId  │
│  Hash    │       │ payment   │       │ productName│
│ role     │       │  Method   │       │  Snapshot  │
│ isActive │       │ totalAmt  │       │ unitPrice  │
│          │       │ note      │       │  Snapshot  │
│          │       │ createdAt │       │ qty        │
│          │       │ delivered │       │ modifier   │
│          │       │  At       │       │  Text      │
│          │       │ canceledAt│       │ lineTotal  │
│          │       │ createdBy │       │            │
│          │       │  Id       │       │            │
└──────────┘       └───────────┘       └────────────┘
     │                   │
     │              ┌────┴─────┐
     │              │  Stock   │
     ├──────1:N─────│ Movement │
     │              │          │
     │              │ productId│
     │              │ type     │
     │              │ qtyDelta │
     │              │ reason   │
     │              │ orderId  │
     │              └──────────┘
     │
     │         ┌────────────┐
     └──1:N────│ DayClosure │
               │            │
               │ day (uniq) │
               │ zReport    │
               │  Total     │
               │ systemTotal│
               │ difference │
               │ hasMismatch│
               │ totalOrders│
               │ totalItems │
               └────────────┘

┌──────────┐
│ Product  │
│          │
│ id       │
│ name     │
│ category │
│ sub      │
│  Category│
│ basePrice│
│ stockQty │
│ trackStk │
│ isActive │
│ softDel  │
│  etedAt  │
└──────────┘
```

### Model Detayları

| Model | Kayıt Sayısı (tahmini) | Açıklama |
|-------|----------------------|----------|
| **User** | 5-10 | Kullanıcılar (kasiyer + admin) |
| **Product** | 50-100 | Menü ürünleri |
| **Order** | Günlük ~50-200 | Siparişler |
| **OrderItem** | Sipariş başına ~1-5 | Sipariş kalemleri |
| **StockMovement** | Sipariş bağımlı | Stok hareket logu |
| **DayClosure** | Günlük 1 | Gün sonu kapanış kaydı |

### Enum Değerleri

| Enum | Değerler |
|------|----------|
| `UserRole` | `CASHIER`, `ADMIN` |
| `OrderStatus` | `OPEN`, `DELIVERED`, `CANCELED` |
| `PaymentMethod` | `CASH`, `CARD`, `METROPOL`, `EDENRED` |
| `ProductCategory` | `FOOD`, `DRINK`, `EXTRAS` |
| `StockMovementType` | `SALE`, `ADJUSTMENT`, `RESTOCK`, `CANCEL_REVERT` |

### İndeksler

| Tablo | İndeks | Tip |
|-------|--------|-----|
| `User` | `username` | Unique |
| `Product` | `isActive` | Filtreleme |
| `Order` | `orderNo` | Unique |
| `Order` | `status` | Filtreleme |
| `Order` | `createdAt` | Sıralama / tarih aralığı sorgusu |
| `OrderItem` | `orderId` | Foreign key join |
| `OrderItem` | `productId` | Foreign key join |
| `StockMovement` | `productId`, `orderId`, `createdAt` | Filtreleme / sıralama |
| `DayClosure` | `day` | Unique |

### Migration Stratejisi

Proje, Prisma'nın standart migration akışı (`prisma migrate`) yerine **idempotent SQL bootstrap** yaklaşımı kullanır:

1. **`prisma/init.sql`:** `CREATE TABLE IF NOT EXISTS` ve `CREATE INDEX IF NOT EXISTS` komutları ile tüm tabloları ve indeksleri oluşturur. Birden fazla çalıştırılabilir.
2. **`prisma/patch.js`:** Mevcut veritabanına yeni kolon eklemek için `PRAGMA table_info` ile kolon varlığını kontrol eder, yoksa `ALTER TABLE ... ADD COLUMN` çalıştırır.
3. **`npm run db:migrate`:** `sqlite3 prisma/dev.db < prisma/init.sql && node prisma/patch.js && prisma generate`

**Bu yaklaşımın nedeni:** Prisma 7 + Node 24 ortamında schema engine migration akışı zaman zaman sorun çıkarabilmektedir. Idempotent SQL yaklaşımı uygulamayı bloklamamayı garanti eder.

### Veri Bütünlüğü Kuralları

- **Foreign key constraint'ler** tüm ilişkilerde aktif (`PRAGMA foreign_keys = ON`)
- **Cascade delete:** `Order` silindiğinde `OrderItem` kayıtları da silinir
- **Restrict delete:** `User` silinirse ilişkili `Order` kayıtları engeller
- **Soft delete:** Ürünler `softDeletedAt` alanı ile pasife çekilir; geçmiş sipariş ilişkileri korunur
- **Unique constraint:** `Order.orderNo`, `User.username`, `DayClosure.day`
- **Snapshot bütünlüğü:** `OrderItem.productNameSnapshot` ve `unitPriceSnapshot` oluşturma anında set edilir, sonradan değişmez

---

## 12. Güvenlik

### Kimlik Doğrulama

- **Cookie tabanlı JWT session:** `jose` kütüphanesi ile HS256 imzalı JWT token
- **HTTP-only cookie:** XSS saldırılarına karşı JavaScript'ten erişilemez
- **Secure cookie:** Production'da (`NODE_ENV=production`) sadece HTTPS üzerinden gönderilir
- **SameSite=Lax:** CSRF koruması
- **12 saat TTL:** Session otomatik olarak 12 saat sonra sona erer
- **Şifre hash'leme:** bcryptjs ile salt round 10

### Yetkilendirme

- **Rol tabanlı erişim:** `CASHIER` ve `ADMIN` rolleri
- **`requireSession()` guard:** Korumalı route'larda session kontrolü; oturum yoksa `/login`'e yönlendirir
- **`requireSession("ADMIN")` guard:** Admin-only operasyonlarda (kullanıcı yönetimi, gün sonu sıfırlama) ek rol kontrolü
- **Route group (`(protected)`):** Tüm korumalı sayfalar single layout altında session kontrolüne sahip

### Veri Doğrulama

- Tüm kullanıcı girdileri **Zod şemaları** ile server-side doğrulanır
- Kullanıcı adı: `^[a-zA-Z0-9._-]+$` regex kontrolü
- Şifre: minimum 4 karakter
- Ürün fiyatı: pozitif sayı kontrolü
- Sipariş: en az 1 ürün, pozitif adet kontrolü

### Güvenli Dağıtım Pratikleri

- `.env` dosyaları `.gitignore`'da — secret'lar repoya girmez
- `SESSION_SECRET` minimum 32 karakter zorunluluğu — kısa secret ile uygulama başlamaz (`getSessionSecret()` guard)
- Veritabanı dosyası (`prisma/dev.db`) `.gitignore`'da — hassas veri repoya dahil olmaz

---

## 13. Sınırlamalar

### Bilinen Kısıtlar

| Kısıt | Açıklama |
|-------|----------|
| **Tek şube** | Çok şubeli yapı ve merkezi raporlama desteklenmez |
| **SQLite eşzamanlılık** | SQLite yazma işlemlerinde tablo kilidi oluşur; yüksek eşzamanlılıkta darboğaz olabilir |
| **Serverless uyumsuzluk** | SQLite dosya tabanlıdır; Vercel/Lambda gibi ortamlarda kalıcı depolama yoktur |
| **Donanım entegrasyonu yok** | Yazarkasa, barkod okuyucu, fiş yazıcısı desteği yok |
| **Çevrimdışı çalışma yok** | PWA veya offline-first mimari yok |
| **Test coverage** | Otomatik test suite (unit/integration) henüz eklenmemiş |

### Teknik Trade-Off'lar

| Trade-Off | Açıklama |
|-----------|----------|
| **SQLite vs PostgreSQL** | Sıfır yapılandırma ve basitlik için SQLite tercih edildi; ölçeklenebilirlik ve eşzamanlılık PostgreSQL'e göre sınırlı |
| **Idempotent SQL vs Prisma Migrate** | Prisma 7 + Node 24 sorunlarını aşmak için SQL bootstrap; ancak migration geçmişi ve rollback otomasyonu kaybedildi |
| **Snapshot vs Normalize** | Sipariş satırlarında fiyat/ad snapshot ile tarihsel doğruluk; ancak disk kullanımı artar |
| **Server Actions vs API Routes** | Mutation'lar için Server Actions tercih edildi; REST API tüketicileri için ayrı bir API katmanı yok |

### İyileştirme Alanları

- Otomatik test suite (unit test, integration test)
- Erişilebilirlik (a11y) denetimi ve iyileştirmeleri
- Form alanlarında daha granüler hata mesajları ve alan bazlı gösterim
- Rate limiting ve brute-force koruması
- Görselli ürün kataloğu (ürün fotoğrafları)
- Performans optimizasyonu: büyük rapor sorgularında pagination

---

## 14. Yol Haritası

### Kısa Vadeli

- [ ] Otomatik test suite — unit test (lib fonksiyonları) ve integration test (Server Actions)
- [ ] Admin panelinde sipariş geçmiş filtreleme ve arama
- [ ] Ürünlere görsel ekleme desteği
- [ ] Fiş yazıcısı entegrasyonu (ESC/POS)
- [ ] Kullanıcı bazlı performans raporu

### Orta Vadeli

- [ ] PWA desteği — çevrimdışı sipariş kuyruklaması
- [ ] Haftalık/aylık trend raporları ve grafik gösterimleri
- [ ] Çoklu dil desteği (i18n)
- [ ] Müşteri sadakat sistemi (puan/kart)
- [ ] Veritabanını PostgreSQL'e taşıma (Turso/LibSQL alternatifi)

### Uzun Vadeli

- [ ] Çok şubeli yapı ve merkezi yönetim paneli
- [ ] Online sipariş entegrasyonu (Getir, Yemeksepeti vb.)
- [ ] Stok tahminleme ve otomatik sipariş önerisi
- [ ] Muhasebe / e-fatura entegrasyonu
- [ ] Mobil native uygulama (React Native)

---

## Komut Referansı

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusunu başlatır (hot reload) |
| `npm run build` | Production build oluşturur |
| `npm run start` | Production sunucusunu başlatır |
| `npm run lint` | ESLint ile kod kontrolü çalıştırır |
| `npm run db:generate` | Prisma client'ı yeniden üretir |
| `npm run db:migrate` | SQLite şemasını oluşturur + patch uygular + Prisma client üretir |
| `npm run db:reset` | Veritabanını siler ve sıfırdan oluşturur |
| `npm run db:seed` | Demo kullanıcı ve ürün verisi yükler |

---

## Lisans

Bu proje özel kullanım amaçlıdır.
