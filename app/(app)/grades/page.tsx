import { ComingSoon, PageHeader } from "@/components/page-header";

export default function GradesPage() {
  return (
    <>
      <PageHeader title="Grades" subtitle="How am I doing in my classes?" />
      <ComingSoon stage={7}>
        Grade per class with its trend, and a &ldquo;what do I need on the final?&rdquo; calculator.
      </ComingSoon>
    </>
  );
}
