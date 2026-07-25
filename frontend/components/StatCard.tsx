export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "gold",
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "teal" | "indigo";
}) {
  const iconBg =
    accent === "gold" ? "bg-gold-500/15 text-gold-400" : accent === "teal" ? "bg-teal-700/20 text-teal-700" : "bg-indigo-800 text-sand/70";

  return (
    <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-4">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${iconBg}`}>{icon}</span>
        <span className="font-mono text-xs text-sand/50">{label}</span>
      </div>
      <div className="font-display text-2xl text-sand mt-3">{value}</div>
      {sub && <div className="font-mono text-[11px] text-sand/40 mt-1">{sub}</div>}
    </div>
  );
}
