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

- **Sipariş karışıklığı:** Sıralı sipariş numaralandırma ve durum takibi (açık → teslim edildi → iptal) ile siparişler kaybolmaz.
- **Stok tutarsızlığı:** Sipariş kaydedildiğinde stok otomatik düşer, iptal edildiğinde geri eklenir — transaction seviyesinde korunur.
- **Gün sonu hesap kontrolü:** Z raporu toplamı ile sistem cirosu otomatik karşılaştırılır; fark varsa uyarı üretilir.
- **Fiyat geçmişi kaybı:** Sipariş satırlarında ürün adı ve fiyat snapshot olarak saklanır; sonradan yapılan fiyat değişiklikleri eski siparişleri etkilemez.

### Hedef Kullanıcı Kitlesi

| Rol | Profil |
|-----|--------|
| **Kasiyer** | Kafe çalışanı; sipariş alma, teslim etme, iptal etme işlemlerini hızlıca yapar. |
| **Admin** | İşletme sahibi veya yöneticisi; ürün/fiyat/stok yönetimi, raporlama, kullanıcı yönetimi, gün sonu kapanışı yapar. |

---

## 2. Amaç ve Kapsam

### Hangi Durumlar İçin Tasarlanmıştır

- ✅ Tek şubeli kafe/restoran operasyonu
- ✅ 1–10 arası eşzamanlı kasiyer
- ✅ Tablet veya bilgisayar üzerinden kasa kullanımı
- ✅ Günlük ciro takibi ve Z raporu karşılaştırması
- ✅ İçecek özelleştirmesi (boyut, süt tipi) ve dinamik fiyatlandırma

### Hangi Durumlar İçin Uygun Değildir

- ❌ Çok şubeli zincir operasyonları (merkezi raporlama yok)
- ❌ Donanım entegrasyonu (yazarkasa, barkod okuyucu, yazıcı)
- ❌ Online sipariş / müşteriye açık sipariş ekranı
- ❌ Envanter yönetimi (hammadde bazlı reçete takibi)
- ❌ Muhasebe / e-fatura entegrasyonu

---

## 3. Özellikler

### Sipariş Yönetimi

| Özellik | Açıklama |
|---------|----------|
| Sipariş oluşturma | Ürün seçimi, adet, özelleştirme, ödeme yöntemi ve serbest not ile |
| Sipariş numaralandırma | `ELL-YYYYMMDD-NNN` formatında otomatik sıralı; çakışma durumunda retry |
| Sipariş durumu | `OPEN` → `DELIVERED` → `CANCELED` yaşam döngüsü |
| Sipariş iptali | Açık veya teslim edilmiş siparişler iptal edilebilir; stok otomatik geri eklenir |
| Snapshot mekanizması | Her sipariş satırında `productNameSnapshot` ve `unitPriceSnapshot` saklanır |

### İçecek Özelleştirmesi

| Özellik | Açıklama |
|---------|----------|
| Boyut | Küçük / Büyük — Büyük boyut ek ücretli |
| Süt tipi | Normal / Laktozsuz / Badem Sütü / Yulaf Sütü / Sütsüz — Bitkisel süt ek ücretli |
| Ek ücret hesaplama | Hem UI'da canlı hem backend'de server-side doğrulama ile uygulanır |

### Stok Takibi

- Ürün bazlı `trackStock` açma/kapama
- Sipariş kaydında transaction içinde koşullu stok düşümü (`stockQty >= qty` guard)
- İptalde otomatik stok iadesi
- Admin panelinden stok düzeltmesi (delta + açıklama ile)
- `StockMovement` loglama: `SALE`, `CANCEL_REVERT`, `ADJUSTMENT`, `RESTOCK`

### Gün Sonu Kapanış

- Z raporu toplamı girilmeden kapanış yapılamaz
- Açık siparişler varken gün kapatılamaz — tüm siparişler teslim/iptal edilmelidir
- Sistem cirosu ile Z raporu otomatik karşılaştırılır
- Kapanış sonrası yeni sipariş açılması otomatik engellenir
- DB kaydı + dosya logu birlikte tutulur

### Raporlama

- Günlük rapor: toplam ciro, sipariş sayısı, ödeme yöntemi kırılımı, ürün kırılımı
- CSV dışa aktarma
- PDF yazdırma desteği

### Admin Portalı

