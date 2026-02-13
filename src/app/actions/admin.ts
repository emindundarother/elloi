"use server";

import bcrypt from "bcryptjs";
import { Prisma, StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inferProductSubCategory } from "@/lib/product-subcategory";
import {
  adjustStockSchema,
  createProductSchema,
  createUserSchema,
  updatePriceSchema,
  updateProductsBulkSchema,
  updateProductSchema,
} from "@/lib/validators";

export type AdminActionState = {
  error: string | null;
  success: string | null;
};

function normalizeCategory(value: FormDataEntryValue | null): "FOOD" | "DRINK" | "EXTRAS" {
  if (value === "DRINK" || value === "EXTRAS") return value;
  return "FOOD";
}

function normalizeName(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseBulkProductsPayload(payload: FormDataEntryValue | null): unknown {
  if (typeof payload !== "string") return [];

  try {
    return JSON.parse(payload);
  } catch {
    return [];
  }
}

export async function createProductAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireSession("ADMIN");
  const categoryInput = normalizeCategory(formData.get("category"));
  const nameInput = normalizeName(formData.get("name"));

  const parsed = createProductSchema.safeParse({
    name: nameInput,
    category: categoryInput,
    subCategory: formData.get("subCategory") ?? inferProductSubCategory(categoryInput, nameInput),
    basePrice: formData.get("basePrice"),
    trackStock: formData.get("trackStock") === "on",
    stockQty: formData.get("stockQty") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz ürün bilgisi.", success: null };
  }

  try {
    await prisma.product.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        subCategory: parsed.data.subCategory,
        basePrice: new Prisma.Decimal(parsed.data.basePrice),
        trackStock: parsed.data.trackStock,
        stockQty: parsed.data.trackStock ? parsed.data.stockQty : 0,
        isActive: true,
      },
    });
  } catch {
    return { error: "Ürün eklenemedi.", success: null };
  }

  revalidatePath("/admin/products");
  return { error: null, success: "Ürün eklendi." };
}

export async function updateProductPriceAction(productId: string, formData: FormData): Promise<void> {
  await requireSession("ADMIN");

  const parsed = updatePriceSchema.safeParse({
    basePrice: formData.get("basePrice"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Fiyat doğrulanamadı.");
  }

  await prisma.product.update({
    where: { id: productId },
    data: { basePrice: new Prisma.Decimal(parsed.data.basePrice) },
  });

  revalidatePath("/admin/products");
}

export async function adjustProductStockAction(productId: string, formData: FormData): Promise<void> {
  const session = await requireSession("ADMIN");

  const parsed = adjustStockSchema.safeParse({
    qtyDelta: formData.get("qtyDelta"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Stok işlemi doğrulanamadı.");
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        trackStock: true,
      },
    });

    if (!product?.trackStock) {
      throw new Error("Bu ürün için stok takibi kapalı.");
    }

    if (parsed.data.qtyDelta < 0) {
      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          stockQty: { gte: Math.abs(parsed.data.qtyDelta) },
        },
        data: {
          stockQty: {
            decrement: Math.abs(parsed.data.qtyDelta),
          },
        },
      });

      if (updated.count === 0) {
        throw new Error("Stok 0 altına düşemez.");
      }
    } else {
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQty: {
            increment: parsed.data.qtyDelta,
          },
        },
      });
    }

    await tx.stockMovement.create({
      data: {
        productId,
        type: parsed.data.qtyDelta > 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT,
        qtyDelta: parsed.data.qtyDelta,
        reason: parsed.data.reason || "Manuel stok güncellemesi",
        createdById: session.userId,
      },
    });
  });

  revalidatePath("/admin/products");
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const session = await requireSession("ADMIN");
  const categoryInput = normalizeCategory(formData.get("category"));
  const nameInput = normalizeName(formData.get("name"));

  const parsed = updateProductSchema.safeParse({
    name: nameInput,
    category: categoryInput,
    subCategory: formData.get("subCategory") ?? inferProductSubCategory(categoryInput, nameInput),
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive"),
    trackStock: formData.get("trackStock"),
    qtyDelta: formData.get("qtyDelta"),
    reason: formData.get("reason") || "",
  });

  if (!parsed.success) {
    console.error("updateProductAction validation failed", {
      productId,
      error: parsed.error.issues[0]?.message ?? "Ürün bilgisi doğrulanamadı.",
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });

      if (!product) {
        throw new Error("Ürün bulunamadı.");
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          name: parsed.data.name,
          category: parsed.data.category,
          subCategory: parsed.data.subCategory,
          basePrice: new Prisma.Decimal(parsed.data.basePrice),
          isActive: parsed.data.isActive,
          trackStock: parsed.data.trackStock,
          softDeletedAt: parsed.data.isActive ? null : new Date(),
        },
      });

      if (parsed.data.qtyDelta === undefined || !parsed.data.trackStock) return;

      if (parsed.data.qtyDelta < 0) {
        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            stockQty: { gte: Math.abs(parsed.data.qtyDelta) },
          },
          data: {
            stockQty: {
              decrement: Math.abs(parsed.data.qtyDelta),
            },
          },
        });

        if (updated.count === 0) {
          throw new Error("Stok 0 altına düşemez.");
        }
      } else {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQty: {
              increment: parsed.data.qtyDelta,
            },
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId,
          type: parsed.data.qtyDelta > 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT,
          qtyDelta: parsed.data.qtyDelta,
          reason: parsed.data.reason || "Manuel stok güncellemesi",
          createdById: session.userId,
        },
      });
    });
  } catch (error) {
    console.error("updateProductAction failed", { productId, error });
    return;
  }

  revalidatePath("/admin/products");
}

