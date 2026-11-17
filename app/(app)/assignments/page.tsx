import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TaskRowItem } from "@/components/task-row";
import { buttonVariants } from "@/components/ui/button";
import { getClasses, getTasks } from "@/lib/data";
import type { ClassRow, TaskRow } from "@/lib/tasks";
import { dayjs, formatDue } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Assignments · Student Dashboard" };

export default function AssignmentsPage() {
  return (
    <>
      <PageHeader title="Assignments" subtitle="Everything that's due, by class." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Assignments />
      </Suspense>
    </>
  );
}

async function Assignments() {
  const [classes, tasks, tz] = await Promise.all([getClasses(), getTasks(), getTimeZone()]);

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm">
        <p className="font-medium">Start by adding your classes</p>
        <p className="mt-1 text-muted-foreground">
          Each class gets a short code and its own color, used everywhere in the dashboard.
        </p>
        <Link href="/assignments/classes/new" className={`${buttonVariants({ size: "lg" })} mt-4`}>
          <Plus />
          Add class
        </Link>
      </div>
    );
  }

  const now = new Date();
  const startOfToday = dayjs(now).tz(tz).startOf("day");
  const open = tasks.filter((t) => !t.done);
  // Calm: earlier unfinished work rolls forward under its own heading, no red warnings
  const earlier = open.filter((t) => dayjs(t.due_at).isBefore(startOfToday));
  const upcoming = open.filter((t) => !dayjs(t.due_at).isBefore(startOfToday));
  const done = tasks.filter((t) => t.done).reverse();
  const classById = new Map(classes.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <ClassStrip classes={classes} />

      <Link href="/assignments/new" className={buttonVariants({ size: "lg" })}>
        <Plus />
        Add assignment
      </Link>

      {open.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing to do. Add an assignment when you get one.</p>
      )}

      <TaskSection title="From before" tasks={earlier} classById={classById} tz={tz} now={now} />
      <TaskSection title="Coming up" tasks={upcoming} classById={classById} tz={tz} now={now} />

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
            Done ({done.length})
          </summary>
          <TaskList tasks={done} classById={classById} tz={tz} now={now} />
        </details>
      )}
    </div>
  );
}

function ClassStrip({ classes }: { classes: ClassRow[] }) {
  return (
    <section aria-label="Classes" className="flex flex-wrap gap-2">
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/assignments/classes/${c.id}`}
          title={`Edit ${c.name}`}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted/50"
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color ?? undefined }} />
          <span className="font-medium">{c.code}</span>
          <span className="text-muted-foreground">{c.name}</span>
          {c.grade != null && <span className="text-muted-foreground">· {Number(c.grade)}%</span>}
        </Link>
      ))}
      <Link
        href="/assignments/classes/new"
        className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Class
      </Link>
    </section>
  );
}

type ListProps = { tasks: TaskRow[]; classById: Map<string, ClassRow>; tz: string; now: Date };

function TaskSection({ title, ...props }: ListProps & { title: string }) {
  if (props.tasks.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground">
        {title} ({props.tasks.length})
      </h2>
      <TaskList {...props} />
    </section>
  );
}

function TaskList({ tasks, classById, tz, now }: ListProps) {
  return (
    <ul className="divide-y">
      {tasks.map((t) => (
        <TaskRowItem
          key={t.id}
          task={t}
          cls={classById.get(t.class_id)}
          dueLabel={formatDue(t.due_at, tz, now)}
        />
      ))}
    </ul>
  );
}
