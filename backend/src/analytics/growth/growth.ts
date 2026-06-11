export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number | null {

  if (
    !startValue ||
    !endValue ||
    startValue <= 0 ||
    endValue <= 0 ||
    years <= 0
  ) {
    return null;
  }

  return (
    (Math.pow(endValue / startValue, 1 / years) - 1) * 100
  );
}

export function growthAnalytics(incomeAnnual: any[]) {

  if (incomeAnnual.length < 2) {
    return {};
  }

  const first = incomeAnnual[1];
  const last = incomeAnnual[incomeAnnual.length - 1];

  const years = incomeAnnual.length - 2;

  return {
    revenueCAGR: calculateCAGR(
      first.totalRevenue,
      last.totalRevenue,
      years
    ),

    earningsCAGR: calculateCAGR(
      first.netIncome,
      last.netIncome,
      years
    ),

    epsCAGR: calculateCAGR(
      first.eps,
      last.eps,
      years
    )
  };
}