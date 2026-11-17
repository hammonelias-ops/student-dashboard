import { ClassForm } from "@/components/class-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Add class · Student Dashboard" };

export default function NewClassPage() {
  return (
    <>
      <PageHeader title="Add class" />
      <ClassForm />
    </>
  );
}
