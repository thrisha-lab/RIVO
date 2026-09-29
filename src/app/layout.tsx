import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RiderGuard — AI Weather Safety Co-pilot for Delivery Riders",
  description:
    "RiderGuard helps delivery riders make safer travel decisions with weather intelligence, route analysis, hazard reporting, community rider intelligence, safe stops, and AI explanations.",
  keywords: [
    "RiderGuard",
    "delivery rider safety",
    "weather safety",
    "route risk",
    "hazard reporting",
    "rider network",
    "safe stops",
    "AI co-pilot",
  ],
  authors: [{ name: "RiderGuard" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "RiderGuard",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "RiderGuard — AI Weather Safety Co-pilot",
    description: "Safer rides for delivery riders with weather, hazard & route intelligence.",
    siteName: "RiderGuard",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
        <SonnerToaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
