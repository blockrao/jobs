// Shared stat counter tile — replaces the one-off `bg-blue-50
// border-blue-200` / `bg-purple-50 border-purple-200` / `bg-green-50
// border-green-200` counter boxes previously hand-written on the
// organizations page.
const TONE_CLASSES = {
  brand: { card: "bg-indigo-50 border-indigo-200", value: "text-indigo-600" },
  success: { card: "bg-green-50 border-green-200", value: "text-green-600" },
  neutral: { card: "bg-neutral-50 border-neutral-200", value: "text-neutral-700" },
} as const;

export type StatTileTone = keyof typeof TONE_CLASSES;

export function StatTile({
  value,
  label,
  tone = "neutral",
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: StatTileTone;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className={`rounded-lg border p-4 text-center ${classes.card}`}>
      <div className={`text-3xl font-bold ${classes.value}`}>{value}</div>
      <div className="text-sm text-neutral-600">{label}</div>
    </div>
  );
}
