import type { Metadata } from "next";
import "./globals.css";
import NotificationHost from "@/components/NotificationHost";
import CandidateProfileMenu from "@/components/CandidateProfileMenu";
import DialogHost from "@/components/DialogHost";

export const metadata: Metadata = {
  title: "Planitt Assessments",
  description: "Candidate assessments and administration console for Planitt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <CandidateProfileMenu />
        {children}
        <DialogHost />
        <NotificationHost />
      </body>
    </html>
  );
}

