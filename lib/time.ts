import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

// Used until the browser has told us its real time zone (see components/time-zone-sync.tsx)
export const FALLBACK_TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "America/Phoenix";
export const TIME_ZONE_COOKIE = "tz";

// "No time = 11:59 PM"
export const DEFAULT_DUE_TIME = "23:59";

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Form values ("2026-11-20", "15:30" or "") in the user's zone → ISO timestamp for the database
export function toDueAt(date: string, time: string, tz: string) {
  const wall = `${date} ${time || DEFAULT_DUE_TIME}`;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(wall)) return null;
  const d = dayjs.tz(wall, "YYYY-MM-DD HH:mm", tz);
  // Reject dates that don't exist (2026-13-45) instead of letting them roll over
  return d.isValid() && d.format("YYYY-MM-DD HH:mm") === wall ? d.toISOString() : null;
}

// Database timestamp → form values in the user's zone
export function fromDueAt(dueAt: string, tz: string) {
  const d = dayjs(dueAt).tz(tz);
  const time = d.format("HH:mm");
  return { date: d.format("YYYY-MM-DD"), time: time === DEFAULT_DUE_TIME ? "" : time };
}

// Short, friendly due label: "Today 3:30 PM", "Tomorrow", "Fri, Nov 20", "Mon, Jan 4, 2027"
export function formatDue(dueAt: string, tz: string, now = new Date()) {
  const d = dayjs(dueAt).tz(tz);
  const today = dayjs(now).tz(tz).startOf("day");
  const days = d.startOf("day").diff(today, "day");
  const time = d.format("HH:mm") === DEFAULT_DUE_TIME ? "" : ` ${d.format("h:mm A")}`;

  if (days === 0) return `Today${time}`;
  if (days === 1) return `Tomorrow${time}`;
  if (days === -1) return `Yesterday${time}`;
  const sameYear = d.year() === today.year();
  return d.format(sameYear ? "ddd, MMM D" : "ddd, MMM D, YYYY") + time;
}

export { dayjs };
