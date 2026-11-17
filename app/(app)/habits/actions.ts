"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/data";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function addHabit(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Name the goal, like “Workout 30 min”." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("habits").insert({ name });
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteHabit(id: string) {
  const { supabase } = await requireUser();
  // habit_log rows go with it (on delete cascade)
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setHabitDone(habitId: string, day: string, done: boolean) {
  if (!DAY.test(day)) throw new Error("Bad day");
  const { supabase } = await requireUser();
  const { error } = done
    ? await supabase.from("habit_log").upsert({ habit_id: habitId, day }, { onConflict: "habit_id,day" })
    : await supabase.from("habit_log").delete().eq("habit_id", habitId).eq("day", day);
  if (error) throw new Error(error.message);
  refresh();
}

export type ActionState = { error?: string; saved?: boolean };

export async function logSleep(_prev: ActionState, form: FormData): Promise<ActionState> {
  const day = String(form.get("day") ?? "");
  const raw = String(form.get("hours") ?? "").trim();
  if (!DAY.test(day)) return { error: "Bad day." };
  const { supabase, userId } = await requireUser();

  // Empty = remove that night's entry
  if (!raw) {
    const { error } = await supabase.from("sleep_log").delete().eq("day", day);
    if (error) return { error: error.message };
    refresh();
    return { saved: true };
  }

  const hours = Number(raw.replace(",", "."));
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
    return { error: "Hours of sleep, between 0 and 24 (like 7.5)." };
  }
  const { error } = await supabase
    .from("sleep_log")
    .upsert({ user_id: userId, day, hours }, { onConflict: "user_id,day" });
  if (error) return { error: error.message };
  refresh();
  return { saved: true };
}
