import { PaymentMethod, UserRole } from "@prisma/client";
import { z } from "zod";

import {
  PRODUCT_SUBCATEGORY_VALUES,
  isProductSubCategoryAllowed,
} from "./product-subcategory";

export const loginSchema = z.object({
  username: z.string().trim().min(2, "Kullanıcı adı gerekli."),
  password: z.string().min(4, "PIN/şifre en az 4 karakter olmalı."),
});

const orderItemSchema = z.object({
  productId: z.string().uuid("Geçersiz ürün kimliği."),
  qty: z.coerce.number().int().min(1, "Adet en az 1 olmalı."),
  modifierText: z.string().trim().max(200).optional().or(z.literal("")),
  drinkSize: z.enum(["SMALL", "LARGE"]).optional(),
  milkType: z.enum(["NORMAL_SUT", "LAKTOZSUZ_SUT", "BADEM_SUTU", "YULAF_SUTU", "SUTSUZ"]).optional(),
});

const paymentEntrySchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().positive("Ödeme tutarı 0'dan büyük olmalı."),
  note: z.string().trim().max(120).optional().or(z.literal("")),
  itemIndices: z.array(z.number().int().min(0)).optional(),
});

export const createOrderSchema = z.object({
  note: z.string().trim().max(120).optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1, "Sepet boş olamaz."),
  payments: z.array(paymentEntrySchema).min(1, "En az bir ödeme yöntemi seçilmeli."),
});

const productCategorySchema = z.enum(["FOOD", "DRINK", "EXTRAS"], {
  error: "Ürün kategorisi geçersiz.",
});

const productSubCategorySchema = z.enum(PRODUCT_SUBCATEGORY_VALUES, {
  error: "Alt kategori geçersiz.",
});

const productBaseSchema = z
  .object({
    name: z.string().trim().min(2, "Ürün adı gerekli.").max(80),
    category: productCategorySchema,
    subCategory: productSubCategorySchema,
    basePrice: z.coerce.number().positive("Fiyat 0'dan büyük olmalı."),
  })
  .refine((data) => isProductSubCategoryAllowed(data.category, data.subCategory), {
    message: "Seçilen alt kategori ürün kategorisi ile uyumlu değil.",
    path: ["subCategory"],
  });

export const createProductSchema = productBaseSchema.extend({
  trackStock: z.coerce.boolean(),
  stockQty: z.coerce.number().int().min(0),
});

export const updatePriceSchema = z.object({
  basePrice: z.coerce.number().positive("Fiyat 0'dan büyük olmalı."),
});

export const updateProductSchema = productBaseSchema.extend({
  isActive: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  trackStock: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  qtyDelta: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce
      .number()
      .int()
      .refine((value) => value !== 0, {
        message: "Stok değişimi 0 olamaz.",
      })
      .optional(),
  ),
  reason: z.string().trim().max(120).optional().or(z.literal("")),
});

export const updateProductsBulkSchema = z
  .array(
    updateProductSchema.extend({
      id: z.string().uuid("Geçersiz ürün kimliği."),
    }),
  )
  .min(1, "Kaydedilecek değişiklik bulunamadı.");

export const adjustStockSchema = z.object({
  qtyDelta: z.coerce.number().int().refine((value) => value !== 0, {
    message: "Stok değişimi 0 olamaz.",
  }),
  reason: z.string().trim().max(120).optional().or(z.literal("")),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı.")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Sadece harf, rakam, . _ - kullanılabilir."),
  role: z.nativeEnum(UserRole),
  password: z.string().min(4, "PIN/şifre en az 4 karakter olmalı.").max(64),
});

export const closeDaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz gün."),
  zReportTotal: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().nonnegative("Z raporu toplamı zorunlu."),
  ),
});

export const resetDayClosureSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz gün."),
  closureId: z.string().uuid("Geçersiz kapanış kaydı."),
});
