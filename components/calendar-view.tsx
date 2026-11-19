"use client";

// Rendered normally (no next/dynamic, no client-only gate): on a full page load, both of those
// left the calendar stuck on its placeholder. The starting view is applied after mount instead.
export { default as CalendarView, type CalendarTask } from "./calendar-inner";
