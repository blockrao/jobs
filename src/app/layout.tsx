import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { buildWebSiteSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.",
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const siteSchema = jsonLdGraph(buildWebSiteSchema());

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
