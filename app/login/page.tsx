import { Suspense } from "react";
import { BookOpen } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Student Dashboard" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-heading text-lg font-semibold">
          <BookOpen className="size-5 text-primary" />
          Student Dashboard
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
