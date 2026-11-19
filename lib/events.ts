import { dayjs } from "@/lib/time";

// Calendar event types (values match the `events.kind` check in SQL). Colors are kept
// apart from the class colors so assignments and events never look alike.
export const EVENT_KINDS = [
  { value: "event", label: "Event", color: "#f472b6", hint: "Concerts, trips, debates" },
  { value: "school", label: "School date", color: "#cbd5e1", hint: "Semester start/end, Friday School" },
  { value: "break", label: "Break / day off", color: "#64748b", hint: "Shaded on every day it covers" },
  { value: "shift", label: "Work shift", color: "#a3e635", hint: "With start and end time" },
] as const;

export type EventKind = (typeof EVENT_KINDS)[number]["value"];

export const isEventKind = (v: string): v is EventKind => EVENT_KINDS.some((k) => k.value === v);
export const eventKind = (v: string) => EVENT_KINDS.find((k) => k.value === v) ?? EVENT_KINDS[0];

export type EventRow = {
  id: string;
  title: string;
  kind: EventKind;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // inclusive
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
  location: string | null;
  note: string | null;
  source: "manual" | "school";
};

// Is `day` ("YYYY-MM-DD") inside any break? Returns that break, so the UI can name it.
export function breakOn(day: string, events: Pick<EventRow, "kind" | "start_date" | "end_date" | "title">[]) {
  return events.find((e) => e.kind === "break" && e.start_date <= day && day <= e.end_date) ?? null;
}

// "19:00:00" → "7 PM", "07:30:00" → "7:30 AM"
export function formatTime(time: string) {
  const t = dayjs(`2000-01-01T${time}`);
  return t.format(t.minute() === 0 ? "h A" : "h:mm A");
}
