export const CURRENCY_SYMBOL = "$";
export const CURRENCY_CODE = "AUD";

export function fmt(amount) {
  const n = Number(amount || 0);
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtInt(n) {
  return Number(n || 0).toLocaleString("en-AU");
}
