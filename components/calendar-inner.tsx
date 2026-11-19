"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import type { EventDropArg, EventInput } from "@fullcalendar/core";

import { moveTask } from "@/app/(app)/calendar/actions";
import { EVENT_KINDS, eventKind, type EventRow } from "@/lib/events";
import { dayjs } from "@/lib/time";

export type CalendarTask = {
  id: string;
  title: string;
  day: string; // due date in the user's time zone
  done: boolean;
  code: string | null;
  color: string | null;
};

const VIEW_KEY = "calendar-view";
const VIEWS = ["schoolYear", "dayGridMonth", "dayGridWeek"] as const;
type View = (typeof VIEWS)[number];

// School year containing `date`: Aug 1 → Jun 1 (exclusive), i.e. August through May
function schoolYear(date: Date) {
  const d = dayjs(date);
  const startYear = d.month() >= 7 ? d.year() : d.year() - 1;
  return { start: `${startYear}-08-01`, end: `${startYear + 1}-06-01` };
}

// Starting view: the last one used, else the school year on desktop and the month on phones
function pickInitialView(): View {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(VIEW_KEY);
  } catch {}
  if (VIEWS.includes(saved as View)) return saved as View;
  return window.matchMedia("(min-width: 768px)").matches ? "schoolYear" : "dayGridMonth";
}

const nextDay = (day: string) => dayjs(day).add(1, "day").format("YYYY-MM-DD");

function toCalendarEvents(tasks: CalendarTask[], events: EventRow[]): EventInput[] {
  const out: EventInput[] = [];

  for (const e of events) {
    const { color } = eventKind(e.kind);
    const base = { title: e.title, extendedProps: { type: "event", id: e.id }, color, textColor: "#0b0b0c" };
    const oneDay = e.start_date === e.end_date;

    if (e.kind === "break") {
      // Shade every day it covers, plus a label bar
      out.push({ start: e.start_date, end: nextDay(e.end_date), display: "background", color, groupId: `bg-${e.id}` });
      out.push({ ...base, id: e.id, start: e.start_date, end: nextDay(e.end_date), allDay: true });
    } else if (oneDay && e.start_time) {
      out.push({
        ...base,
        id: e.id,
        start: `${e.start_date}T${e.start_time}`,
        end: e.end_time ? `${e.start_date}T${e.end_time}` : undefined,
        allDay: false,
      });
    } else {
      out.push({ ...base, id: e.id, start: e.start_date, end: nextDay(e.end_date), allDay: true });
    }
  }

  for (const t of tasks) {
    out.push({
      id: `task-${t.id}`,
      title: `${t.code ? `${t.code} · ` : ""}${t.done ? "✓ " : ""}${t.title}`,
      start: t.day,
      allDay: true,
      color: t.color ?? "#5b8def",
      textColor: "#0b0b0c",
      startEditable: !t.done, // drag to a new day = new due date
      classNames: t.done ? ["fc-task-done"] : ["fc-task"],
      extendedProps: { type: "task", id: t.id },
    });
  }
  return out;
}

export default function CalendarInner({ tasks, events }: { tasks: CalendarTask[]; events: EventRow[] }) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  // Browser-only component (see calendar-view.tsx), so window/localStorage are available here
  const [initialView] = useState(pickInitialView);
  const [error, setError] = useState<string>();

  const calendarEvents = useMemo(() => toCalendarEvents(tasks, events), [tasks, events]);

  async function onDrop(info: EventDropArg) {
    const { type, id } = info.event.extendedProps as { type: string; id: string };
    if (type !== "task") return info.revert();
    setError(undefined);
    try {
      await moveTask(id, info.event.startStr.slice(0, 10));
      router.refresh();
    } catch {
      info.revert();
      setError("Couldn't move that assignment. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <div className="student-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={initialView}
          views={{
            schoolYear: {
              type: "multiMonth",
              buttonText: "School year",
              visibleRange: (current: Date) => schoolYear(current),
              dateIncrement: { years: 1 },
              multiMonthMaxColumns: 4,
              multiMonthMinWidth: 220,
            },
            dayGridMonth: { buttonText: "Month" },
            dayGridWeek: { buttonText: "Week" },
          }}
          headerToolbar={{ left: "prev,next today", center: "title", right: VIEWS.join(",") }}
          buttonText={{ today: "Today" }}
          height="auto"
          fixedWeekCount={false}
          dayMaxEvents={3}
          firstDay={0}
          events={calendarEvents}
          eventDurationEditable={false}
          eventDrop={onDrop}
          eventClick={(info) => {
            const { type, id } = info.event.extendedProps as { type?: string; id?: string };
            if (!id) return;
            info.jsEvent.preventDefault();
            router.push(type === "task" ? `/assignments/${id}` : `/calendar/events/${id}`);
          }}
          dateClick={(info) => {
            // Year view: tap a day to open its month. Month/week: tap a day to add an event on it.
            if (info.view.type === "multiMonth") {
              info.view.calendar.changeView("dayGridMonth", info.dateStr);
            } else {
              router.push(`/calendar/events/new?date=${info.dateStr.slice(0, 10)}`);
            }
          }}
          datesSet={(info) => {
            const view = info.view.type === "multiMonth" ? "schoolYear" : info.view.type;
            try {
              localStorage.setItem(VIEW_KEY, view);
            } catch {}
          }}
        />
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {EVENT_KINDS.map((k) => (
        <li key={k.value} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: k.color }} />
          {k.label}
        </li>
      ))}
      <li>Assignments use their class color. Drag one to change its due date.</li>
    </ul>
  );
}