- **Ürün yönetimi:** Ad, kategori, alt kategori, fiyat, stok takip durumu, aktif/pasif
- **Toplu kaydetme:** Tüm değişiklikler tek butonla
- **Kullanıcı yönetimi:** Kullanıcı oluşturma (ad, şifre, rol), aktif/pasif yönetimi
- **Admin raporları:** Tarih aralığı seçimli detaylı raporlar

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
│              ┌───────────────────┐                   │
│              │   Middleware.ts   │                   │
│              │  (Edge Route      │                   │
│              │   Protection)     │                   │
│              └────────┬──────────┘                   │
│              ┌────────┴────────┐                     │
│              │  Server Actions │                     │
│              │  (auth, orders, │                     │
│              │  admin, day-    │                     │
│              │  close)         │                     │
│              └────────┬────────┘                     │
│              ┌────────┴────────┐                     │
│              │    src/lib/     │                     │
│              │  Business Logic │                     │
│              └────────┬────────┘                     │
│              ┌────────┴────────┐                     │
│              │  Prisma Client  │                     │
│              │   (pg adapter)  │                     │
│              └────────┬────────┘                     │
│              ┌────────┴────────┐                     │
│              │ PostgreSQL (DB) │                     │
│              │   Railway       │                     │
│              └─────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

### Katman Sorumlulukları

| Katman | Konum | Sorumluluk |
|--------|-------|------------|
| **Edge Middleware** | `src/middleware.ts` | Tüm route'larda cookie kontrolü, auth redirect |
| **UI (Server Components)** | `src/app/` | Sayfa render, layout, veri çekme |
| **UI (Client Components)** | `src/components/` | İnteraktif formlar, tablolar, state yönetimi |
| **Server Actions** | `src/app/actions/` | Mutation'lar: form submit, sipariş oluşturma/iptal |
| **İş Mantığı** | `src/lib/` | Sipariş oluşturma, stok yönetimi, doğrulama, rate limiting |
| **Veri Erişimi** | `src/lib/db.ts` | Prisma client singleton |
| **API Routes** | `src/app/api/` | CSV dışa aktarma endpoint'leri |

### Veri Akışı

1. **Request:** Tarayıcı → **Middleware** (cookie kontrolü) → Server Component / Server Action
2. **Sipariş oluşturma:** Client Component (form) → `createOrderAction` → `createOrder` → Prisma `$transaction` → PostgreSQL
3. **Rapor:** Server Component → `getReportByRange` → Prisma query → UI render

---

## 5. Teknoloji Yığını

### Core

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **Next.js** | 16 | App Router, Server Components, Server Actions |
| **React** | 19 | Server Components ve `useActionState` hook |
| **TypeScript** | 5 | Tip güvenliği, derleme zamanı hata yakalama |

### Veritabanı ve ORM

| Teknoloji | Versiyon | Seçim Nedeni |
|-----------|----------|-------------|
| **PostgreSQL** | 14+ | ACID uyumlu, yüksek eşzamanlılık |
| **Prisma** | 7 | Tip güvenli ORM, schema-first, transaction desteği |

### Kimlik Doğrulama ve Güvenlik

| Teknoloji | Seçim Nedeni |
|-----------|-------------|
| **jose** | Edge-uyumlu JWT imzalama/doğrulama |
| **bcryptjs** | Şifre hash'leme (salt round: 10) |
| **Zod** | Runtime şema doğrulama |

### Stil

| Teknoloji | Seçim Nedeni |
|-----------|-------------|
| **Tailwind CSS** | Utility-first CSS, hızlı prototipleme |
| **Manrope + JetBrains Mono** | Modern UI ve monospace fontlar |

---

## 6. Kurulum

### Ön Gereksinimler

| Gereksinim | Minimum Versiyon |
|-----------|-----------------|
| **Node.js** | 20+ |
| **npm** | 10+ |
| **PostgreSQL** | 14+ |

### Adım Adım Kurulum

```bash
# 1. Projeyi klonla
git clone <repo-url> elloi-kasa
cd elloi-kasa

# 2. Bağımlılıkları kur
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle — aşağıdaki "Yapılandırma" bölümüne bak
```

### Ortam Değişkenlerini Yapılandır

`.env` dosyasında şu değişkenleri tanımla:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db>"
SESSION_SECRET="<en-az-32-karakter-rastgele-string>"
```

> **SESSION_SECRET üretmek için:**
> ```bash
> openssl rand -base64 48
> ```

### Veritabanını Hazırla

```bash
# Şemayı uygula
npm run db:migrate

