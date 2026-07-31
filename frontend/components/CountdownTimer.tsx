"use client";

import { useEffect, useState } from "react";

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "Time's up";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Live-updating countdown until `deadlineUnix` (seconds since epoch). */
export function CountdownTimer({ deadlineUnix, label }: { deadlineUnix: number; label?: string }) {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = deadlineUnix - now;
  const urgent = remaining > 0 && remaining < 3600; // under 1 hour left

  return (
    <div className="flex items-center gap-2">
      {label && <span className="font-mono text-[11px] uppercase tracking-wide text-sand/50">{label}</span>}
      <span className={`font-mono text-sm font-medium ${remaining <= 0 ? "text-red-400" : urgent ? "text-red-300" : "text-gold-400"}`}>
        {formatRemaining(remaining)}
      </span>
    </div>
  );
}
