import { Suspense } from "react";
import { notFound } from "next/navigation";

import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/page-header";
import { getEvent } from "@/lib/data";

export const metadata = { title: "Edit event · Student Dashboard" };

export default function EditEventPage({ params }: PageProps<"/calendar/events/[id]">) {
  return (
    <>
      <PageHeader title="Edit event" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <EditEvent params={params} />
      </Suspense>
    </>
  );
}

async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  return <EventForm initial={event} />;
}
