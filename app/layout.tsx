import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast-context";
import ToastWrapper from "@/components/layout/ToastWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Salon CRM - Kuaför Sadakat",
  description: "Customer CRM and loyalty system for hair salons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ToastProvider>
          {children}
          <ToastWrapper />
        </ToastProvider>
      </body>
    </html>
  );
}
