export function overallScore(
  profitability: any,
  health: any,
  valuation: any,
  growth: any,
  quality: any,
  analystTrend: any[],
  keyStats: any,
  piotroski: number,
  altman: number
) {
  const breakdown = {
    profitability: 0,
    growth: 0,
    health: 0,
    valuation: 0,
    quality: 0,
    analyst: 0,
    risk: 0
  };

  // =====================================================
  // PROFITABILITY (20)
  // =====================================================

  if ((profitability.returnOnEquity ?? 0) > 0.20)
    breakdown.profitability += 5;

  if ((profitability.returnOnAssets ?? 0) > 0.10)
    breakdown.profitability += 5;

  if ((profitability.operatingMargins ?? 0) > 0.15)
    breakdown.profitability += 5;

  if ((profitability.profitMargins ?? 0) > 0.10)
    breakdown.profitability += 5;

  // =====================================================
  // GROWTH (15)
  // =====================================================

  if ((growth.revenueCAGR ?? 0) > 10)
    breakdown.growth += 5;

  if ((growth.earningsCAGR ?? 0) > 10)
    breakdown.growth += 5;

  if ((growth.epsCAGR ?? 0) > 10)
    breakdown.growth += 5;

  // =====================================================
  // HEALTH (20)
  // =====================================================

  if ((health.currentRatio ?? 0) > 1.5)
    breakdown.health += 5;

  if ((health.quickRatio ?? 0) > 1)
    breakdown.health += 5;

  if ((health.debtToEquity ?? 999) < 50)
    breakdown.health += 5;

  if ((health.freeCashflow ?? 0) > 0)
    breakdown.health += 5;

  // =====================================================
  // VALUATION (15)
  // =====================================================

  if ((valuation.forwardPE ?? 999) < 20)
    breakdown.valuation += 5;

  if ((valuation.pegRatio ?? 999) < 2)
    breakdown.valuation += 5;

  if ((valuation.evToEbitda ?? 999) < 15)
    breakdown.valuation += 5;

  // =====================================================
  // QUALITY (10)
  // =====================================================

  if (piotroski >= 7)
    breakdown.quality += 5;
  else if (piotroski >= 5)
    breakdown.quality += 3;

  if (altman > 3)
    breakdown.quality += 5;
  else if (altman > 2)
    breakdown.quality += 3;

  // =====================================================
  // ANALYST (10)
  // =====================================================

  const yearlyForecast =
    analystTrend?.find((x) => x.period === "0y") || {};

  if ((yearlyForecast.epsMeanGrowth ?? 0) > 0.10)
    breakdown.analyst += 5;
  else if ((yearlyForecast.epsMeanGrowth ?? 0) > 0.05)
    breakdown.analyst += 3;

  const revenueGrowth =
    yearlyForecast.revenueEstimateMean &&
    profitability.totalRevenue
      ? (
          (yearlyForecast.revenueEstimateMean -
            profitability.totalRevenue) /
          profitability.totalRevenue
        )
      : 0;

  if (revenueGrowth > 0.10)
    breakdown.analyst += 5;
  else if (revenueGrowth > 0.05)
    breakdown.analyst += 3;

  // =====================================================
  // RISK (10)
  // =====================================================

  const beta = keyStats.beta ?? 2;

  if (beta < 1.2)
    breakdown.risk += 10;
  else if (beta < 1.8)
    breakdown.risk += 5;

  // =====================================================
  // FINAL SCORE
  // =====================================================

  const total =
    breakdown.profitability +
    breakdown.growth +
    breakdown.health +
    breakdown.valuation +
    breakdown.quality +
    breakdown.analyst +
    breakdown.risk;

  let rating = "High Risk";

  if (total >= 90)
    rating = "Exceptional";
  else if (total >= 80)
    rating = "Strong Buy";
  else if (total >= 70)
    rating = "Good Quality";
  else if (total >= 60)
    rating = "Average";
  else if (total >= 50)
    rating = "Weak";

  return {
    score: total,
    rating,
    breakdown
  };
}