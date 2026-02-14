import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient, ProductCategory, UserRole } from "@prisma/client";

import { inferProductSubCategory } from "../src/lib/product-subcategory";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL tanımlı değil.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const seedUsers: Array<{ username: string; password: string; role: UserRole }> = [
    { username: "admin", password: "113521", role: UserRole.ADMIN },
    { username: "deniz", password: "123689", role: UserRole.ADMIN },
    { username: "ecrin", password: "1024", role: UserRole.CASHIER },
    { username: "nurseli", password: "9854", role: UserRole.CASHIER },
    { username: "enes", password: "1905", role: UserRole.CASHIER },
  ];

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: {
        username: user.username,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
  }

  await prisma.user.updateMany({
    where: {
      username: {
        notIn: seedUsers.map((user) => user.username),
      },
    },
    data: {
      isActive: false,
    },
  });

  const menuProducts: Array<{
    name: string;
    category: ProductCategory;
    basePrice: number;
    trackStock: boolean;
    stockQty: number;
  }> = [
    { name: "Single Espresso", category: ProductCategory.DRINK, basePrice: 140, trackStock: false, stockQty: 0 },
    { name: "Double Espresso", category: ProductCategory.DRINK, basePrice: 150, trackStock: false, stockQty: 0 },
    { name: "Cortado", category: ProductCategory.DRINK, basePrice: 155, trackStock: false, stockQty: 0 },
    { name: "Americano", category: ProductCategory.DRINK, basePrice: 170, trackStock: false, stockQty: 0 },
    { name: "Filtre Kahve", category: ProductCategory.DRINK, basePrice: 160, trackStock: false, stockQty: 0 },
    { name: "Flat White", category: ProductCategory.DRINK, basePrice: 200, trackStock: false, stockQty: 0 },
    { name: "Cappuccino", category: ProductCategory.DRINK, basePrice: 190, trackStock: false, stockQty: 0 },
    { name: "Mocha", category: ProductCategory.DRINK, basePrice: 220, trackStock: false, stockQty: 0 },
    { name: "White Chocolate Mocha", category: ProductCategory.DRINK, basePrice: 220, trackStock: false, stockQty: 0 },
    { name: "Latte", category: ProductCategory.DRINK, basePrice: 190, trackStock: false, stockQty: 0 },
    { name: "Salted Caramel Latte", category: ProductCategory.DRINK, basePrice: 220, trackStock: false, stockQty: 0 },
    { name: "Caramel Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Vanilla Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Shortbread Cookies Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Hazelnut Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Toasted Marshmallow Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Tiramisu Latte", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Türk Kahvesi", category: ProductCategory.DRINK, basePrice: 160, trackStock: false, stockQty: 0 },
    { name: "Double Türk Kahvesi", category: ProductCategory.DRINK, basePrice: 170, trackStock: false, stockQty: 0 },

    { name: "Sıcak Çikolata", category: ProductCategory.DRINK, basePrice: 245, trackStock: false, stockQty: 0 },
    { name: "Sahlep", category: ProductCategory.DRINK, basePrice: 220, trackStock: false, stockQty: 0 },
    { name: "Chai Tea Latte", category: ProductCategory.DRINK, basePrice: 220, trackStock: false, stockQty: 0 },

    { name: "Bardak Çay", category: ProductCategory.DRINK, basePrice: 80, trackStock: false, stockQty: 0 },
    { name: "Fincan Çay", category: ProductCategory.DRINK, basePrice: 90, trackStock: false, stockQty: 0 },
    { name: "Wake Up", category: ProductCategory.DRINK, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Midsommar", category: ProductCategory.DRINK, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Winterfell", category: ProductCategory.DRINK, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Green", category: ProductCategory.DRINK, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Berry", category: ProductCategory.DRINK, basePrice: 260, trackStock: false, stockQty: 0 },

    { name: "Summer Sun", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Purple Sky", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },
    { name: "Butterfly", category: ProductCategory.DRINK, basePrice: 210, trackStock: false, stockQty: 0 },

    { name: "Iced Americano", category: ProductCategory.DRINK, basePrice: 190, trackStock: false, stockQty: 0 },
    { name: "Iced Latte", category: ProductCategory.DRINK, basePrice: 215, trackStock: false, stockQty: 0 },
    { name: "Iced Mocha", category: ProductCategory.DRINK, basePrice: 240, trackStock: false, stockQty: 0 },
    { name: "Iced White Mocha", category: ProductCategory.DRINK, basePrice: 240, trackStock: false, stockQty: 0 },
    { name: "Iced Chai Tea Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Caramel Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Salted Caramel Latte", category: ProductCategory.DRINK, basePrice: 240, trackStock: false, stockQty: 0 },
    { name: "Iced Pumpkin Spice Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Irish Cream Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Pecan Praline Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Shortbread Cookies Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Hazelnut Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Toasted Marshmallow Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },
    { name: "Iced Tiramisu Latte", category: ProductCategory.DRINK, basePrice: 230, trackStock: false, stockQty: 0 },

    { name: "Su 330 ml", category: ProductCategory.DRINK, basePrice: 60, trackStock: false, stockQty: 0 },
    { name: "Uludağ Premium Soda 250 ml", category: ProductCategory.DRINK, basePrice: 100, trackStock: false, stockQty: 0 },
    { name: "Churchill", category: ProductCategory.DRINK, basePrice: 150, trackStock: false, stockQty: 0 },
    { name: "Hibiscus Tea 250 ml", category: ProductCategory.DRINK, basePrice: 100, trackStock: false, stockQty: 0 },
    { name: "Cool Lime 250 ml", category: ProductCategory.DRINK, basePrice: 100, trackStock: false, stockQty: 0 },
    { name: "Strawberry Vanilla 250 ml", category: ProductCategory.DRINK, basePrice: 100, trackStock: false, stockQty: 0 },
    { name: "Beyaz Şeftali 250 ml", category: ProductCategory.DRINK, basePrice: 100, trackStock: false, stockQty: 0 },

    { name: "Panini Kahvaltı Sandviç", category: ProductCategory.FOOD, basePrice: 250, trackStock: false, stockQty: 0 },
    { name: "Gurme Fiesta Sandviç", category: ProductCategory.FOOD, basePrice: 275, trackStock: false, stockQty: 0 },
    { name: "Tost Jumbo Üç Peynirli", category: ProductCategory.FOOD, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Panini Dana Jambonlu Sandviç", category: ProductCategory.FOOD, basePrice: 275, trackStock: false, stockQty: 0 },

    { name: "Üç Çikolatalı Brownie", category: ProductCategory.FOOD, basePrice: 280, trackStock: false, stockQty: 0 },
    { name: "Limonlu Cheesecake", category: ProductCategory.FOOD, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Kırmızı Meyveli Cheesecake", category: ProductCategory.FOOD, basePrice: 260, trackStock: false, stockQty: 0 },
    { name: "Karamel Yer Fıstıklı Mono", category: ProductCategory.FOOD, basePrice: 270, trackStock: false, stockQty: 0 },
    { name: "Boomcake Çikolata&Vanilya", category: ProductCategory.FOOD, basePrice: 250, trackStock: false, stockQty: 0 },

    { name: "Şurup", category: ProductCategory.EXTRAS, basePrice: 30, trackStock: false, stockQty: 0 },
    { name: "Shot", category: ProductCategory.EXTRAS, basePrice: 30, trackStock: false, stockQty: 0 },
    { name: "Bitkisel Süt", category: ProductCategory.EXTRAS, basePrice: 40, trackStock: false, stockQty: 0 },
  ];

  await prisma.product.updateMany({
    data: {
      isActive: false,
      softDeletedAt: new Date(),
    },
  });

  for (const item of menuProducts) {
    const updated = await prisma.product.updateMany({
      where: { name: item.name },
      data: {
        category: item.category,
        subCategory: inferProductSubCategory(item.category, item.name),
        basePrice: item.basePrice,
        trackStock: item.trackStock,
        stockQty: item.stockQty,
        isActive: true,
        softDeletedAt: null,
      },
    });

    if (updated.count === 0) {
      await prisma.product.create({
        data: {
          name: item.name,
          category: item.category,
          subCategory: inferProductSubCategory(item.category, item.name),
          basePrice: item.basePrice,
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          isActive: true,
          softDeletedAt: null,
        },
      });
    }
  }

  console.log("Seed tamamlandı. Kullanıcılar: admin, deniz, ecrin, nurseli, enes");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