# Kullanıcı ve ürün verisi yükle
npm run db:seed
```

### Kullanıcı Seed Yapılandırması

Seed script'i kullanıcı bilgilerini `SEED_USERS_JSON` ortam değişkeninden okur:

```env
SEED_USERS_JSON='[{"username":"admin","password":"güçlü-şifre-buraya","role":"ADMIN"},{"username":"kasiyer1","password":"güçlü-şifre","role":"CASHIER"}]'
```

> ⚠️ **Dikkat:** Production ortamında `SEED_USERS_JSON` tanımlı olmalıdır. Tanımlı değilse seed başarısız olur.

### Geliştirme Sunucusu

```bash
npm run dev
# http://localhost:3000
```

---

## 7. Kullanım

### Route Haritası

| Route | Açıklama | Erişim |
|-------|----------|--------|
| `/login` | Giriş sayfası | Herkese açık |
| `/` | Ana sayfa — açık siparişler, günün geçmiş siparişleri | Kasiyer, Admin |
| `/order/new` | Yeni sipariş oluşturma | Kasiyer, Admin |
| `/reports/day` | Günlük rapor ve gün sonu kapanış | Kasiyer, Admin |
| `/reports/close` | Gün sonu kapanış raporu detayı | Kasiyer, Admin |
| `/admin/products` | Ürün yönetimi | Sadece Admin |
| `/admin/reports` | Admin detaylı raporlar | Sadece Admin |
| `/admin/users` | Kullanıcı yönetimi | Sadece Admin |

### API Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/reports/day.csv` | `GET` | Günlük sipariş raporunu CSV olarak indirir |
| `/api/reports/day-close.csv` | `GET` | Gün sonu kapanış raporunu CSV olarak indirir |

### Örnek Kullanım Akışları

**Sipariş Oluşturma:**
1. Giriş yap → `+ Yeni Sipariş` butonuna tıkla
2. Alt kategori başlığına dokunarak ürün listesini aç
3. İçecek ise: boyut ve süt tipi seç
4. Ödeme yöntemini seç
5. `Siparişi Kaydet` → Ana sayfaya yönlendirilir

**Gün Sonu Kapanış:**
1. Raporlar → Gün sonu raporuna git
2. Z Raporu Toplamını gir
3. `Günü Sonlandır` → Fark analizi yapılır
4. Kapanış sonrası yeni sipariş açılamaz

---

## 8. Yapılandırma

### Environment Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `DATABASE_URL` | ✅ | PostgreSQL bağlantı URL'i |
| `SESSION_SECRET` | ✅ | JWT imzalama anahtarı. **En az 32 karakter** rastgele string. |
| `SEED_USERS_JSON` | ⚠️ Prod | Seed kullanıcıları JSON formatında. Production'da zorunlu. |
| `NODE_ENV` | ❌ | `production`: secure cookie, minimal log. `development`: varsayılan. |

### Uygulama Sabitleri

`src/lib/constants.ts` dosyasında tanımlıdır:

| Sabit | Açıklama |
|-------|----------|
| `APP_NAME` | UI'da gösterilen uygulama adı |
| `SESSION_COOKIE_NAME` | Session cookie adı |
| `DRINK_LARGE_SIZE_EXTRA` | Büyük boy içecek ek ücreti (₺) |
| `DRINK_PLANT_BASED_MILK_EXTRA` | Bitkisel süt ek ücreti (₺) |

---

## 9. Deployment

### Production Build

```bash
npm run build
npm run start
```

### Railway Deployment

1. Railway'de yeni proje oluşturun ve PostgreSQL eklentisini ekleyin.
2. GitHub repo'yu Railway projesine bağlayın.
3. Ortam değişkenlerini Railway dashboard'da tanımlayın:
   - `DATABASE_URL` — Railway Postgres URL
   - `SESSION_SECRET` — `openssl rand -base64 48` ile üretilmiş güçlü anahtar
   - `SEED_USERS_JSON` — Kullanıcı bilgileri (şifreler güçlü olmalı)
4. Build/Start komutları:
   - Build: `npm run build`
   - Start: `npm run start:railway`
5. İlk kurulumda seed çalıştırın.

### Deployment Kontrol Listesi

