"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { saveClass, type FormState } from "@/app/(app)/assignments/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import type { ClassRow } from "@/lib/tasks";

export function ClassForm({ initial }: { initial?: ClassRow }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(saveClass, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "saved") {
      router.push("/assignments");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="max-w-lg space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <Field label="Class name" htmlFor="name" required>
        <input
          id="name"
          name="name"
          required
          autoFocus={!initial}
          defaultValue={initial?.name}
          placeholder="Chemistry"
          className={`${inputClass} h-10`}
        />
      </Field>

      <Field label="Teacher" htmlFor="teacher">
        <input
          id="teacher"
          name="teacher"
          defaultValue={initial?.teacher ?? ""}
          placeholder="Ms. Rivera"
          className={`${inputClass} h-10`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Current grade %" htmlFor="grade">
          <input
            id="grade"
            name="grade"
            inputMode="decimal"
            defaultValue={initial?.grade ?? ""}
            placeholder="92"
            className={`${inputClass} h-10`}
          />
        </Field>
        <Field label="Goal %" htmlFor="goal">
          <input
            id="goal"
            name="goal"
            inputMode="decimal"
            defaultValue={initial?.goal ?? 85}
            className={`${inputClass} h-10`}
          />
        </Field>
      </div>

      <Field
        label="Short code"
        htmlFor="code"
        hint={initial ? undefined : "Leave blank to make one from the name (Chemistry → CHM). A color is picked for you."}
      >
        <input
          id="code"
          name="code"
          maxLength={5}
          defaultValue={initial?.code ?? ""}
          placeholder="Auto"
          className={`${inputClass} h-10 uppercase placeholder:normal-case`}
        />
      </Field>

      <FormError message={state.status === "error" ? state.message : undefined} />

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save class" : "Add class"}
        </Button>
        <Link href="/assignments" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
