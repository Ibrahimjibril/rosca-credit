/** Convert a bigint of raw token units into a human-readable decimal string. */
export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;
  if (fraction === 0n) return `${negative ? "-" : ""}${whole.toString()}`;
  let fracStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fracStr ? "." + fracStr : ""}`;
}

/** Convert a human-entered decimal string into raw token units (bigint). */
export function toUnits(value: string, decimals: number): bigint {
  if (!value) return 0n;
  const negative = value.trim().startsWith("-");
  const clean = value.trim().replace(/^-/, "");
  const [wholeStr, fracStr = ""] = clean.split(".");
  const paddedFrac = (fracStr + "0".repeat(decimals)).slice(0, decimals);
  const whole = wholeStr ? BigInt(wholeStr) : 0n;
  const fracBig = paddedFrac ? BigInt(paddedFrac || "0") : 0n;
  const result = whole * 10n ** BigInt(decimals) + fracBig;
  return negative ? -result : result;
}
