import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";
import BackendWakeup from "@/components/BackendWakeup";
import NotificationHost from "@/components/NotificationHost";
import CandidateProfileMenu from "@/components/CandidateProfileMenu";
import DialogHost from "@/components/DialogHost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planitt Assessments",
  description: "Candidate assessments and administration console for Planitt.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{
          "--font-geist-sans": "Segoe UI, Arial, sans-serif",
          "--font-geist-mono": "Consolas, Courier New, monospace",
        } as CSSProperties}
      >
        <BackendWakeup />
        <CandidateProfileMenu key="candidate-menu" />
        {children}
        <DialogHost key="dialog-host" />
        <NotificationHost key="notification-host" />
      </body>
    </html>
  );
}
