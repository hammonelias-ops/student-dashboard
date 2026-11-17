"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email.includes("@")) {
    return { status: "error", message: "Enter your email address." };
  }

  // Only Elias uses this app: refuse any other email (set ALLOWED_EMAIL in .env.local)
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (allowed && email !== allowed) {
    return { status: "error", message: "This dashboard is private." };
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", message: `Check ${email} for a sign-in link.` };
}

export async function signOut() {
  const supabase = await createClient();
  // "local": only this browser. The default ("global") would also sign out your phone/laptop.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