- [ ] `SESSION_SECRET` en az 32 karakter, rastgele üretilmiş
- [ ] `SEED_USERS_JSON` tanımlı ve şifreler güçlü
- [ ] Veritabanı bağlantısı SSL ile
- [ ] Railway'de HTTPS otomatik aktif
- [ ] GitHub repo'su **private**

---

## 10. Geliştirici Rehberi

### Klasör Yapısı

```
elloi-kasa/
├── prisma/
│   ├── schema.prisma          # Veri modeli tanımı
│   ├── seed.ts                # Seed script
│   └── migrations/            # Migration dosyaları
├── src/
│   ├── middleware.ts           # Edge route koruması
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── login/             # Giriş sayfası
│   │   ├── (protected)/       # Auth gerektiren route group
│   │   │   ├── layout.tsx     # Header, navigasyon, session
│   │   │   ├── page.tsx       # Dashboard
│   │   │   ├── order/new/     # Yeni sipariş
│   │   │   ├── reports/       # Raporlama
│   │   │   └── admin/         # Admin paneli
│   │   ├── actions/           # Server Actions
│   │   │   ├── auth.ts        # Login / Logout
│   │   │   ├── orders.ts      # Sipariş CRUD
│   │   │   ├── admin.ts       # Ürün / kullanıcı yönetimi
│   │   │   └── day-close.ts   # Gün sonu kapanış
│   │   └── api/
│   │       └── reports/       # CSV export
│   ├── components/            # Client Components
│   └── lib/                   # Paylaşılan iş mantığı
│       ├── auth.ts            # JWT session yönetimi
│       ├── db.ts              # Prisma client singleton
│       ├── rate-limit.ts      # Login rate limiting
│       ├── validators.ts      # Zod doğrulama şemaları
│       ├── orders.ts          # Sipariş iş mantığı
│       ├── reports.ts         # Rapor hesaplama
│       ├── time.ts            # Zaman dilimi yardımcıları
│       └── format.ts          # Para/tarih formatlama
├── next.config.ts             # Security headers
├── package.json
└── tsconfig.json
```

### Kodlama Standartları

- **TypeScript strict mode** aktif
- **Zod ile runtime doğrulama** — tüm form girdileri ve mutation parametreleri
- **Transaction kullanımı** — stok değişikliği içeren tüm operasyonlar `prisma.$transaction()` içinde
- **Türkçe hata mesajları** — kullanıcıya gösterilen tüm mesajlar Türkçe

### Yeni Bir Model/Kolon Ekleme

1. `prisma/schema.prisma` dosyasına modeli/kolonu ekle
2. Migration üret: `npm run db:migrate:dev`
3. Oluşan migration dosyalarını commit et
4. Prod ortamda migration uygula: `npm run db:migrate`

---

## 11. Veritabanı

### Şema Genel Görünüm

```
┌──────────┐       ┌───────────┐       ┌────────────┐
│   User   │──1:N──│   Order   │──1:N──│ OrderItem  │
│          │       │           │       │            │
│ id       │       │ id        │       │ orderId    │
│ username │       │ orderNo   │       │ productId  │
│ password │       │ status    │       │ productName│
│  Hash    │       │ payment   │       │  Snapshot  │
│ role     │       │  Method   │       │ unitPrice  │
│ isActive │       │ totalAmt  │       │  Snapshot  │
│          │       │ createdAt │       │ qty        │
│          │       │           │       │ lineTotal  │
└──────────┘       └───────────┘       └────────────┘

┌──────────┐       ┌────────────┐       ┌──────────┐
│ Product  │       │ DayClosure │       │  Stock   │
│          │       │            │       │ Movement │
│ name     │       │ day (uniq) │       │          │
│ category │       │ zReport    │       │ productId│
│ basePrice│       │  Total     │       │ type     │
│ stockQty │       │ systemTotal│       │ qtyDelta │
│ isActive │       │ hasMismatch│       │ reason   │
└──────────┘       └────────────┘       └──────────┘
```

### Enum Değerleri

| Enum | Değerler |
|------|----------|
| `UserRole` | `CASHIER`, `ADMIN` |
| `OrderStatus` | `OPEN`, `DELIVERED`, `CANCELED` |
| `PaymentMethod` | `CASH`, `CARD`, `METROPOL`, `EDENRED` |
| `ProductCategory` | `FOOD`, `DRINK`, `EXTRAS` |
| `StockMovementType` | `SALE`, `ADJUSTMENT`, `RESTOCK`, `CANCEL_REVERT` |

### Veri Bütünlüğü