export async function updateProductsBulkAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireSession("ADMIN");

  const parsed = updateProductsBulkSchema.safeParse(parseBulkProductsPayload(formData.get("payloadJson")));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ürün bilgileri doğrulanamadı.",
      success: null,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of parsed.data) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          select: { id: true },
        });

        if (!product) {
          throw new Error("Ürün bulunamadı.");
        }

        await tx.product.update({
          where: { id: item.id },
          data: {
            name: item.name,
            category: item.category,
            subCategory: item.subCategory,
            basePrice: new Prisma.Decimal(item.basePrice),
            isActive: item.isActive,
            trackStock: item.trackStock,
            softDeletedAt: item.isActive ? null : new Date(),
          },
        });

        if (item.qtyDelta === undefined || !item.trackStock) {
          continue;
        }

        if (item.qtyDelta < 0) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.id,
              stockQty: { gte: Math.abs(item.qtyDelta) },
            },
            data: {
              stockQty: {
                decrement: Math.abs(item.qtyDelta),
              },
            },
          });

          if (updated.count === 0) {
            throw new Error("Stok 0 altına düşemez.");
          }
        } else {
          await tx.product.update({
            where: { id: item.id },
            data: {
              stockQty: {
                increment: item.qtyDelta,
              },
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.id,
            type: item.qtyDelta > 0 ? StockMovementType.RESTOCK : StockMovementType.ADJUSTMENT,
            qtyDelta: item.qtyDelta,
            reason: item.reason || "Manuel stok güncellemesi",
            createdById: session.userId,
          },
        });
      }
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ürünler kaydedilemedi.",
      success: null,
    };
  }

  revalidatePath("/admin/products");
  return {
    error: null,
    success: "Tüm değişiklikler kaydedildi.",
  };
}

export async function toggleProductActiveAction(productId: string, isActive: boolean): Promise<void> {
  await requireSession("ADMIN");

  await prisma.product.update({
    where: { id: productId },
    data: {
      isActive,
      softDeletedAt: isActive ? null : new Date(),
    },
  });

  revalidatePath("/admin/products");
}

export async function createUserAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireSession("ADMIN");

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kullanıcı bilgisi geçersiz.", success: null };
  }

  const existing = await prisma.user.findUnique({
    where: {
      username: parsed.data.username,
    },
    select: { id: true },
  });

  if (existing) {
    return { error: "Bu kullanıcı adı zaten kullanılıyor.", success: null };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      role: parsed.data.role,
      passwordHash,
      isActive: true,
    },
  });

  revalidatePath("/admin/users");

  return {
    error: null,
    success: "Kullanıcı eklendi.",
  };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  await requireSession("ADMIN");

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  revalidatePath("/admin/users");
}
