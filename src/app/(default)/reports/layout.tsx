import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

// Internal reporting view: never indexed (DISC-001, G).
export const metadata: Metadata = {
  title: "Reports",
  robots: noindexRobots(),
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
