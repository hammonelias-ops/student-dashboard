import { ComingSoon, PageHeader } from "@/components/page-header";

export default function AssignmentsPage() {
  return (
    <>
      <PageHeader title="Assignments" subtitle="Everything that's due, by class." />
      <ComingSoon stage={3}>
        Add classes and assignments, attach files or take a photo, mark done or missing.
      </ComingSoon>
    </>
  );
}
