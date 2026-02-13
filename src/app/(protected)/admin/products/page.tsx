import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { resolveProductSubCategory } from "@/lib/product-subcategory";

import { AdminProductCreateForm } from "@/components/admin-product-create-form";
import { AdminProductsTable } from "@/components/admin-products-table";

export default async function AdminProductsPage() {
  await requireSession("ADMIN");

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Ürün Yönetimi</h1>
        <p className="muted mt-1 text-sm">Ürün adı, kategori, fiyat, aktiflik ve stok takibi yönetimi.</p>
      </div>

      <AdminProductCreateForm />

      <AdminProductsTable
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          subCategory: resolveProductSubCategory(product.subCategory, product.category, product.name),
          isActive: product.isActive,
          basePrice: toNumber(product.basePrice),
          trackStock: product.trackStock,
          stockQty: product.stockQty,
        }))}
      />
    </div>
  );
}
