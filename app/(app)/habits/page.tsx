import { Suspense } from "react";

import { AddHabitForm, HabitRow, SleepForm } from "@/components/habits";
import { PageHeader } from "@/components/page-header";
import { getHabits, getSleep } from "@/lib/data";
import { averageHours, formatHours, lastDays } from "@/lib/habits";
import { dayjs } from "@/lib/time";
import { getTimeZone } from "@/lib/time-zone";

export const metadata = { title: "Habits · Student Dashboard" };

// Enough history for a long streak without loading everything
const HISTORY_DAYS = 400;
// Sleep chart: bars are scaled to this many hours
const SLEEP_SCALE = 10;
const SLEEP_GOAL = 8;

export default function HabitsPage() {
  return (
    <>
      <PageHeader title="Habits" subtitle="Am I taking care of myself?" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Habits />
      </Suspense>
    </>
  );
}

async function Habits() {
  const tz = await getTimeZone();
  const today = dayjs(new Date()).tz(tz).format("YYYY-MM-DD");
  const week = lastDays(today, 7);
  const since = lastDays(today, HISTORY_DAYS)[0];

  const [habits, sleep] = await Promise.all([getHabits(since), getSleep(week[0])]);
  const doneToday = habits.filter((h) => h.days.has(today)).length;

  const nights = week.map((day) => ({ day, hours: sleep[day] ?? null }));
  const avg = averageHours(nights.map((n) => n.hours));

  return (
    <div className="space-y-10">
      <section aria-labelledby="goals">
        <div className="flex items-baseline justify-between">
          <h2 id="goals" className="text-sm font-medium text-muted-foreground">
            Daily goals
          </h2>
          {habits.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {doneToday} of {habits.length} today
            </p>
          )}
        </div>
        {habits.length > 0 ? (
          <ul className="divide-y">
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                id={h.id}
                name={h.name}
                doneDays={[...h.days]}
                week={week}
                today={today}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Add the things you want to do every day. Check them off here, and the Today page shows how
            many are done.
          </p>
        )}
        <div className="mt-4">
          <AddHabitForm autoFocus={habits.length === 0} />
        </div>
      </section>

      <section aria-labelledby="sleep" className="space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 id="sleep" className="text-sm font-medium text-muted-foreground">
            Sleep
          </h2>
          <p className="text-sm text-muted-foreground">
            7-day average:{" "}
            <span className="font-medium text-foreground">{avg == null ? "—" : formatHours(avg)}</span>
          </p>
        </div>

        <SleepForm today={today} hours={sleep[today] ?? null} />

        <figure aria-label="Hours of sleep, last 7 nights">
          <div className="relative flex h-32 items-end gap-2">
            {/* Goal line */}
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
              style={{ bottom: `${(SLEEP_GOAL / SLEEP_SCALE) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-[10px] text-muted-foreground">{SLEEP_GOAL} h</span>
            </div>
            {nights.map(({ day, hours }) => (
              <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${dayjs(day).format("ddd, MMM D")}: ${hours == null ? "not logged" : formatHours(hours)}`}>
                {hours == null ? (
                  <div className="h-1 rounded-sm bg-muted" />
                ) : (
                  <div
                    className="rounded-sm bg-primary/70"
                    style={{ height: `${Math.min(hours / SLEEP_SCALE, 1) * 100}%` }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            {nights.map(({ day, hours }) => (
              <div key={day} className="flex-1 text-center text-[11px] leading-tight text-muted-foreground">
                <div className={day === today ? "font-medium text-foreground" : undefined}>
                  {day === today ? "Today" : dayjs(day).format("ddd")}
                </div>
                <div>{hours == null ? "–" : Number(hours.toFixed(2))}</div>
              </div>
            ))}
          </div>
        </figure>
      </section>
    </div>
  );
}
