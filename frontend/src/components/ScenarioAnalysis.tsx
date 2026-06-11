import React, { useState, useMemo } from 'react';

interface Props {
  fundamentals: any;
  quote: any;
  ticker: string;
}

interface Scenario {
  name: string;
  color: string;
  revenueGrowth: number;
  marginChange: number;
  peMultiple: number;
}

function fmtNum(v: number, dp = 2): string {
  if (isNaN(v) || !isFinite(v)) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function fmtLarge(v: number, sym = ''): string {
  if (isNaN(v) || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7)  return `${sign}${sym}${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5)  return `${sign}${sym}${(abs / 1e5).toFixed(2)}L`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { name: 'BEAR',  color: 'var(--bb-red)',    revenueGrowth: -10, marginChange: -2, peMultiple: -20 },
  { name: 'BASE',  color: 'var(--bb-orange)', revenueGrowth: 8,   marginChange: 0,  peMultiple: 0   },
  { name: 'BULL',  color: 'var(--bb-green)',  revenueGrowth: 20,  marginChange: 3,  peMultiple: 25  },
];

export default function ScenarioAnalysis({ fundamentals, quote, ticker }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [years, setYears] = useState(3);
  const [discountRate, setDiscountRate] = useState(12);
  const [activeScenario, setActiveScenario] = useState(1); // base
  const [customRevGrowth, setCustomRevGrowth] = useState(10);
  const [customMarginChg, setCustomMarginChg] = useState(1);
  const [customPEChg, setCustomPEChg] = useState(10);
  const [showCustom, setShowCustom] = useState(false);

  const sym = quote?.currency || '$';
  const currentPrice = quote?.lastPrice ?? 0;

  const updateScenario = (idx: number, field: keyof Scenario, value: number) => {
    setScenarios(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const results = useMemo(() => {
    if (!fundamentals || !currentPrice) return null;

    const currentRevenue = fundamentals.profitability?.totalRevenue ?? 0;
    const currentNetMargin = fundamentals.profitability?.profitMargins ?? 0;
    const currentEPS = fundamentals.keyStats?.trailingEps ?? 0;
    const currentPE = fundamentals.valuation?.trailingPE ?? fundamentals.valuation?.forwardPE ?? 20;
    const sharesOutstanding = fundamentals.keyStats?.sharesOutstanding ?? 1;

    const calc = (sc: Scenario) => {
      const revGrowthRate = sc.revenueGrowth / 100;
      const marginDelta = sc.marginChange / 100;
      const peChange = sc.peMultiple / 100;

      // Project revenue over N years
      const projRevenue = currentRevenue * Math.pow(1 + revGrowthRate, years);
      const projMargin = Math.max(-1, currentNetMargin + marginDelta);
      const projNetIncome = projRevenue * projMargin;
      const projEPS = sharesOutstanding > 0 ? projNetIncome / sharesOutstanding : currentEPS * Math.pow(1 + revGrowthRate, years);
      const projPE = currentPE > 0 ? currentPE * (1 + peChange) : 15;
      const projPrice = projPE * projEPS;
      const annualReturn = currentPrice > 0 && projPrice > 0 ? (Math.pow(projPrice / currentPrice, 1 / years) - 1) * 100 : 0;
      const upside = currentPrice > 0 ? ((projPrice - currentPrice) / currentPrice) * 100 : 0;

      // Simple DCF: discount projected EPS stream
      let dcfValue = 0;
      for (let y = 1; y <= years; y++) {
        const yEPS = currentEPS * Math.pow(1 + revGrowthRate, y);
        dcfValue += yEPS / Math.pow(1 + discountRate / 100, y);
      }
      // Terminal value at year N
      const terminalGrowth = Math.min(revGrowthRate * 0.3, 0.05); // 30% of growth, capped at 5%
      const terminalEPS = currentEPS * Math.pow(1 + revGrowthRate, years);
      const terminalValue = (terminalEPS * (1 + terminalGrowth)) / ((discountRate / 100) - terminalGrowth);
      dcfValue += terminalValue / Math.pow(1 + discountRate / 100, years);
      dcfValue = Math.max(0, dcfValue);

      return {
        projRevenue, projMargin, projNetIncome, projEPS,
        projPE, projPrice, annualReturn, upside, dcfValue,
        currentRevenue, currentNetMargin, currentEPS, currentPE,
      };
    };

    const custom: Scenario = {
      name: 'CUSTOM', color: 'var(--bb-cyan)',
      revenueGrowth: customRevGrowth, marginChange: customMarginChg, peMultiple: customPEChg,
    };

    return {
      scenarios: scenarios.map(sc => ({ ...sc, result: calc(sc) })),
      custom: { ...custom, result: calc(custom) },
    };
  }, [fundamentals, quote, scenarios, years, discountRate, customRevGrowth, customMarginChg, customPEChg]);

  if (!fundamentals || !currentPrice) {
    return (
      <div className="bb-content-section">
        <div className="bb-section-hdr"><span className="bb-section-title">Scenario Analysis</span></div>
        <div style={{ padding: '16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
          Load fundamental data to enable scenario analysis.
        </div>
      </div>
    );
  }

  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Scenario Analysis & Valuation</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
          {ticker} · Current {sym}{fmtNum(currentPrice)}
        </span>
      </div>

      {/* Controls */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(245,166,35,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Global Parameters</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="bb-form-group">
              <label>Projection Years</label>
              <input type="number" value={years} min={1} max={10} onChange={e => setYears(Number(e.target.value))} />
            </div>
            <div className="bb-form-group">
              <label>Discount Rate (%)</label>
              <input type="number" value={discountRate} min={5} max={30} step={0.5} onChange={e => setDiscountRate(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Methodology</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)', lineHeight: 1.7 }}>
            Revenue growth compounded over {years}yr · Margin delta is absolute · PE re-rating applied · DCF uses {discountRate}% discount rate with perpetuity terminal value
          </div>
        </div>
      </div>

      {/* Scenario inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1px', background: 'rgba(245,166,35,0.06)', borderBottom: '1px solid rgba(245,166,35,0.08)' }}>
        {scenarios.map((sc, idx) => (
          <div key={sc.name} style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: sc.color, letterSpacing: '2px', marginBottom: 10 }}>
              {sc.name} CASE
            </div>
            <div className="bb-form-group" style={{ marginBottom: 8 }}>
              <label>Revenue Growth / Year (%)</label>
              <input type="number" value={sc.revenueGrowth} step={1}
                onChange={e => updateScenario(idx, 'revenueGrowth', Number(e.target.value))} />
            </div>
            <div className="bb-form-group" style={{ marginBottom: 8 }}>
              <label>Net Margin Change (pp)</label>
              <input type="number" value={sc.marginChange} step={0.5}
                onChange={e => updateScenario(idx, 'marginChange', Number(e.target.value))} />
            </div>
            <div className="bb-form-group">
              <label>PE Multiple Change (%)</label>
              <input type="number" value={sc.peMultiple} step={5}
                onChange={e => updateScenario(idx, 'peMultiple', Number(e.target.value))} />
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Price targets */}
          <div className="bb-metrics-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="bb-metric">
              <div className="bb-metric-k">Current Price</div>
              <div className="bb-metric-v gold">{sym}{fmtNum(currentPrice)}</div>
              <div className="bb-metric-d" style={{ color: 'var(--text3)' }}>Market Price</div>
            </div>
            {results.scenarios.map((sc) => {
              const upside = sc.result.upside;
              return (
                <div className="bb-metric" key={sc.name}>
                  <div className="bb-metric-k">{sc.name} TARGET ({years}Y)</div>
                  <div className="bb-metric-v" style={{ color: sc.color }}>
                    {sc.result.projPrice > 0 ? sym + fmtNum(sc.result.projPrice) : '—'}
                  </div>
                  <div className="bb-metric-d" style={{ color: upside >= 0 ? 'var(--bb-green)' : 'var(--bb-red)' }}>
                    {upside >= 0 ? '+' : ''}{fmtNum(upside)}% · {fmtNum(sc.result.annualReturn)}%/yr
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed comparison table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="bb-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Metric</th>
                  <th style={{ textAlign: 'right' }}>Current</th>
                  {results.scenarios.map(sc => (
                    <th key={sc.name} style={{ textAlign: 'right', color: sc.color }}>{sc.name} ({years}Y)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Revenue', curr: results.scenarios[0].result.currentRevenue, vals: results.scenarios.map(s => s.result.projRevenue), fmt: (v: number) => fmtLarge(v, sym) },
                  { label: 'Net Margin', curr: results.scenarios[0].result.currentNetMargin, vals: results.scenarios.map(s => s.result.projMargin), fmt: (v: number) => (v * 100).toFixed(2) + '%', clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                  { label: 'Net Income', curr: null, vals: results.scenarios.map(s => s.result.projNetIncome), fmt: (v: number) => fmtLarge(v, sym), clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                  { label: 'EPS', curr: results.scenarios[0].result.currentEPS, vals: results.scenarios.map(s => s.result.projEPS), fmt: (v: number) => sym + fmtNum(v), clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                  { label: 'P/E Multiple', curr: results.scenarios[0].result.currentPE, vals: results.scenarios.map(s => s.result.projPE), fmt: (v: number) => fmtNum(v, 1) + 'x' },
                  { label: 'Target Price', curr: currentPrice, vals: results.scenarios.map(s => s.result.projPrice), fmt: (v: number) => sym + fmtNum(v), clsVal: (v: number) => v >= currentPrice ? 'pos' : 'neg' },
                  { label: 'Upside / Downside', curr: 0, vals: results.scenarios.map(s => s.result.upside), fmt: (v: number) => (v >= 0 ? '+' : '') + fmtNum(v) + '%', clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                  { label: 'Annual Return', curr: null, vals: results.scenarios.map(s => s.result.annualReturn), fmt: (v: number) => (v >= 0 ? '+' : '') + fmtNum(v) + '%/yr', clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                  { label: 'DCF Value / Share', curr: null, vals: results.scenarios.map(s => s.result.dcfValue), fmt: (v: number) => sym + fmtNum(v), clsVal: (v: number) => v >= currentPrice ? 'pos' : 'neg' },
                  { label: 'Margin of Safety (DCF)', curr: null, vals: results.scenarios.map(s => ((s.result.dcfValue - currentPrice) / currentPrice) * 100), fmt: (v: number) => (v >= 0 ? '+' : '') + fmtNum(v) + '%', clsVal: (v: number) => v >= 0 ? 'pos' : 'neg' },
                ].map(row => (
                  <tr key={row.label}>
                    <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ textAlign: 'right', color: 'var(--bb-orange)' }}>
                      {row.curr != null ? row.fmt(row.curr) : '—'}
                    </td>
                    {row.vals.map((v, i) => {
                      const cls = (row as any).clsVal ? (row as any).clsVal(v) : '';
                      return (
                        <td key={i} style={{ textAlign: 'right', color: cls === 'pos' ? 'var(--bb-green)' : cls === 'neg' ? 'var(--bb-red)' : 'var(--text)' }}>
                          {row.fmt(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom scenario */}
          <div style={{ borderTop: '1px solid rgba(245,166,35,0.08)' }}>
            <button className="bb-expander-btn" onClick={() => setShowCustom(v => !v)}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bb-cyan)', letterSpacing: '1px' }}>
                ◈ Custom Scenario Builder — Enter Your Own Assumptions
              </span>
              <span className={`bb-expander-ico ${showCustom ? 'open' : ''}`}>▼</span>
            </button>

            {showCustom && (
              <div style={{ padding: '14px 16px', background: 'rgba(0,212,255,0.02)', borderBottom: '1px solid rgba(245,166,35,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="bb-form-group">
                    <label>Revenue Growth / Year (%)</label>
                    <input type="number" value={customRevGrowth} step={1} onChange={e => setCustomRevGrowth(Number(e.target.value))} />
                  </div>
                  <div className="bb-form-group">
                    <label>Net Margin Change (percentage points)</label>
                    <input type="number" value={customMarginChg} step={0.5} onChange={e => setCustomMarginChg(Number(e.target.value))} />
                  </div>
                  <div className="bb-form-group">
                    <label>PE Multiple Change (%)</label>
                    <input type="number" value={customPEChg} step={5} onChange={e => setCustomPEChg(Number(e.target.value))} />
                  </div>
                </div>

                {/* Custom result */}
                {(() => {
                  const r = results.custom.result;
                  const upside = r.upside;
                  const dcfMargin = ((r.dcfValue - currentPrice) / currentPrice) * 100;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0 1px', background: 'rgba(0,212,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      {[
                        { k: 'Target Price', v: sym + fmtNum(r.projPrice), c: upside >= 0 ? 'pos' : 'neg' },
                        { k: 'Upside / Downside', v: (upside >= 0 ? '+' : '') + fmtNum(upside) + '%', c: upside >= 0 ? 'pos' : 'neg' },
                        { k: 'Annual Return', v: (r.annualReturn >= 0 ? '+' : '') + fmtNum(r.annualReturn) + '%/yr', c: r.annualReturn >= 0 ? 'pos' : 'neg' },
                        { k: 'DCF Value', v: sym + fmtNum(r.dcfValue), c: r.dcfValue >= currentPrice ? 'pos' : 'neg' },
                        { k: 'Margin of Safety', v: (dcfMargin >= 0 ? '+' : '') + fmtNum(dcfMargin) + '%', c: dcfMargin >= 0 ? 'pos' : 'neg' },
                      ].map((m, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: 'var(--bb-bg)', borderRight: i < 4 ? '1px solid rgba(0,212,255,0.12)' : 'none' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{m.k}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: m.c === 'pos' ? 'var(--bb-green)' : m.c === 'neg' ? 'var(--bb-red)' : 'var(--bb-cyan)' }}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', lineHeight: 1.7, padding: '8px 12px', background: 'rgba(245,166,35,0.03)', borderRadius: 4, borderLeft: '3px solid rgba(245,166,35,0.2)' }}>
                  <strong style={{ color: 'var(--bb-orange)' }}>⚠ DISCLAIMER:</strong> Scenario analysis uses simplified models and analyst assumptions.
                  Actual results may differ materially. This is NOT investment advice. Always conduct thorough due diligence.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
