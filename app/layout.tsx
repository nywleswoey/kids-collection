import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import { getParent } from "@/features/auth/guard";
import { PostHogIdentitySync } from "@/features/auth/PostHogIdentitySync";
import "./globals.css";

// Self-hosted at build time; exposed as CSS vars consumed in globals.css.
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A galaxy of collectible cards for kids.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0826",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const parent = await getParent();
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        {parent && (
          <PostHogIdentitySync
            userId={parent.id}
            email={parent.email}
            name={parent.name}
          />
        )}
        {children}
      </body>
    </html>
  );
}
