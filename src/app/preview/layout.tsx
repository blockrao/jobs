import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

// Preview routes are internal fixtures: never indexed (DISC-001, G).
export const metadata: Metadata = {
  robots: noindexRobots(),
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
