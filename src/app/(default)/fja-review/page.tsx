import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found | JobOye",
  robots: { index: false, follow: false, noarchive: true },
};

/**
 * Internal source-quality review tooling must never be exposed as a public route.
 * Keep this route unavailable until it is moved behind authenticated admin access.
 */
export default function InternalSourceReviewPage(): never {
  notFound();
}
