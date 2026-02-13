import { UserRole } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "./constants";

export type SessionUser = {
  userId: string;
  username: string;
  role: UserRole;
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET en az 32 karakter olmalı.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({
    uid: user.userId,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (
      typeof payload.uid !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "CASHIER" && payload.role !== "ADMIN")
    ) {
      return null;
    }

    return {
      userId: payload.uid,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(requiredRole?: UserRole): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (requiredRole && session.role !== requiredRole) {
    redirect("/");
  }

  return session;
}
