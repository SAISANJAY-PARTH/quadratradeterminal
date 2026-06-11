export function qualityAnalytics(
  profitability: any,
  health: any
) {

  return {

    roe:
      profitability.returnOnEquity
        ? profitability.returnOnEquity * 100
        : null,

    roa:
      profitability.returnOnAssets
        ? profitability.returnOnAssets * 100
        : null,

    operatingMargin:
      profitability.operatingMargins
        ? profitability.operatingMargins * 100
        : null,

    profitMargin:
      profitability.profitMargins
        ? profitability.profitMargins * 100
        : null,

    debtToEquity:
      health.debtToEquity,

    currentRatio:
      health.currentRatio,

    quickRatio:
      health.quickRatio
  };
}