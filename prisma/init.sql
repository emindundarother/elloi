PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'FOOD',
  "subCategory" TEXT,
  "basePrice" DECIMAL NOT NULL DEFAULT 0,
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "trackStock" BOOLEAN NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "softDeletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "paymentMethod" TEXT NOT NULL,
  "totalAmount" DECIMAL NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" DATETIME,
  "canceledAt" DATETIME,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "Order_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON "Order"("orderNo");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productNameSnapshot" TEXT NOT NULL,
  "unitPriceSnapshot" DECIMAL NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "modifierText" TEXT,
  "lineTotal" DECIMAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "qtyDelta" INTEGER NOT NULL,
  "reason" TEXT,
  "orderId" TEXT,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_orderId_idx" ON "StockMovement"("orderId");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

CREATE TABLE IF NOT EXISTS "DayClosure" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "day" TEXT NOT NULL,
  "zReportTotal" DECIMAL NOT NULL,
  "systemTotal" DECIMAL NOT NULL,
  "difference" DECIMAL NOT NULL,
  "hasMismatch" BOOLEAN NOT NULL,
  "totalOrders" INTEGER NOT NULL,
  "totalItems" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "DayClosure_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DayClosure_day_key" ON "DayClosure"("day");
CREATE INDEX IF NOT EXISTS "DayClosure_createdAt_idx" ON "DayClosure"("createdAt");

-- PaymentMethod enum değişiminde eski Ticket kayıtlarını yeni Edenred değerine taşır.
UPDATE "Order"
SET "paymentMethod" = 'EDENRED'
WHERE "paymentMethod" = 'TICKET';
