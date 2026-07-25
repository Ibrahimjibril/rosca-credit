export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="21" stroke="url(#rosca-gold)" strokeWidth="2" />
      <circle cx="24" cy="24" r="15.5" stroke="url(#rosca-gold)" strokeWidth="1.2" opacity="0.6" />
      {[0, 90, 180, 270].map((deg) => (
        <circle
          key={deg}
          cx={24 + 21 * Math.cos((deg * Math.PI) / 180)}
          cy={24 + 21 * Math.sin((deg * Math.PI) / 180)}
          r="2.5"
          fill="#E8A33D"
        />
      ))}
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight="600"
        fontSize="20"
        fill="#F5EFE0"
      >
        R
      </text>
      <defs>
        <linearGradient id="rosca-gold" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#F0B860" />
          <stop offset="1" stopColor="#C97F1E" />
        </linearGradient>
      </defs>
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
