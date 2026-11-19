"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { sendMagicLink, signInWithPassword, type LoginState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-10 w-full rounded-lg border bg-input/30 px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

// Email + password (works in the installed phone app), with "email me a link" for the first
// sign-in or a forgotten password.
export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [signIn, signInAction, signingIn] = useActionState<LoginState, FormData>(signInWithPassword, {
    status: "idle",
  });
  const [link, linkAction, sendingLink] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (link.status === "sent") {
    return (
      <div className="rounded-xl border p-5 text-sm">
        <p className="font-medium">Link sent</p>
        <p className="mt-1 text-muted-foreground">{link.message}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          After you&apos;re in, set a password on the Account page so you can sign in on your phone.
        </p>
      </div>
    );
  }

  const linkError = params.get("error") === "link";
  const message =
    (signIn.status === "error" && signIn.message) ||
    (link.status === "error" && link.message) ||
    (linkError && "That link didn't work or has expired. Only the newest link works: send a new one.");

  return (
    <form action={signInAction} className="space-y-3 rounded-xl border p-5">
      <label htmlFor="email" className="block text-sm font-medium">
        Email
      </label>
      <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      <label htmlFor="password" className="block text-sm font-medium">
        Password
      </label>
      <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" size="lg" className="w-full" disabled={signingIn || sendingLink}>
        {signingIn ? "Signing in…" : "Sign in"}
      </Button>
      <Button
        type="submit"
        formAction={linkAction}
        formNoValidate
        variant="ghost"
        size="lg"
        className="w-full text-muted-foreground"
        disabled={signingIn || sendingLink}
      >
        {sendingLink ? "Sending…" : "No password yet? Email me a link"}
      </Button>
      {message && (
        <p className="text-sm text-muted-foreground" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
