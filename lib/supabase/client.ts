"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

// Supabase client for Client Components (e.g. file uploads to the `attachments` bucket).
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
