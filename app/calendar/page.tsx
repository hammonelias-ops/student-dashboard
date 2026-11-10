import { ComingSoon, PageHeader } from "@/components/page-header";

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" subtitle="Deadlines and work shifts together." />
      <ComingSoon stage={6}>
        Month and week views colored by class. Drag an assignment to change its due date.
      </ComingSoon>
    </>
  );
}
