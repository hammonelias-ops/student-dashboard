import { dayjs } from "@/lib/time";

// Day keys are "YYYY-MM-DD" in the user's time zone (same as habit_log.day / sleep_log.day)

// The `n` days ending today, oldest first: ["2026-11-11", …, "2026-11-17"]
export function lastDays(todayKey: string, n: number) {
  const today = dayjs(todayKey);
  return Array.from({ length: n }, (_, i) => today.subtract(n - 1 - i, "day").format("YYYY-MM-DD"));
}

// Days in a row up to today. Today not checked off yet doesn't break the streak:
// it counts back from yesterday until the day is over.
export function streak(doneDays: Set<string>, todayKey: string) {
  let day = dayjs(todayKey);
  if (!doneDays.has(todayKey)) day = day.subtract(1, "day");
  let count = 0;
  while (doneDays.has(day.format("YYYY-MM-DD"))) {
    count++;
    day = day.subtract(1, "day");
  }
  return count;
}

// Average of the nights that were logged (skips nights with no entry); null if none
export function averageHours(hours: (number | null)[]) {
  const logged = hours.filter((h): h is number => h != null);
  if (logged.length === 0) return null;
  return Math.round((logged.reduce((a, b) => a + b, 0) / logged.length) * 10) / 10;
}

// "7.5" → "7.5 h", 8 → "8 h"
export const formatHours = (h: number) => `${Number(h.toFixed(2))} h`;
