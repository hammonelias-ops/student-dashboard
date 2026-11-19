"use server";

import { refresh } from "next/cache";

import { pickColor, shortCode } from "@/lib/classes";
import { requireUser } from "@/lib/data";
import { isTaskKind } from "@/lib/tasks";
import { toDueAt } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export type FormState = { status: "idle" | "error" | "saved"; message?: string; id?: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || null;

// "92.5" → 92.5, "" → null, anything out of 0–150 → NaN (rejected)
function percent(form: FormData, key: string) {
  const raw = text(form, key).replace("%", "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 150 ? n : NaN;
}

// ───────────────────────── Classes ─────────────────────────

export async function saveClass(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = optional(form, "id");
  const name = text(form, "name");
  const grade = percent(form, "grade");
  const goal = percent(form, "goal") ?? 85;

  if (!name) return { status: "error", message: "Give the class a name." };
  if (Number.isNaN(grade) || Number.isNaN(goal)) {
    return { status: "error", message: "Grades are percentages, like 92 or 85.5." };
  }

  const { data: others, error: listError } = await supabase.from("classes").select("id, code, color");
  if (listError) return { status: "error", message: listError.message };
  const rest = others.filter((c) => c.id !== id);

  // Short code: what was typed, or made from the name. Must be unique among your classes.
  const typedCode = text(form, "code").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const takenCodes = rest.map((c) => c.code);
  if (typedCode && takenCodes.includes(typedCode)) {
    return { status: "error", message: `Another class already uses ${typedCode}.` };
  }
  const code = typedCode || shortCode(name, takenCodes);

  const fields = { name, code, teacher: optional(form, "teacher"), grade, goal };

  const result = id
    ? await supabase.from("classes").update(fields).eq("id", id).select("id").single()
    : await supabase
        .from("classes")
        .insert({ ...fields, color: pickColor(rest.map((c) => c.color)) })
        .select("id")
        .single();

  if (result.error) return { status: "error", message: result.error.message };
  return { status: "saved", id: result.data.id };
}

// ───────────────────────── Assignments ─────────────────────────

export async function saveTask(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = optional(form, "id");
  const title = text(form, "title");
  const classId = text(form, "class_id");
  const date = text(form, "due_date");
  const kind = text(form, "kind");

  if (!title) return { status: "error", message: "Give the assignment a name." };
  if (!classId) return { status: "error", message: "Pick a class." };
  if (!date) return { status: "error", message: "Pick a due date." };
  if (!isTaskKind(kind)) return { status: "error", message: "Pick a type." };

  const dueAt = toDueAt(date, text(form, "due_time"), await getTimeZone());
  if (!dueAt) return { status: "error", message: "That due date or time doesn't look right." };

  const fields = {
    title,
    class_id: classId,
    teacher: optional(form, "teacher"),
    due_at: dueAt,
    kind,
    description: optional(form, "description"),
    priority: form.get("big") ? "high" : "normal",
    missing: Boolean(form.get("missing")),
  };

  // Where a new assignment came from: the form ("manual") or the mic in quick add ("voice")
  const source = text(form, "source") === "voice" ? "voice" : "manual";

  const result = id
    ? await supabase.from("tasks").update(fields).eq("id", id).select("id").single()
    : await supabase.from("tasks").insert({ ...fields, source }).select("id").single();

  if (result.error) return { status: "error", message: result.error.message };
  return { status: "saved", id: result.data.id };
}

export async function setTaskFlag(id: string, flag: "done" | "missing", value: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tasks").update({ [flag]: value }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteTask(id: string) {
  const { supabase } = await requireUser();
  // Remove the files first (the attachment rows go with the task via on delete cascade)
  const { data: files } = await supabase.from("attachments").select("path").eq("task_id", id);
  if (files?.length) {
    await supabase.storage.from("attachments").remove(files.map((f) => f.path));
  }
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAttachment(id: string) {
  const { supabase } = await requireUser();
  const { data: file } = await supabase.from("attachments").select("path").eq("id", id).maybeSingle();
  if (!file) return;
  await supabase.storage.from("attachments").remove([file.path]);
  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
