import { signOut } from "@/app/auth/actions";
import { ComingSoon, PageHeader } from "@/components/page-header";

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" subtitle="What do I need to do today?" />
      <ComingSoon stage={4}>
        Top 3 by urgency, the rest of today and overdue, tomorrow, and a habits summary.
      </ComingSoon>
      <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
        <a href="/problem.html" className="underline underline-offset-4 hover:text-foreground">
          Project problem definition
        </a>
        {/* Phone only: the desktop sidebar has its own sign-out button */}
        <form action={signOut} className="md:hidden">
          <button type="submit" className="underline underline-offset-4 hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
