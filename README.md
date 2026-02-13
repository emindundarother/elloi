# Elloi Kasa Webapp

Kasiyer Sipariş Ekranı + Gün Sonu Raporu + Admin Portal içeren Next.js uygulaması.

## Teknoloji

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma Client + SQLite (adapter ile)
- Zod doğrulama
- Cookie tabanlı session auth (rol: CASHIER / ADMIN)

## Hızlı Kurulum

1. Bağımlılıkları kur:

```bash
npm install
```

2. Ortam değişkenlerini ayarla:

```bash
cp .env.example .env
```

3. Veritabanı şemasını oluştur:

```bash
npm run db:migrate
```

4. Örnek veriyi yükle:

```bash
npm run db:seed
```

5. Uygulamayı başlat:

```bash
npm run dev
```

## Demo Hesapları

- Admin: `admin` / `113521`
- Admin: `deniz` / `123689`
- Kasiyer: `ecrin` / `1024`
- Kasiyer: `nurseli` / `9854`
- Kasiyer: `enes` / `1905`

## Route'lar

- `/login`
- `/`
- `/order/new`
- `/reports/day`
- `/admin/products`
- `/admin/reports`
- `/admin/users`

## Veritabanı Notları

- `createdAt`, `deliveredAt`, `canceledAt` UTC saklanır.
- UI tarafında tarih/saat gösterimleri uygulamanın çalıştığı cihazın zaman dilimine göre hesaplanır.
- Sipariş satırlarında `productNameSnapshot` ve `unitPriceSnapshot` tutulur.
- Stok, sipariş `Kaydet` anında düşer; iptalde geri eklenir.

## Komutlar

- `npm run db:migrate`: SQLite şemasını kurar + Prisma client üretir
- `npm run db:reset`: `prisma/dev.db` siler, şemayı yeniden kurar
- `npm run db:seed`: örnek kullanıcı/ürün verisi yükler
- `npm run lint`
- `npm run build`

## Önemli Not

Bu ortamda Prisma schema engine migration akışı stabil çalışmadığı için şema kurulumu `sqlite3` ile idempotent SQL bootstrap (`prisma/init.sql`) üzerinden yapılır. Uygulama katmanı Prisma Client ile devam eder.
