type ProductCategoryLike = "FOOD" | "DRINK" | "EXTRAS";

export const PRODUCT_SUBCATEGORY_ORDER = [
  "HOT_COFFEES",
  "COLD_COFFEES",
  "OTHER_HOT_DRINKS",
  "TEAS",
  "COLD_TEAS",
  "SOFT_DRINKS",
  "SAVORIES",
  "DESSERTS",
  "EXTRAS",
  "OTHER_DRINKS",
  "OTHER_FOOD",
] as const;

export const PRODUCT_SUBCATEGORY_VALUES = PRODUCT_SUBCATEGORY_ORDER;

export type ProductSubCategory = (typeof PRODUCT_SUBCATEGORY_ORDER)[number];

export const PRODUCT_SUBCATEGORY_LABELS: Record<ProductSubCategory, string> = {
  HOT_COFFEES: "Sıcak Kahveler",
  COLD_COFFEES: "Soğuk Kahveler",
  OTHER_HOT_DRINKS: "Diğer Sıcak İçecekler",
  TEAS: "Çaylar",
  COLD_TEAS: "Soğuk Çaylar",
  SOFT_DRINKS: "Soft İçecekler",
  SAVORIES: "Sandviçler / Tuzlular",
  DESSERTS: "Tatlılar",
  EXTRAS: "Ekstralar",
  OTHER_DRINKS: "Diğer İçecekler",
  OTHER_FOOD: "Diğer Yiyecekler",
};

export const PRODUCT_SUBCATEGORY_BY_CATEGORY: Record<ProductCategoryLike, ProductSubCategory[]> = {
  DRINK: ["HOT_COFFEES", "COLD_COFFEES", "OTHER_HOT_DRINKS", "TEAS", "COLD_TEAS", "SOFT_DRINKS", "OTHER_DRINKS"],
  FOOD: ["SAVORIES", "DESSERTS", "OTHER_FOOD"],
  EXTRAS: ["EXTRAS"],
};

const hotCoffeeNames = new Set([
  "Single Espresso",
  "Double Espresso",
  "Cortado",
  "Americano",
  "Filtre Kahve",
  "Flat White",
  "Cappuccino",
  "Mocha",
  "White Chocolate Mocha",
  "Latte",
  "Salted Caramel Latte",
  "Caramel Latte",
  "Vanilla Latte",
  "Shortbread Cookies Latte",
  "Hazelnut Latte",
  "Toasted Marshmallow Latte",
  "Tiramisu Latte",
  "Türk Kahvesi",
  "Double Türk Kahvesi",
]);

const coldCoffeeNames = new Set([
  "Iced Americano",
  "Iced Latte",
  "Iced Mocha",
  "Iced White Mocha",
  "Iced Chai Tea Latte",
  "Iced Caramel Latte",
  "Iced Salted Caramel Latte",
  "Iced Pumpkin Spice Latte",
  "Iced Irish Cream Latte",
  "Iced Pecan Praline Latte",
  "Iced Shortbread Cookies Latte",
  "Iced Hazelnut Latte",
  "Iced Toasted Marshmallow Latte",
  "Iced Tiramisu Latte",
]);

const otherHotDrinkNames = new Set(["Sıcak Çikolata", "Sahlep", "Chai Tea Latte"]);
const teaNames = new Set(["Bardak Çay", "Fincan Çay", "Wake Up", "Midsommar", "Winterfell", "Green", "Berry"]);
const coldTeaNames = new Set(["Summer Sun", "Purple Sky", "Butterfly"]);
const softDrinkNames = new Set([
  "Su 330 ml",
  "Uludağ Premium Soda 250 ml",
  "Churchill",
  "Hibiscus Tea 250 ml",
  "Cool Lime 250 ml",
  "Strawberry Vanilla 250 ml",
  "Beyaz Şeftali 250 ml",
]);
const savoryNames = new Set([
  "Panini Kahvaltı Sandviç",
  "Gurme Fiesta Sandviç",
  "Tost Jumbo Üç Peynirli",
  "Panini Dana Jambonlu Sandviç",
]);
const dessertNames = new Set([
  "Üç Çikolatalı Brownie",
  "Limonlu Cheesecake",
  "Kırmızı Meyveli Cheesecake",
  "Karamel Yer Fıstıklı Mono",
  "Boomcake Çikolata&Vanilya",
]);

export function getDefaultProductSubCategory(category: ProductCategoryLike): ProductSubCategory {
  return PRODUCT_SUBCATEGORY_BY_CATEGORY[category][0];
}

export function asProductSubCategory(value: string | null | undefined): ProductSubCategory | null {
  if (!value) return null;
  return PRODUCT_SUBCATEGORY_ORDER.includes(value as ProductSubCategory) ? (value as ProductSubCategory) : null;
}

export function isProductSubCategoryAllowed(category: ProductCategoryLike, subCategory: ProductSubCategory): boolean {
  return PRODUCT_SUBCATEGORY_BY_CATEGORY[category].includes(subCategory);
}

export function inferProductSubCategory(category: ProductCategoryLike, name: string): ProductSubCategory {
  if (category === "EXTRAS") {
    return "EXTRAS";
  }

  if (category === "FOOD") {
    if (dessertNames.has(name)) return "DESSERTS";
    if (savoryNames.has(name)) return "SAVORIES";
    return "OTHER_FOOD";
  }

  if (hotCoffeeNames.has(name)) return "HOT_COFFEES";
  if (coldCoffeeNames.has(name)) return "COLD_COFFEES";
  if (otherHotDrinkNames.has(name)) return "OTHER_HOT_DRINKS";
  if (teaNames.has(name)) return "TEAS";
  if (coldTeaNames.has(name)) return "COLD_TEAS";
  if (softDrinkNames.has(name)) return "SOFT_DRINKS";
  if (name.startsWith("Iced ")) return "COLD_COFFEES";

  return "OTHER_DRINKS";
}

export function resolveProductSubCategory(
  value: string | null | undefined,
  category: ProductCategoryLike,
  name: string,
): ProductSubCategory {
  return asProductSubCategory(value) ?? inferProductSubCategory(category, name);
}
