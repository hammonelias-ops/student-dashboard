import { ImageResponse } from "next/og";

// The app icon (the sidebar's open book, in the accent color on the dark background),
// drawn at whatever size a phone asks for. `padding` keeps it inside Android's maskable safe zone.
export const ICON_BG = "#1c1c1f";
const ICON_FG = "#6895f4";

export function appIcon(size: number, padding = 0.18) {
  const inner = Math.round(size * (1 - padding * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ICON_BG,
        }}
      >
        {/* lucide "book-open" */}
        <svg
          width={inner}
          height={inner}
          viewBox="0 0 24 24"
          fill="none"
          stroke={ICON_FG}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
