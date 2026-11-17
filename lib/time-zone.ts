import "server-only";
import { cookies } from "next/headers";

import { FALLBACK_TIME_ZONE, TIME_ZONE_COOKIE, isValidTimeZone } from "./time";

// The user's time zone, as reported by their browser (falls back until the cookie is set)
export async function getTimeZone() {
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : FALLBACK_TIME_ZONE;
}
