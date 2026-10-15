import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";

// Internal reporting view: never indexed (DISC-001, G).
export const metadata: Metadata = {
  ...pageSeo("/reports", { index: false }),
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
