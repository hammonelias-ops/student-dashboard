"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
};

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
  return {
    status: "sent",
    email,
    message: `Check ${email}. Only the newest link works, and open it in this same browser.`,
  };
}

// Email + password: works anywhere, including the installed phone app (an emailed link opens the
// phone's browser instead of the app). The password is set once from the Account page.
export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email.includes("@") || !password) {
    return { status: "error", message: "Enter your email and password." };
  }
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (allowed && email !== allowed) {
    return { status: "error", message: "This dashboard is private." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: "error",
      message:
        "Wrong email or password. No password yet? Use “Email me a link” once, then set one on the Account page.",
    };
  }
  redirect(next);
}

// Account page: choose or change the password (signed in)
export async function setPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { status: "error", message: "Use at least 8 characters." };
  if (password !== confirm) return { status: "error", message: "The two passwords don't match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: error.message };
  return { status: "sent", message: "Password saved. You can now sign in with it on any device." };
}

export async function signOut() {
  const supabase = await createClient();
  // "local": only this browser. The default ("global") would also sign out your phone/laptop.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
