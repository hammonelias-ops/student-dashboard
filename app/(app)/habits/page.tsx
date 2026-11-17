import { ComingSoon, PageHeader } from "@/components/page-header";

export default function HabitsPage() {
  return (
    <>
      <PageHeader title="Habits" subtitle="Am I taking care of myself?" />
      <ComingSoon stage={5}>
        Daily goals with streaks, the last 7 days, and a sleep log with a weekly average.
      </ComingSoon>
    </>
  );
}
