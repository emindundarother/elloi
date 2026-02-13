"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReportByRange } from "@/lib/reports";
import { closeDaySchema, resetDayClosureSchema } from "@/lib/validators";

export type CloseDayActionState = {
  error: string | null;
  closureId: string | null;
};

export type ResetDayClosureActionState = {
  error: string | null;
  success: string | null;
};

async function appendDayCloseLog(entry: {
  id: string;
  day: string;
  zReportTotal: number;
  systemTotal: number;
  difference: number;
  hasMismatch: boolean;
  totalOrders: number;
  totalItems: number;
  createdById: string;
}) {
  const logsDir = path.join(process.cwd(), "logs");
  const logPath = path.join(logsDir, "day-close.log");
  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(
    logPath,
    `${JSON.stringify({
      ...entry,
      createdAt: new Date().toISOString(),
      message: entry.hasMismatch ? "gün sonu rakamları tutmuyor" : "gün sonu başarıyla kapatıldı",
    })}\n`,
    "utf8",
  );
}

async function removeDayCloseLog(day: string, closureId: string): Promise<void> {
  const logPath = path.join(process.cwd(), "logs", "day-close.log");

  let content = "";
  try {
    content = await fs.readFile(logPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  const keptLines = content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => {
      try {
        const parsed = JSON.parse(line) as { id?: string; day?: string };
        return parsed.id !== closureId && parsed.day !== day;
      } catch {
        return true;
      }
    });

  const nextContent = keptLines.length > 0 ? `${keptLines.join("\n")}\n` : "";
  await fs.writeFile(logPath, nextContent, "utf8");
}

export async function closeDayAction(
  _prev: CloseDayActionState,
  formData: FormData,
): Promise<CloseDayActionState> {
  const session = await requireSession();

  const parsed = closeDaySchema.safeParse({
    day: formData.get("day"),
    zReportTotal: formData.get("zReportTotal"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Gün sonu bilgisi doğrulanamadı.",
      closureId: null,
    };
  }

  const existing = await prisma.dayClosure.findUnique({
    where: { day: parsed.data.day },
    select: { id: true },
  });

  if (existing) {
    return {
      error: "Bu gün zaten sonlandırılmış.",
      closureId: existing.id,
    };
  }

  const report = await getReportByRange(parsed.data.day, parsed.data.day);
  const totalItems = report.orders.reduce(
    (sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.qty, 0),
    0,
  );
  const systemTotal = Number(report.totalRevenue.toFixed(2));
  const difference = Number((parsed.data.zReportTotal - systemTotal).toFixed(2));
  const hasMismatch = Math.abs(difference) > 0.009;

  try {
    const closure = await prisma.dayClosure.create({
      data: {
        day: parsed.data.day,
        zReportTotal: new Prisma.Decimal(parsed.data.zReportTotal),
        systemTotal: new Prisma.Decimal(systemTotal),
        difference: new Prisma.Decimal(difference),
        hasMismatch,
        totalOrders: report.totalOrders,
        totalItems,
        createdById: session.userId,
      },
      select: { id: true },
    });

    try {
      await appendDayCloseLog({
        id: closure.id,
        day: parsed.data.day,
        zReportTotal: parsed.data.zReportTotal,
        systemTotal,
        difference,
        hasMismatch,
        totalOrders: report.totalOrders,
        totalItems,
        createdById: session.userId,
      });
    } catch (logError) {
      console.error("day close log yazılamadı", logError);
    }

    revalidatePath("/reports/day");
    revalidatePath("/admin/reports");

    return {
      error: null,
      closureId: closure.id,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Gün sonlandırılamadı.",
      closureId: null,
    };
  }
}

export async function resetDayClosureAction(
  _prev: ResetDayClosureActionState,
  formData: FormData,
): Promise<ResetDayClosureActionState> {
  await requireSession("ADMIN");

  const parsed = resetDayClosureSchema.safeParse({
    day: formData.get("day"),
    closureId: formData.get("closureId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Sıfırlama bilgisi doğrulanamadı.",
      success: null,
    };
  }

  const closure = await prisma.dayClosure.findUnique({
    where: { id: parsed.data.closureId },
    select: { id: true, day: true },
  });

  if (!closure || closure.day !== parsed.data.day) {
    return {
      error: "Sıfırlanacak kapanış kaydı bulunamadı.",
      success: null,
    };
  }

  try {
    await removeDayCloseLog(closure.day, closure.id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Log temizlenemedi.",
      success: null,
    };
  }

  await prisma.dayClosure.delete({
    where: { id: closure.id },
  });

  revalidatePath("/reports/day");
  revalidatePath("/");

  return {
    error: null,
    success: "Gün sonu raporu sıfırlandı.",
  };
}
