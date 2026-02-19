"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StockError, cancelOrder, createOrder, deliverOrder } from "@/lib/orders";
import { createOrderSchema } from "@/lib/validators";

type OrderFormState = {
  error: string | null;
};

async function assertOrderAccess(orderId: string, session: SessionUser): Promise<void> {
  if (session.role === "ADMIN") return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { createdById: true },
  });

  if (!order) {
    throw new Error("Sipariş bulunamadı.");
  }

  if (order.createdById !== session.userId) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

function parseJson(payload: FormDataEntryValue | null): unknown {
  if (typeof payload !== "string") return [];

  try {
    return JSON.parse(payload);
  } catch {
    return [];
  }
}

export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const session = await requireSession();

  const parsed = createOrderSchema.safeParse({
    note: formData.get("note"),
    items: parseJson(formData.get("itemsJson")),
    payments: parseJson(formData.get("paymentsJson")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Sipariş doğrulanamadı." };
  }

  try {
    await createOrder({
      payments: parsed.data.payments,
      note: parsed.data.note,
      items: parsed.data.items,
      createdById: session.userId,
    });
  } catch (error) {
    if (error instanceof StockError) {
      return { error: error.message };
    }

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Sipariş kaydedilemedi." };
  }

  revalidatePath("/");
  revalidatePath("/reports/day");
  revalidatePath("/admin/reports");

  redirect("/");
}

export async function deliverOrderAction(orderId: string): Promise<void> {
  await requireSession();
  await deliverOrder(orderId);

  revalidatePath("/");
  revalidatePath("/reports/day");
  revalidatePath("/admin/reports");
}

export async function cancelOrderAction(orderId: string): Promise<void> {
  const session = await requireSession();
  await assertOrderAccess(orderId, session);
  await cancelOrder(orderId, session.userId);

  revalidatePath("/");
  revalidatePath("/reports/day");
  revalidatePath("/admin/reports");
}
