import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { FALLBACK_TIME_ZONE, TIME_ZONE_COOKIE, isValidTimeZone } from "./time";

// The user's time zone, as reported by their browser (falls back until the cookie is set)
export async function getTimeZone() {
  // Callers go on to read the clock (new Date()); make sure that happens at request time
  await connection();
  const tz = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : FALLBACK_TIME_ZONE;
}
