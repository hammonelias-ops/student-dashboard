import { Suspense } from "react";

import { BottomTabs, Sidebar } from "@/components/app-nav";

// Signed-in app: nav + content. proxy.ts sends signed-out visitors to /login.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24 md:ml-56 md:max-w-none md:px-10 md:pt-10 md:pb-10">
        {children}
      </main>
      <Suspense>
        <BottomTabs />
      </Suspense>
    </>
  );
}
