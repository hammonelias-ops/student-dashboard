import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { getClasses, requireUser } from "@/lib/data";

export const metadata = { title: "Add assignment · Student Dashboard" };

export default function NewAssignmentPage({ searchParams }: PageProps<"/assignments/new">) {
  return (
    <>
      <PageHeader title="Add assignment" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <NewAssignment searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewAssignment({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ userId }, classes, params] = await Promise.all([requireUser(), getClasses(), searchParams]);
  // Assignments need a class: send first-time users to add one
  if (classes.length === 0) redirect("/assignments/classes/new");

  const classParam = typeof params.class === "string" ? params.class : undefined;
  return <TaskForm classes={classes} userId={userId} defaultClassId={classParam} />;
}
