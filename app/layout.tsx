import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomTabs, Sidebar } from "@/components/app-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "School and life in one place: tasks, calendar, grades, habits.",
};

export const viewport: Viewport = {
  themeColor: "#1c1c1f",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark mode by default (no light theme yet)
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Suspense>
          <Sidebar />
        </Suspense>
        <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24 md:ml-56 md:max-w-none md:px-10 md:pt-10 md:pb-10">
          {children}
        </main>
        <Suspense>
          <BottomTabs />
        </Suspense>
      </body>
    </html>
  );
}
