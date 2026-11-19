"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { logGrade, type GradeFormState } from "@/app/(app)/grades/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";

type ClassOption = { id: string; label: string; grade: number | null; goal: number };

// ───────────────────────── What do I need on the final? ─────────────────────────

// Weighted average: final grade = current × (1 − w) + final exam × w
// → final exam needed = (target − current × (1 − w)) / w
export function neededOnFinal(current: number, weightPct: number, target: number) {
  const w = weightPct / 100;
  if (w <= 0 || w >= 1) return null;
  return (target - current * (1 - w)) / w;
}

export function FinalCalculator({ classes }: { classes: ClassOption[] }) {
  const first = classes[0];
  const [classId, setClassId] = useState(first?.id ?? "");
  const [current, setCurrent] = useState(first?.grade != null ? String(first.grade) : "");
  const [weight, setWeight] = useState("20");
  const [target, setTarget] = useState(first ? String(first.goal) : "85");

  function pick(id: string) {
    setClassId(id);
    const c = classes.find((x) => x.id === id);
    if (c?.grade != null) setCurrent(String(c.grade));
    if (c) setTarget(String(c.goal));
  }

  const cur = Number(current);
  const w = Number(weight);
  const t = Number(target);
  const valid = current !== "" && Number.isFinite(cur) && Number.isFinite(w) && Number.isFinite(t);
  const needed = valid ? neededOnFinal(cur, w, t) : null;

  let result: React.ReactNode = <span className="text-muted-foreground">Fill in the numbers above.</span>;
  if (valid && (w <= 0 || w >= 100)) {
    result = <span className="text-muted-foreground">The final&apos;s weight must be between 1 and 99%.</span>;
  } else if (needed != null) {
    const rounded = Math.ceil(needed * 10) / 10;
    result =
      needed <= 0 ? (
        <>You keep <strong>{t}%</strong> even with a 0 on the final.</>
      ) : needed > 100 ? (
        <>
          You&apos;d need <strong>{rounded}%</strong>, which is above 100. {t}% isn&apos;t reachable with the final
          alone; extra credit or other assignments would have to make up the difference.
        </>
      ) : (
        <>
          You need at least <strong className="text-lg">{rounded}%</strong> on the final to finish with {t}%.
        </>
      );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Class" htmlFor="calc-class" className="sm:col-span-4">
          <select
            id="calc-class"
            value={classId}
            onChange={(e) => pick(e.target.value)}
            className={`${inputClass} h-10`}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grade now %" htmlFor="calc-current">
          <input id="calc-current" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${inputClass} h-10`} />
        </Field>
        <Field label="Final is worth %" htmlFor="calc-weight">
          <input id="calc-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={`${inputClass} h-10`} />
        </Field>
        <Field label="Want to finish with %" htmlFor="calc-target" className="sm:col-span-2">
          <input id="calc-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputClass} h-10`} />
        </Field>
      </div>
      <p className="rounded-lg border px-4 py-3 text-sm" aria-live="polite">
        {result}
      </p>
    </div>
  );
}

// ───────────────────────── Log a grade by hand ─────────────────────────

export function LogGradeForm({ classes }: { classes: ClassOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<GradeFormState, FormData>(logGrade, {});

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select name="class_id" required defaultValue="" aria-label="Class" className={`${inputClass} h-10 sm:flex-1`}>
          <option value="" disabled>
            Pick a class
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          name="percent"
          required
          inputMode="decimal"
          placeholder="91.5"
          aria-label="Grade percent"
          className={`${inputClass} h-10 sm:w-28`}
        />
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-10">
          {pending ? "Saving…" : "Log grade"}
        </Button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}
