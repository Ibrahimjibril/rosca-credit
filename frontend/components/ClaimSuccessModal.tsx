"use client";

import { useEffect } from "react";

export function ClaimSuccessModal({
  amount,
  symbol,
  onClose,
}: {
  amount: string;
  symbol: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/80 backdrop-blur-sm px-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-gold-500/40 bg-indigo-900 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-gold-500/15 flex items-center justify-center text-4xl">
          🎉
        </div>
        <h2 className="font-display font-bold text-xl text-sand mt-4">Congratulations!</h2>
        <p className="text-sand/70 text-sm mt-2 leading-relaxed">
          Your stake was successfully claimed.{" "}
          <span className="text-gold-400 font-semibold">
            {amount} {symbol}
          </span>{" "}
          has been sent to your wallet.
        </p>
        <button
          onClick={onClose}
          className="focus-ring mt-5 w-full rounded-full bg-gold-500 text-indigo-950 font-medium py-3 hover:bg-gold-400"
        >
          Done
        </button>
      </div>
    </div>
  );
}
