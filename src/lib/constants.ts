import { PaymentMethod, UserRole } from "@prisma/client";

export const APP_NAME = "Elloi Kasa";
export const APP_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export const SESSION_COOKIE_NAME = "elloi_session";
export const DRINK_LARGE_SIZE_EXTRA = 10;
export const DRINK_PLANT_BASED_MILK_EXTRA = 40;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CARD: "Kredi Kartı",
  METROPOL: "Metropol Kart",
  EDENRED: "Ticket Edenred",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  CASHIER: "Kasiyer",
  ADMIN: "Admin",
};
