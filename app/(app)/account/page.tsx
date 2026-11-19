import { Suspense } from "react";

import { signOut } from "@/app/auth/actions";
import { PageHeader } from "@/components/page-header";
import { PasswordForm } from "@/components/password-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/data";

export const metadata = { title: "Account · Student Dashboard" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account" />
      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Signed in as</h2>
          <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
            <Email />
          </Suspense>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Password</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Sign in with your email and this password on any device, including the app on your phone&apos;s home
            screen. Forgot it? Use &ldquo;Email me a link&rdquo; on the sign-in page, then set a new one here.
          </p>
          <PasswordForm />
        </section>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg">
            Sign out on this device
          </Button>
        </form>
      </div>
    </>
  );
}

async function Email() {
  const { supabase } = await requireUser();
  const { data } = await supabase.auth.getClaims();
  return <p className="font-medium">{String(data?.claims?.email ?? "")}</p>;
}
