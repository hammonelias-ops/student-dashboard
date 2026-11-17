import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ClassForm } from "@/components/class-form";
import { PageHeader } from "@/components/page-header";
import { getClass } from "@/lib/data";

export const metadata = { title: "Edit class · Student Dashboard" };

export default function EditClassPage({ params }: PageProps<"/assignments/classes/[id]">) {
  return (
    <>
      <PageHeader title="Edit class" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <EditClass params={params} />
      </Suspense>
    </>
  );
}

async function EditClass({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cls = await getClass(id);
  if (!cls) notFound();
  return <ClassForm initial={cls} />;
}
