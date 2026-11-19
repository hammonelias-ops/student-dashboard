"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteEvent, saveEvent, type EventFormState } from "@/app/(app)/calendar/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { EVENT_KINDS, type EventKind, type EventRow } from "@/lib/events";

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

export function EventForm({ initial, defaultDate }: { initial?: EventRow; defaultDate?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<EventFormState, FormData>(saveEvent, { status: "idle" });
  const [deleting, startDelete] = useTransition();
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? "event");
  const [start, setStart] = useState(initial?.start_date ?? defaultDate ?? "");

  useEffect(() => {
    if (state.status === "saved") {
      router.push("/calendar");
      router.refresh();
    }
  }, [state, router]);

  function remove() {
    if (!initial || !confirm(`Delete "${initial.title}"?`)) return;
    startDelete(async () => {
      await deleteEvent(initial.id);
      router.push("/calendar");
      router.refresh();
    });
  }

  const showTimes = kind !== "break";

  return (
    <form action={action} className="max-w-lg space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <Field label="Name" htmlFor="title" required>
        <input
          id="title"
          name="title"
          required
          autoFocus={!initial}
          defaultValue={initial?.title}
          placeholder={kind === "shift" ? "Shift at the bakery" : "Christmas Concert"}
          className={`${inputClass} h-10`}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Type<span className="text-muted-foreground"> *</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_KINDS.map((k) => (
            <label
              key={k.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              <span className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: k.color }} />
              <span>
                {k.label}
                <span className="block text-xs text-muted-foreground">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="start_date" required>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={`${inputClass} h-10 [color-scheme:dark]`}
          />
        </Field>
        <Field label="End date" htmlFor="end_date" hint="For multi-day breaks and trips">
          <input
            id="end_date"
            name="end_date"
            type="date"
            min={start || undefined}
            defaultValue={initial && initial.end_date !== initial.start_date ? initial.end_date : ""}
            className={`${inputClass} h-10 [color-scheme:dark]`}
          />
        </Field>
      </div>

      {showTimes && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start time" htmlFor="start_time">
            <input
              id="start_time"
              name="start_time"
              type="time"
              defaultValue={hhmm(initial?.start_time)}
              className={`${inputClass} h-10 [color-scheme:dark]`}
            />
          </Field>
          <Field label="End time" htmlFor="end_time">
            <input
              id="end_time"
              name="end_time"
              type="time"
              defaultValue={hhmm(initial?.end_time)}
              className={`${inputClass} h-10 [color-scheme:dark]`}
            />
          </Field>
        </div>
      )}

      <Field label="Location" htmlFor="location">
        <input
          id="location"
          name="location"
          defaultValue={initial?.location ?? ""}
          placeholder="Chapel"
          className={`${inputClass} h-10`}
        />
      </Field>

      <Field label="Note" htmlFor="note">
        <textarea
          id="note"
          name="note"
          rows={2}
          defaultValue={initial?.note ?? ""}
          className={`${inputClass} py-2`}
        />
      </Field>

      {initial?.source === "school" && (
        <p className="text-xs text-muted-foreground">From the official school calendar.</p>
      )}

      <FormError message={state.status === "error" ? state.message : undefined} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={pending || deleting}>
          {pending ? "Saving…" : initial ? "Save" : "Add event"}
        </Button>
        <Link href="/calendar" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
        {initial && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={remove}
            disabled={pending || deleting}
            className="ml-auto text-muted-foreground"
          >
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
