import type { Metadata } from "next";

// Internal reporting view: never indexed (DISC-001, G).
export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
