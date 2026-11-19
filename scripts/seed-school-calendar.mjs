// Load the 2026–27 school calendar from docs/PLAN.md into the `events` table (source = 'school').
// Safe to re-run: skips dates that are already there.
//
// Needs (in .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_EMAIL
// and supabase/migrations/0002_events.sql already run in Supabase.
//
//   node scripts/seed-school-calendar.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ALLOWED_EMAIL"]) {
  if (!env[key]) throw new Error(`${key} is missing from .env.local`);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: users, error: usersError } = await db.auth.admin.listUsers();
if (usersError) throw usersError;
const user = users.users.find((u) => u.email?.toLowerCase() === env.ALLOWED_EMAIL.toLowerCase());
if (!user) throw new Error("No account for ALLOWED_EMAIL yet: sign in to the app once first");

// The JSON block under "## School calendar 2026–27" in docs/PLAN.md
const plan = readFileSync("docs/PLAN.md", "utf8");
const block = plan.split("## School calendar 2026")[1]?.split("```json")[1]?.split("```")[0];
if (!block) throw new Error("Couldn't find the school calendar JSON in docs/PLAN.md");
const dates = JSON.parse(block);

const { data: existing, error } = await db
  .from("events")
  .select("title, start_date")
  .eq("user_id", user.id)
  .eq("source", "school");
if (error?.code === "PGRST205") {
  throw new Error("The events table doesn't exist yet: run supabase/migrations/0002_events.sql in Supabase first");
}
if (error) throw error;

const have = new Set(existing.map((e) => `${e.title}|${e.start_date}`));
const toAdd = dates
  .filter((d) => !have.has(`${d.title}|${d.start}`))
  .map((d) => ({
    user_id: user.id,
    title: d.title,
    kind: d.kind,
    start_date: d.start,
    end_date: d.end,
    source: "school",
  }));

if (toAdd.length) {
  const { error: insertError } = await db.from("events").insert(toAdd);
  if (insertError) throw insertError;
}
console.log(`School dates: ${dates.length} in the plan, ${existing.length} already loaded, ${toAdd.length} added.`);
