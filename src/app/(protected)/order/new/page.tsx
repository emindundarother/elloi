import Link from "next/link";

import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { resolveProductSubCategory } from "@/lib/product-subcategory";
import { getTodayTR } from "@/lib/time";

import { OrderCreateForm } from "@/components/order-create-form";

export default async function NewOrderPage() {
  const today = getTodayTR();
  const dayClosure = await prisma.dayClosure.findUnique({
    where: { day: today },
    select: { id: true },
  });

  if (dayClosure) {
    return (
      <div className="space-y-4">
        <div className="panel p-5 sm:p-6">
          <h1 className="text-2xl font-semibold">Yeni Sipariş</h1>
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            Gün sonlandı, daha fazla sipariş alamazsınız.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold"
          >
            Kasa Ekranına Dön
          </Link>
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      category: true,
      subCategory: true,
      basePrice: true,
      stockQty: true,
      trackStock: true,
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Yeni Sipariş</h1>
        <p className="muted mt-1 text-sm">Ürüne dokun, adedi ayarla, kaydet.</p>
      </div>

      <OrderCreateForm
        products={products.map((product) => ({
          ...product,
          subCategory: resolveProductSubCategory(product.subCategory, product.category, product.name),
          basePrice: toNumber(product.basePrice),
        }))}
      />
    </div>
  );
}