- **Foreign key constraint'ler** aktif
- **Cascade delete:** Order → OrderItem
- **Soft delete:** Ürünler `softDeletedAt` alanı ile pasife çekilir
- **Unique constraint:** `Order.orderNo`, `User.username`, `DayClosure.day`
- **Snapshot bütünlüğü:** `productNameSnapshot` ve `unitPriceSnapshot` oluşturma anında set edilir

---

## 12. Güvenlik

### Kimlik Doğrulama

- **Cookie tabanlı JWT session** — `jose` ile HS256 imzalı
- **HTTP-only cookie** — XSS saldırılarına karşı JavaScript'ten erişilemez
- **Secure cookie** — Production'da sadece HTTPS üzerinden
- **SameSite=Lax** — CSRF koruması
- **12 saat TTL** — Session otomatik sona erer
- **bcrypt hash** — salt round 10

### Route Koruması

- **Edge Middleware** (`src/middleware.ts`) — tüm route'larda cookie varlığını kontrol eder; cookie yoksa `/login`'e yönlendirir. Server component'ler çalışmadan önce devreye girer.
- **`requireSession()` guard** — her Server Action ve korumalı sayfada session doğrulaması
- **`requireSession("ADMIN")` guard** — admin-only operasyonlarda ek rol kontrolü

### Brute-Force Koruması

- **IP tabanlı rate limiting** — IP başına 5 login denemesi / 15 dakika penceresi
- Limit aşılırsa Türkçe hata mesajı ile reddedilir
- `x-forwarded-for` header üzerinden client IP tespiti

### HTTP Güvenlik Başlıkları

`next.config.ts` üzerinden tüm yanıtlara eklenen başlıklar:

| Başlık | Değer | Koruma |
|--------|-------|--------|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS zorlama |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer sızıntısı |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Cihaz API'leri |

### Veri Doğrulama

- Tüm kullanıcı girdileri **Zod şemaları** ile server-side doğrulanır
- SQL injection'a karşı **Prisma parameterized queries**
- XSS'e karşı **React auto-escaping** — `dangerouslySetInnerHTML` kullanılmaz
- CSRF'e karşı **Next.js Server Actions** yerleşik koruma sağlar

### Gizli Bilgi Yönetimi

- `.env` dosyaları `.gitignore`'da — secret'lar repoya girmez
- `SESSION_SECRET` minimum 32 karakter zorunluluğu — kısa secret ile uygulama başlamaz
- Seed kullanıcı bilgileri `SEED_USERS_JSON` env var üzerinden — kaynak kodda şifre bulunmaz

---

## 13. Sınırlamalar

| Kısıt | Açıklama |
|-------|----------|
| **Tek şube** | Çok şubeli yapı ve merkezi raporlama desteklenmez |
| **Donanım entegrasyonu yok** | Yazarkasa, barkod okuyucu, fiş yazıcısı desteği yok |
| **Çevrimdışı çalışma yok** | PWA veya offline-first mimari yok |
| **Test coverage** | Otomatik test suite henüz eklenmemiş |

---

## 14. Yol Haritası

### Kısa Vadeli

- [ ] Otomatik test suite (unit + integration)
- [ ] Admin panelinde sipariş filtreleme ve arama
- [ ] Ürünlere görsel ekleme desteği
- [ ] Fiş yazıcısı entegrasyonu (ESC/POS)

### Orta Vadeli

- [ ] PWA desteği — çevrimdışı sipariş kuyruklaması
- [ ] Haftalık/aylık trend raporları ve grafikler
- [ ] Müşteri sadakat sistemi

### Uzun Vadeli

- [ ] Çok şubeli yapı ve merkezi yönetim
- [ ] Online sipariş entegrasyonu
- [ ] Muhasebe / e-fatura entegrasyonu
- [ ] Mobil native uygulama

---

## Komut Referansı

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Production sunucusu |
| `npm run start:railway` | Migration + production sunucusu |
| `npm run lint` | ESLint ile kod kontrolü |
| `npm run db:generate` | Prisma client yeniden üretir |
| `npm run db:migrate` | Migration'ları uygular (prod) |
| `npm run db:migrate:dev` | Migration üretir (dev) |
| `npm run db:reset` | Veritabanını sıfırdan oluşturur |
| `npm run db:seed` | Kullanıcı ve ürün verisi yükler |

---

## Lisans

Bu proje özel kullanım amaçlıdır.
