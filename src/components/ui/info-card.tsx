import Link from "next/link";

// Shared link card — replaces the one-off `rounded-lg border border-blue-200
// bg-blue-50 ...` / `border-green-200 bg-green-50 ...` combinations
// previously hand-written per page for the Position/Recruitment/
// Organization/Exam cross-links (jobs, organizations, exams pages). Tones
// are semantic, not decorative: "brand" marks the primary entity a card
// points at (e.g. a job's own Position), "success" marks an
// active/ongoing campaign, "neutral" is for secondary links.
const TONE_CLASSES = {
  brand: {
    card: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
    title: "text-indigo-900",
    subtitle: "text-indigo-700",
  },
  success: {
    card: "border-green-200 bg-green-50 hover:bg-green-100",
    title: "text-green-900",
    subtitle: "text-green-700",
  },
  neutral: {
    card: "border-neutral-200 bg-white hover:bg-neutral-50",
    title: "text-neutral-900",
    subtitle: "text-neutral-600",
  },
} as const;

export type InfoCardTone = keyof typeof TONE_CLASSES;

export function InfoCard({
  href,
  title,
  subtitle,
  tone = "neutral",
  center = false,
}: {
  href: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  tone?: InfoCardTone;
  /** Center-aligned, compact variant — used for small nav/quick-link grids
   * (e.g. the homepage) rather than the default left-aligned info layout. */
  center?: boolean;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <Link
      href={href}
      className={`rounded-lg border p-4 transition-colors ${classes.card} ${center ? "text-center" : ""}`}
    >
      <div className={`font-semibold ${center ? "text-sm" : ""} ${classes.title}`}>{title}</div>
      <div className={`text-sm ${center ? "mt-1 text-xs" : ""} ${classes.subtitle}`}>{subtitle}</div>
    </Link>
  );
}
