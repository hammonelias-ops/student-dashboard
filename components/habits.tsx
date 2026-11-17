"use client";

import { useActionState, useEffect, useOptimistic, useRef, useTransition } from "react";
import { Flame, Plus, X } from "lucide-react";

import { addHabit, deleteHabit, logSleep, setHabitDone } from "@/app/(app)/habits/actions";
import { Button } from "@/components/ui/button";
import { FormError, inputClass } from "@/components/ui/field";
import { streak } from "@/lib/habits";
import { dayjs } from "@/lib/time";
import { cn } from "@/lib/utils";

// ───────────────────────── Daily goals ─────────────────────────

export function HabitRow({
  id,
  name,
  doneDays,
  week,
  today,
}: {
  id: string;
  name: string;
  doneDays: string[];
  week: string[]; // last 7 day keys, oldest first (ends with today)
  today: string;
}) {
  const [, startTransition] = useTransition();
  const [days, toggleDay] = useOptimistic(new Set(doneDays), (set: Set<string>, day: string) => {
    const next = new Set(set);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    return next;
  });

  const toggle = (day: string) =>
    startTransition(async () => {
      const done = !days.has(day);
      toggleDay(day);
      await setHabitDone(id, day, done);
    });

  const remove = () => {
    if (!confirm(`Delete "${name}" and its history?`)) return;
    startTransition(() => deleteHabit(id));
  };

  const doneToday = days.has(today);
  const count = streak(days, today);

  return (
    <li className="group flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={doneToday}
          onChange={() => toggle(today)}
          className="size-5 shrink-0 cursor-pointer accent-primary"
        />
        <span className={cn("truncate font-medium", doneToday && "text-muted-foreground")}>{name}</span>
        {count > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={`${count}-day streak`}>
            <Flame className={cn("size-3.5", doneToday && "text-primary")} />
            {count}
          </span>
        )}
      </label>

      <div className="flex items-center gap-1.5 pl-8 sm:pl-0">
        {week.map((day) => {
          const done = days.has(day);
          const d = dayjs(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              aria-pressed={done}
              aria-label={`${name}, ${d.format("dddd MMM D")}: ${done ? "done" : "not done"}`}
              title={d.format("ddd, MMM D")}
              className="flex flex-col items-center gap-1 rounded-md p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "size-4 rounded-full border",
                  done ? "border-primary bg-primary" : "border-border bg-transparent",
                  day === today && "ring-2 ring-ring/40 ring-offset-1 ring-offset-background"
                )}
              />
              <span className="text-[10px] leading-none text-muted-foreground">{d.format("dd")[0]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={remove}
          aria-label={`Delete ${name}`}
          className="ml-2 rounded p-1 text-muted-foreground opacity-60 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-60 sm:focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

export function AddHabitForm({ autoFocus }: { autoFocus?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addHabit, {});

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={80}
          autoFocus={autoFocus}
          placeholder="Add a daily goal, like “Workout 30 min”"
          aria-label="New daily goal"
          className={`${inputClass} h-10`}
        />
        <Button type="submit" size="lg" disabled={pending} className="h-10 shrink-0">
          <Plus />
          Add
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

// ───────────────────────── Sleep ─────────────────────────

export function SleepForm({ today, hours }: { today: string; hours: number | null }) {
  const [state, action, pending] = useActionState(logSleep, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="day" value={today} />
      <label htmlFor="hours" className="block text-sm font-medium">
        Hours of sleep last night
      </label>
      <div className="flex gap-2">
        <input
          key={hours ?? "empty"}
          id="hours"
          name="hours"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.25}
          defaultValue={hours ?? ""}
          placeholder="7.5"
          className={`${inputClass} h-10 w-28`}
        />
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-10">
          {pending ? "Saving…" : hours == null ? "Log" : "Update"}
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
