import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm />
    </main>
  );
}
