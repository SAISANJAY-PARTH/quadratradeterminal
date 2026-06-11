export function calculatePiotroski(
  profitability: any,
  health: any
) {

  let score = 0;

  if ((profitability.returnOnAssets ?? 0) > 0) score++;

  if ((health.operatingCashflow ?? 0) > 0) score++;

  if ((profitability.returnOnEquity ?? 0) > 0.15) score++;

  if ((health.currentRatio ?? 0) > 1.5) score++;

  if ((health.quickRatio ?? 0) > 1) score++;

  if ((health.debtToEquity ?? 999) < 100) score++;

  return score;
}