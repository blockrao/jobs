// Shared pill badge — replaces the one-off `rounded-full bg-neutral-900 ...`
// / `bg-neutral-100 ...` combinations that were previously hand-written on
// each entity page. "brand" is the site's own accent (reuses the
// --brand-* tokens from globals.css); the others are semantic and meant to
// stay consistent wherever a status/kind label shows up.
const TONE_CLASSES = {
  brand: "bg-brand-600 text-white",
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-900",
  info: "bg-blue-100 text-blue-800",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
