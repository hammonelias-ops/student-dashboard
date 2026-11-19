"use client";

import dynamic from "next/dynamic";

export type { CalendarTask } from "./calendar-inner";

// FullCalendar only renders in the browser: it measures the page, and the starting view
// depends on screen width and the last view used (localStorage).
export const CalendarView = dynamic(() => import("./calendar-inner"), {
  ssr: false,
  loading: () => <div className="h-[70vh] animate-pulse rounded-xl bg-muted/30" aria-label="Loading calendar" />,
});
