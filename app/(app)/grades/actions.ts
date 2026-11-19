"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/data";

export type GradeFormState = { error?: string; saved?: boolean };

// Log a grade by hand (the Stage 10 gradebook check does this automatically):
// adds a point to the trend and updates the class's current grade.
export async function logGrade(_prev: GradeFormState, form: FormData): Promise<GradeFormState> {
  const classId = String(form.get("class_id") ?? "");
  const raw = String(form.get("percent") ?? "").replace("%", "").trim();
  const percent = Number(raw);
  if (!classId) return { error: "Pick a class." };
  if (!raw || !Number.isFinite(percent) || percent < 0 || percent > 150) {
    return { error: "Enter a percentage, like 91.5." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("grades").insert({ class_id: classId, percent });
  if (error) return { error: error.message };
  const { error: classError } = await supabase.from("classes").update({ grade: percent }).eq("id", classId);
  if (classError) return { error: classError.message };
  refresh();
  return { saved: true };
}
