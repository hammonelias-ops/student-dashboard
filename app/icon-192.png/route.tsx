import { appIcon } from "@/lib/app-icon";

// Home-screen icon (Android). The ".png" in the folder name keeps it outside proxy.ts's sign-in check.
export function GET() {
  return appIcon(192);
}
