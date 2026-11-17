"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { TIME_ZONE_COOKIE } from "@/lib/time";

// Saves the browser's time zone in a cookie so the server shows due dates in local time
// (the server itself runs in UTC once it's on Vercel).
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.match(new RegExp(`(?:^|; )${TIME_ZONE_COOKIE}=([^;]*)`))?.[1];
    if (!tz || decodeURIComponent(current ?? "") === tz) return;

    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
