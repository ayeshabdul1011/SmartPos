export default function Stat({ label, value, sub, tone = "default", testId }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
      ? "text-destructive"
      : tone === "accent"
      ? "text-primary"
      : "text-foreground";
  return (
    <div className="border bg-card p-5" data-testid={testId}>
      <div className="label-cap">{label}</div>
      <div className={`mono mt-2 text-3xl font-bold tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
