export function calculateAltman(
  balance: any,
  income: any
) {

  if (!balance || !income) {
    return null;
  }

  const assets = balance.totalAssets;

  if (!assets) return null;

  const wc =
    (balance.totalCurrentAssets || 0) -
    (balance.totalCurrentLiabilities || 0);

  const re =
    balance.retainedEarnings || 0;

  const ebit =
    income.ebit || 0;

  const equity =
    balance.totalStockholderEquity || 0;

  const liabilities =
    balance.totalLiab || 1;

  const sales =
    income.totalRevenue || 0;

  const z =
    1.2 * (wc / assets) +
    1.4 * (re / assets) +
    3.3 * (ebit / assets) +
    0.6 * (equity / liabilities) +
    1.0 * (sales / assets);

  return Number(z.toFixed(2));
}