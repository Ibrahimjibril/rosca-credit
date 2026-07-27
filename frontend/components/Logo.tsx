export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rosca-gold" x1="6" y1="6" x2="42" y2="42">
          <stop stopColor="#F0B860" />
          <stop offset="1" stopColor="#C97F1E" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="22" fill="rgb(var(--c-indigo-800))" />
      <circle cx="24" cy="24" r="22" stroke="url(#rosca-gold)" strokeWidth="1.5" opacity="0.5" />

      {/* Three rotating arrows forming a cycle — the rotating-savings motif */}
      <g stroke="url(#rosca-gold)" strokeWidth="2.75" strokeLinecap="round" fill="none">
        <path d="M15 16a11 11 0 0 1 17.5 -3.2" />
        <path d="M33 33a11 11 0 0 1 -17.5 3.2" />
        <path d="M11.7 24.8a11 11 0 0 1 1 -11.2" />
      </g>

      {/* Arrowheads */}
      <path d="M32.5 12.8 l2.6 -0.6 l0.4 2.7 z" fill="#F0B860" />
      <path d="M15.5 36.2 l-2.6 0.6 l-0.4 -2.7 z" fill="#F0B860" />
      <path d="M12.7 13.6 l-1 -2.5 l2.7 -0.3 z" fill="#F0B860" />

      {/* Center dot */}
      <circle cx="24" cy="24" r="3" fill="url(#rosca-gold)" />
    </svg>
  );
}

export function LogoLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={34} />
      <div className="flex items-baseline gap-1.5">
        <span className="font-display italic text-xl text-sand">Rosca</span>
        <span className="font-mono text-[10px] tracking-[0.15em] text-gold-500 uppercase">Credit</span>
      </div>
    </div>
  );
}
