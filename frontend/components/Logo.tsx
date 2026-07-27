export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rosca-gold" x1="6" y1="6" x2="42" y2="42">
          <stop stopColor="#F0B860" />
          <stop offset="1" stopColor="#C97F1E" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="23" fill="url(#rosca-gold)" />
      <circle cx="24" cy="24" r="19.5" fill="#1B1F3B" />

      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="#F5EFE0"
        letterSpacing="-0.5"
      >
        RC
      </text>
    </svg>
  );
}

export function LogoLockup() {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={30} />
      <div className="flex items-baseline gap-1.5">
        <span className="font-display italic text-lg text-sand leading-none">Rosca</span>
        <span className="font-mono text-[9px] tracking-[0.15em] text-gold-500 uppercase leading-none">Credit</span>
      </div>
    </div>
  );
}
