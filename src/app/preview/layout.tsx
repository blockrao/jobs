import type { Metadata } from "next";
import { pageSeo } from "@/lib/seo";

// Preview routes are internal fixtures: never indexed (DISC-001, G).
export const metadata: Metadata = {
  ...pageSeo("/preview", { index: false }),
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
