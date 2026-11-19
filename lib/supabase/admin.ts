import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client with the service role key: bypasses row level security.
// Only for jobs with no signed-in user (daily reminders, gradebook sync), and they always
// filter by the one user from ALLOWED_EMAIL.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// The dashboard's one user (ALLOWED_EMAIL)
export async function getOwnerId(admin: ReturnType<typeof createAdminClient>) {
  const email = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("ALLOWED_EMAIL must be set");
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) throw new Error("No account for ALLOWED_EMAIL yet (sign in to the app once)");
  return user.id;
}

// Constant-time check of a shared secret from a request header
export function secretMatches(given: string | null | undefined, expected: string | undefined) {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
