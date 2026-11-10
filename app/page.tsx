import { ComingSoon, PageHeader } from "@/components/page-header";

export default function TodayPage() {
  return (
    <>
      <PageHeader title="Today" subtitle="What do I need to do today?" />
      <ComingSoon stage={4}>
        Top 3 by urgency, the rest of today and overdue, tomorrow, and a habits summary.
      </ComingSoon>
      <p className="mt-8 text-sm text-muted-foreground">
        <a href="/problem.html" className="underline underline-offset-4 hover:text-foreground">
          Project problem definition
        </a>
      </p>
    </>
  );
}
