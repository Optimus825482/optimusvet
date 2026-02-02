import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import PWASetup from "@/components/pwa-setup";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OPTIMUS VET - Veteriner Ön Muhasebe",
    template: "%s | OPTIMUS VET",
  },
  description:
    "Veteriner klinikleri için modern ön muhasebe ve klinik yönetim sistemi",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      { rel: "icon", url: "/favicon.ico" },
      {
        rel: "icon",
        url: "/icons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OPTIMUS VET",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${figtree.variable} ${notoSans.variable} font-sans`}>
        <Providers>
          <PWASetup />
          {children}
          <Toaster />
          <SonnerToaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                success: "!bg-emerald-50 !border-emerald-300 !text-emerald-800",
                error: "!bg-red-50 !border-red-300 !text-red-800",
                warning: "!bg-amber-50 !border-amber-300 !text-amber-800",
                info: "!bg-sky-50 !border-sky-300 !text-sky-800",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
