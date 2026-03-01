import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Kai Study Arena – Comprehension Intelligence Layer",
  description: "AI-powered study platform that generates quizzes, scores answers, and tracks your comprehension index over time.",
  keywords: ["study", "AI quiz", "comprehension", "learning", "education", "MCQ"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 72px)', paddingTop: '72px' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
