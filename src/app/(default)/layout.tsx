import type { Metadata } from "next";
import { RootShell } from "@/components/root-shell";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.",
  // No canonical here: a layout-level canonical is inherited by every page
  // that does not set its own. Each page sets its canonical through
  // src/lib/seo (the home page in src/app/page.tsx).
  openGraph: {
    title: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    description: "Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.",
    url: SITE_URL,
    type: "website",
    siteName: SITE_NAME,
  },
};

// Root layout of the unprefixed tree. Every page here is an English page
// for search engines (SEO-001 D3), so the server-rendered language is "en".
// The cookie-switched listings may present Hindi to a visitor who chose it;
// ListingLanguageAssist tells assistive technology about that, client-side,
// on those listings only.
export default function DefaultRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="en" listingLanguageAssist>
      {children}
    </RootShell>
  );
}
