import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Flame, Plus } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { QuickAdd } from "@/components/quick-add";
import { TaskRowItem } from "@/components/task-row";
import { buttonVariants } from "@/components/ui/button";
import { getClasses, getDailyPick, getEvents, getHabitSummary, getTasks } from "@/lib/data";
import { breakOn } from "@/lib/events";
import type { ClassRow, TaskRow } from "@/lib/tasks";
import { dayjs, formatDue } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";
import { parseDailyPick, rankTasks, type Scored } from "@/lib/urgency";

export default function TodayPage() {
  return (
    <>
      <Suspense fallback={<TodaySkeleton />}>
        <Today />
      </Suspense>
      <div className="mt-10 flex items-center gap-4 text-sm text-muted-foreground">
        <a href="/problem.html" className="underline underline-offset-4 hover:text-foreground">
          Project problem definition
        </a>
        {/* Phone only: the desktop sidebar has its own sign-out button */}
        <form action={signOut} className="md:hidden">
          <button type="submit" className="underline underline-offset-4 hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function Today() {
  const tz = await getTimeZone();
  const now = new Date();
  const local = dayjs(now).tz(tz);
  const todayKey = local.format("YYYY-MM-DD");
  const endOfToday = local.endOf("day");
  const endOfTomorrow = local.add(1, "day").endOf("day");

  const [classes, tasks, pickRaw, habits, events] = await Promise.all([
    getClasses(),
    getTasks(),
    getDailyPick(todayKey),
    getHabitSummary(todayKey),
    getEvents(),
  ]);
  // On a break day (Thanksgiving, winter break…) the Top 3 steps aside
  const onBreak = breakOn(todayKey, events);
  const backOn = onBreak ? dayjs(onBreak.end_date).add(1, "day") : null;
  const classById = new Map(classes.map((c) => [c.id, c]));
  const open = tasks.filter((t) => !t.done);
  const dueByToday = open.filter((t) => !dayjs(t.due_at).isAfter(endOfToday));

  // Top 3: Claude's pick from today's gradebook check if there is one, otherwise the formula
  const ranked = rankTasks(open, classById, now);
  const pick = parseDailyPick(pickRaw);
  let top: Scored[] = ranked.slice(0, 3);
  let pickedByClaude = false;
  if (pick) {
    const byId = new Map(ranked.map((s) => [s.task.id, s]));
    const picked = pick
      .map((p) => {
        const s = byId.get(p.task_id);
        return s && { ...s, reasons: p.reason ? [p.reason] : s.reasons };
      })
      .filter((s): s is Scored => Boolean(s))
      .slice(0, 3);
    if (picked.length) {
      pickedByClaude = true;
      // Top up from the formula if some picks are already done
      const ids = new Set(picked.map((s) => s.task.id));
      top = [...picked, ...ranked.filter((s) => !ids.has(s.task.id))].slice(0, 3);
    }
  }
  const topIds = new Set(top.map((s) => s.task.id));

  const restOfToday = dueByToday.filter((t) => !topIds.has(t.id));
  const tomorrow = open.filter(
    (t) =>
      !topIds.has(t.id) &&
      dayjs(t.due_at).isAfter(endOfToday) &&
      !dayjs(t.due_at).isAfter(endOfTomorrow)
  );

  const listProps = { classById, tz, now };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{local.format("dddd, MMMM D")}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
          {greeting(local.hour())}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {open.length} open, {dueByToday.length} due today or overdue
        </p>
      </header>

      <QuickAdd classes={classes} />

      {classes.length === 0 ? (
        <EmptyState
          title="Start by adding your classes"
          body="Then add assignments, and the most urgent ones show up here."
          href="/assignments/classes/new"
          action="Add class"
        />
      ) : open.length === 0 ? (
        <EmptyState
          title="Nothing to do right now"
          body="New assignments show up here, sorted by what's most urgent."
          href="/assignments/new"
          action="Add assignment"
        />
      ) : onBreak ? (
        <section className="space-y-3">
          <div className="rounded-xl border px-4 py-3">
            <p className="font-medium">{onBreak.title}</p>
            <p className="text-sm text-muted-foreground">
              No Top 3 today. School&apos;s back {backOn!.format("dddd, MMM D")}.
            </p>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
              Still on your list ({open.length})
            </summary>
            <TaskList tasks={ranked.map((s) => s.task)} {...listProps} />
          </details>
        </section>
      ) : (
        <section aria-labelledby="top3">
          <h2 id="top3" className="text-sm font-medium text-muted-foreground">
            Top 3{pickedByClaude && <span className="font-normal"> · picked from today&apos;s gradebook check</span>}
          </h2>
          <ul className="mt-1 divide-y rounded-xl border px-4">
            {top.map((s) => (
              <TaskRowItem
                key={s.task.id}
                task={s.task}
                cls={classById.get(s.task.class_id)}
                dueLabel={formatDue(s.task.due_at, tz, now)}
                reasons={s.reasons}
              />
            ))}
          </ul>
        </section>
      )}

      {!onBreak && restOfToday.length > 0 && (
        <section aria-labelledby="today-rest">
          <h2 id="today-rest" className="text-sm font-medium text-muted-foreground">
            Also today and from before ({restOfToday.length})
          </h2>
          <TaskList tasks={restOfToday} {...listProps} />
        </section>
      )}

      {!onBreak && tomorrow.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
            Tomorrow ({tomorrow.length})
          </summary>
          <TaskList tasks={tomorrow} {...listProps} />
        </details>
      )}

      <Link
        href="/habits"
        className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
      >
        <Flame className="size-4 text-primary" />
        {habits.total === 0 ? (
          <span className="text-muted-foreground">Add daily goals like &quot;Workout 30 min&quot;</span>
        ) : (
          <span>
            Habits: <span className="font-medium">{habits.done} of {habits.total}</span> today
          </span>
        )}
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}

function TaskList({
  tasks,
  classById,
  tz,
  now,
}: {
  tasks: TaskRow[];
  classById: Map<string, ClassRow>;
  tz: string;
  now: Date;
}) {
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

function EmptyState({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{body}</p>
      <Link href={href} className={`${buttonVariants({ size: "lg" })} mt-4`}>
        <Plus />
        {action}
      </Link>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="h-7 w-56 rounded bg-muted" />
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="mt-8 h-40 rounded-xl bg-muted/50" />
    </div>
  );
}
