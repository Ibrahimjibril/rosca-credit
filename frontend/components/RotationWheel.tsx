"use client";

type WheelMember = {
  address: string;
  contributed: boolean;
};

export function RotationWheel({
  members,
  currentRound,
  finished,
}: {
  members: WheelMember[];
  currentRound: number;
  finished: boolean;
}) {
  const size = 280;
  const radius = 108;
  const center = size / 2;
  const count = members.length || 1;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Center: current recipient callout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span className="text-[10px] tracking-[0.2em] uppercase text-gold-400/80">
          {finished ? "All rounds complete" : "Current recipient"}
        </span>
        <span className="font-display italic text-lg text-sand mt-1">
          {finished ? "Everyone paid" : `Round ${currentRound + 1}`}
        </span>
        <span className="font-mono text-[11px] text-sand/50 mt-1">
          {!finished && members[currentRound]
            ? shortAddr(members[currentRound].address)
            : ""}
        </span>
      </div>

      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(245,239,224,0.12)"
          strokeWidth={1.5}
        />
      </svg>

      {members.map((m, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const isCurrent = i === currentRound && !finished;
        const isPaid = i < currentRound || finished;

        return (
          <div
            key={m.address + i}
            className="absolute flex flex-col items-center"
            style={{
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
            }}
            title={m.address}
          >
            <div
              className={[
                "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono border-2 transition-colors",
                isCurrent
                  ? "bg-gold-500 border-gold-400 text-indigo-950 shadow-[0_0_0_4px_rgba(232,163,61,0.18)]"
                  : isPaid
                  ? "bg-teal-800 border-teal-700 text-sand/70"
                  : m.contributed
                  ? "bg-indigo-800 border-gold-500/60 text-sand"
                  : "bg-indigo-800 border-sand/15 text-sand/50",
              ].join(" ")}
            >
              {i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}
