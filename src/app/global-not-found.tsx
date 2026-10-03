import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";
import { noindexRobots } from "@/lib/seo";

// 404 for an address that matches no route at all (enabled by
// experimental.globalNotFound in next.config.ts). The app has two root
// layouts and no layout above them, so there is no shell to render this
// inside; the framework serves this file as the whole document. It is the
// only file besides src/components/root-shell.tsx that renders <html>. An
// unmatched address has no locale, so the language is English.
//
// A page that exists in a tree but calls notFound() uses that tree's own
// not-found.tsx instead.
export const metadata: Metadata = {
  title: "Page not found",
  robots: noindexRobots(),
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NotFoundContent />
      </body>
    </html>
  );
}
