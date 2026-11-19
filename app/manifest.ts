import type { MetadataRoute } from "next";

import { ICON_BG } from "@/lib/app-icon";

// Makes the dashboard installable: "Add to Home Screen" on iPhone, "Install app" on Android.
// Opens full screen (no browser bar) on the Today page.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Student Dashboard",
    short_name: "Dashboard",
    description: "School and life in one place: tasks, calendar, grades, habits.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: ICON_BG,
    theme_color: ICON_BG,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Assignments", url: "/assignments" },
      { name: "Calendar", url: "/calendar" },
      { name: "Habits", url: "/habits" },
    ],
  };
}
