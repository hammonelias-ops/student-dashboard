import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { CalendarView } from "@/components/calendar-view";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getClasses, getEvents, getTasks } from "@/lib/data";
import { fromDueAt } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Calendar · Student Dashboard" };

export default function CalendarPage() {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Calendar" subtitle="Deadlines, school dates and events together." />
        <Link href="/calendar/events/new" className={buttonVariants({ size: "lg" })}>
          <Plus />
          <span className="hidden sm:inline">Add event</span>
          <span className="sm:hidden">Event</span>
        </Link>
      </div>
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-muted/30" />}>
        <Calendar />
      </Suspense>
    </>
  );
}

async function Calendar() {
  const [tz, classes, tasks, events] = await Promise.all([getTimeZone(), getClasses(), getTasks(), getEvents()]);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const calendarTasks = tasks.map((t) => {
    const cls = classById.get(t.class_id);
    return {
      id: t.id,
      title: t.title,
      day: fromDueAt(t.due_at, tz).date,
      done: t.done,
      code: cls?.code ?? null,
      color: cls?.color ?? null,
    };
  });

  return <CalendarView tasks={calendarTasks} events={events} />;
}
