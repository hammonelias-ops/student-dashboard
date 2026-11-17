"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { sendMagicLink, type LoginState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="rounded-xl border p-5 text-sm">
        <p className="font-medium">Link sent</p>
        <p className="mt-1 text-muted-foreground">{state.message} You can close this tab.</p>
      </div>
    );
  }

  const linkError = params.get("error") === "link";

  return (
    <form action={action} className="space-y-3 rounded-xl border p-5">
      <label htmlFor="email" className="block text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="h-10 w-full rounded-lg border bg-input/30 px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
      <input type="hidden" name="next" value={params.get("next") ?? "/"} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      {(state.status === "error" || linkError) && (
        <p className="text-sm text-muted-foreground" role="alert">
          {state.message ?? "That link didn't work or has expired. Send a new one."}
        </p>
      )}
    </form>
  );
}
