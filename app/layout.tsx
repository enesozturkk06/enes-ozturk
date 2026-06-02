import type { Metadata } from "next";
import { Bebas_Neue, Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Antrenör Enes Öztürk | Premium Kickboks Salonu",
  description:
    "Antrenör Enes Öztürk ile profesyonel kickboks eğitimi. Online ders takip ve randevu sistemi.",
  keywords: ["kickboks", "MMA", "boks", "Enes Öztürk", "antrenör"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${bebasNeue.variable} ${inter.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-obsidian text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
