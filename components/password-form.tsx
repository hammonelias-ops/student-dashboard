"use client";

import { useActionState, useEffect, useRef } from "react";

import { setPassword, type LoginState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<LoginState, FormData>(setPassword, { status: "idle" });

  useEffect(() => {
    if (state.status === "sent") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="max-w-sm space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={`${inputClass} h-10`}
        />
      </Field>
      <Field label="Type it again" htmlFor="confirm">
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={`${inputClass} h-10`}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
      {state.status === "sent" && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      )}
      <FormError message={state.status === "error" ? state.message : undefined} />
    </form>
  );
}
