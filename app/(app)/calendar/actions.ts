"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/data";
import { isEventKind } from "@/lib/events";
import { fromDueAt, toDueAt } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export type EventFormState = { status: "idle" | "error" | "saved"; message?: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveEvent(_prev: EventFormState, form: FormData): Promise<EventFormState> {
  const { supabase } = await requireUser();
  const id = text(form, "id") || null;
  const title = text(form, "title");
  const kind = text(form, "kind");
  const start = text(form, "start_date");
  const end = text(form, "end_date") || start;
  const startTime = text(form, "start_time");
  const endTime = text(form, "end_time");

  if (!title) return { status: "error", message: "Give it a name." };
  if (!isEventKind(kind)) return { status: "error", message: "Pick a type." };
  if (!DAY.test(start) || !DAY.test(end)) return { status: "error", message: "Pick a start date." };
  if (end < start) return { status: "error", message: "The end date is before the start date." };
  if ((startTime && !TIME.test(startTime)) || (endTime && !TIME.test(endTime))) {
    return { status: "error", message: "That time doesn't look right." };
  }

  const fields = {
    title,
    kind,
    start_date: start,
    end_date: end,
    start_time: startTime || null,
    end_time: endTime || null,
    location: text(form, "location") || null,
    note: text(form, "note") || null,
  };
  const { error } = id
    ? await supabase.from("events").update(fields).eq("id", id)
    : await supabase.from("events").insert(fields);
  if (error) return { status: "error", message: error.message };
  return { status: "saved" };
}

export async function deleteEvent(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Dragging an assignment to another day: keep its time of day, change the date
export async function moveTask(id: string, day: string) {
  if (!DAY.test(day)) throw new Error("Bad day");
  const { supabase } = await requireUser();
  const tz = await getTimeZone();
  const { data: task, error } = await supabase.from("tasks").select("due_at").eq("id", id).single();
  if (error) throw new Error(error.message);

  const dueAt = toDueAt(day, fromDueAt(task.due_at, tz).time, tz);
  if (!dueAt) throw new Error("Bad day");
  const { error: updateError } = await supabase.from("tasks").update({ due_at: dueAt }).eq("id", id);
  if (updateError) throw new Error(updateError.message);
  refresh();
}
