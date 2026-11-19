import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "@/lib/events";
import type { AttachmentRow, ClassRow, TaskRow } from "@/lib/tasks";

// Signed-in Supabase client + user id. Every page and action goes through this
// (proxy.ts already gates pages, but Server Actions can be POSTed to directly).
export async function requireUser() {
  // Per-user data: always render at request time. Without this, Cache Components flags
  // the clock reads (Supabase's token-expiry check, `new Date()`) as happening while prerendering.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

const CLASS_COLUMNS = "id, name, code, aliases, teacher, color, grade, goal";
const TASK_COLUMNS =
  "id, class_id, title, description, teacher, due_at, kind, priority, missing, done, attachments (id, path, name, mime)";

export async function getClasses(): Promise<ClassRow[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("classes")
    .select(CLASS_COLUMNS)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as ClassRow[];
}

export async function getClass(id: string): Promise<ClassRow | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("classes").select(CLASS_COLUMNS).eq("id", id).maybeSingle();
  return data as ClassRow | null;
}

export async function getTasks(): Promise<TaskRow[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("due_at")
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as TaskRow[];
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("id", id).maybeSingle();
  return data as TaskRow | null;
}

// Claude's Top 3 for a day (from the Stage 10 gradebook check), if there is one
export async function getDailyPick(day: string): Promise<unknown> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("daily_pick").select("top3").eq("day", day).maybeSingle();
  return data?.top3 ?? null;
}

// "2 of 3 today": how many daily goals exist and how many are checked off for `day`
export async function getHabitSummary(day: string) {
  const { supabase } = await requireUser();
  const [habits, logged] = await Promise.all([
    supabase.from("habits").select("id", { count: "exact", head: true }),
    supabase.from("habit_log").select("habit_id", { count: "exact", head: true }).eq("day", day),
  ]);
  return { total: habits.count ?? 0, done: logged.count ?? 0 };
}

// Daily goals with the days each was checked off since `sinceDay` (enough history for streaks)
export async function getHabits(sinceDay: string) {
  const { supabase } = await requireUser();
  const [habits, logs] = await Promise.all([
    supabase.from("habits").select("id, name").order("created_at"),
    supabase.from("habit_log").select("habit_id, day").gte("day", sinceDay),
  ]);
  if (habits.error) throw new Error(habits.error.message);
  if (logs.error) throw new Error(logs.error.message);
  return habits.data.map((h) => ({
    ...h,
    days: new Set(logs.data.filter((l) => l.habit_id === h.id).map((l) => l.day as string)),
  }));
}

// Hours slept per night since `sinceDay`: { "2026-11-17": 7.5, … }
export async function getSleep(sinceDay: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("sleep_log").select("day, hours").gte("day", sinceDay);
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map((s) => [s.day as string, Number(s.hours)]));
}

// Every grade check, oldest first (one row per class per check = the trend)
export async function getGradeHistory() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("grades")
    .select("class_id, percent, checked_at")
    .order("checked_at");
  if (error) throw new Error(error.message);
  return data.map((g) => ({ classId: g.class_id as string, percent: Number(g.percent), at: g.checked_at as string }));
}

const EVENT_COLUMNS = "id, title, kind, start_date, end_date, start_time, end_time, location, note, source";

// Calendar events. A school year is a few dozen rows, so load them all.
export async function getEvents(): Promise<EventRow[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).order("start_date");
  // Before 0002_events.sql has been run the table doesn't exist yet: show an empty calendar
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw new Error(error.message);
  return data as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle();
  return data as EventRow | null;
}

// Private bucket → short-lived links for showing thumbnails and opening files
export async function withSignedUrls(attachments: AttachmentRow[]) {
  if (attachments.length === 0) return [];
  const { supabase } = await requireUser();
  const { data } = await supabase.storage
    .from("attachments")
    .createSignedUrls(attachments.map((a) => a.path), 60 * 60);
  return attachments.map((a, i) => ({ ...a, url: data?.[i]?.signedUrl ?? null }));
}
