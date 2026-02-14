"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

type AuthFormState = {
  error: string | null;
};

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(`login:${ip}`);

  if (!allowed) {
    return { error: "Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin." };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş bilgisi." };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user || !user.isActive) {
    return { error: "Kullanıcı bulunamadı veya pasif." };
  }

  const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!isPasswordValid) {
    return { error: "PIN/şifre yanlış." };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
