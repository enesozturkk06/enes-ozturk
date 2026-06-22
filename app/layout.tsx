import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import AndroidDebugPanel from "./components/shared/AndroidDebugPanel";

const bebasNeue = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300","400","500","600","700"] });
const barlowCondensed = Barlow_Condensed({ variable: "--font-barlow-condensed", subsets: ["latin"], weight: ["400","500","600","700","800"] });

export const metadata: Metadata = {
  title: "Antrenör Enes Öztürk | Kickboks Özel Ders",
  description: "Profesyonel kickboks özel dersleri, ders takip ve randevu sistemi. Antrenör Enes Öztürk ile şampiyon ol.",
  keywords: ["kickboks", "boks", "muay thai", "özel ders", "Enes Öztürk", "antrenör", "Ankara"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Enes Öztürk",
  },
  icons: {
    icon: [
      { url: "/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png", sizes: "any", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png" },
      { url: "/icons/icon-152.png", sizes: "152x152" },
    ],
    shortcut: "/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0c0b1a",
    "msapplication-TileImage": "/icons/icon-144.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${bebasNeue.variable} ${inter.variable} ${barlowCondensed.variable} h-full`}>
      <head>
        {/* PWA / Android WebView */}
        <meta name="application-name" content="Enes Öztürk" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Enes Öztürk" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Capacitor / Android safe-area */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="min-h-full flex flex-col bg-obsidian text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
        <AndroidDebugPanel />
      </body>
    </html>
  );
}
