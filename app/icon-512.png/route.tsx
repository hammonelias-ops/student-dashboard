import { appIcon } from "@/lib/app-icon";

// Large icon (Android install screen, splash). Extra padding so it's safe as a maskable icon.
export function GET() {
  return appIcon(512, 0.22);
}
