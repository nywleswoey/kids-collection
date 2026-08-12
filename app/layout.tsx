import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { APP_NAME } from "@/lib/brand";
import { getParent } from "@/features/auth/guard";
import { PostHogIdentitySync } from "@/features/auth/PostHogIdentitySync";
import "./globals.css";

// Fonts are VENDORED in app/fonts/ and loaded from disk. They used to come from
// `next/font/google`, which serves them from our own origin at runtime but
// FETCHES them from fonts.gstatic.com during `next build` — an undeclared
// network dependency in the one gate that is supposed to be hermetic.
//
// It is not theoretical: `fast-gate` went red on #50 with
// `NextFontError: Failed to fetch 'Fredoka' from Google Fonts`, on a PR that
// touched nothing but a dependency version. All 331 tests passed; only the
// build failed, and only on a fetch. `ci.yml` claimed at the time that `pg-gate`
// was "the only part of CI that depends on something outside the repository" —
// this is what made that false, and `build` is a REQUIRED check, so a third
// party could redden a pull request on an unchanged tree.
//
// These are the exact files Google Fonts served for the previous configuration:
// the `latin` subset only (matching the old `subsets: ["latin"]`) of each
// family's VARIABLE font, whose built-in weight axes — 500–700 for Fredoka and
// 400–800 for Nunito — cover precisely the weights that were requested before.
// One file per family rather than one per weight is a consequence of that, not
// a change in what renders. 67 KB in total.
//
// Both families are SIL Open Font License 1.1, which permits redistribution;
// the licences are vendored alongside them (app/fonts/OFL-*.txt) because the
// OFL requires the notice to travel with the files.
//
// To refresh: request the CSS from Google's API with a modern browser
// user-agent, take the `/* latin */` block's woff2 URL for each family, and
// replace these files. Nothing prompts you to — nor should it, since a display
// font that has not changed does not need re-downloading.
const fredoka = localFont({
  src: "./fonts/Fredoka-latin-variable.woff2",
  weight: "500 700",
  style: "normal",
  variable: "--font-display",
  display: "swap",
});
const nunito = localFont({
  src: "./fonts/Nunito-latin-variable.woff2",
  weight: "400 800",
  style: "normal",
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
