import { Suspense } from "react";

import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Add event · Student Dashboard" };

export default function NewEventPage({ searchParams }: PageProps<"/calendar/events/new">) {
  return (
    <>
      <PageHeader title="Add event" />
      <Suspense>
        <NewEvent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewEvent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { date } = await searchParams;
  const day = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <EventForm defaultDate={day} />;
}
