import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import NotificationHost from "@/components/NotificationHost";
import CandidateProfileMenu from "@/components/CandidateProfileMenu";
import DialogHost from "@/components/DialogHost";

const manrope = Manrope({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <CandidateProfileMenu />
        {children}
        <DialogHost />
        <NotificationHost />
      </body>
    </html>
  );
}

