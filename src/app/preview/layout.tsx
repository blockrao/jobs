import type { Metadata } from "next";

// Preview routes are internal fixtures: never indexed (DISC-001, G).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
