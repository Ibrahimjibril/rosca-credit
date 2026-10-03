"use client";

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "gold",
  claimHref,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "teal" | "indigo";
  claimHref?: string;
}) {
  const iconBg =
    accent === "gold" ? "bg-gold-500/15 text-gold-600" : accent === "teal" ? "bg-teal-700/20 text-teal-700" : "bg-indigo-800 text-sand/70";

  return (
    <div className="rounded-xl border border-sand/10 bg-indigo-800/40 p-4 relative">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${iconBg}`}>{icon}</span>
        <span className="font-mono text-xs text-sand/50">{label}</span>
      </div>
      <div className="font-display text-2xl text-sand mt-3">{value}</div>
      {sub && <div className="font-mono text-[11px] text-sand/40 mt-1">{sub}</div>}
      {claimHref && (
        <a
          href={claimHref}
          className="focus-ring inline-block mt-2 rounded-full bg-gold-500 text-indigo-950 text-[11px] font-bold uppercase tracking-wide px-3 py-1 hover:bg-gold-400"
        >
          Claim →
        </a>
      )}
    </div>
  );
}
