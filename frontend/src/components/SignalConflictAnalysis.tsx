import React, { useState } from 'react';
import { DecisionResult, IndicatorRow } from '../types';

interface Props { result: DecisionResult; df: IndicatorRow[]; }

export default function SignalConflictAnalysis({ result, df }: Props) {
  const [open, setOpen] = useState(false);
  const {
    finalSignal, techDirection, trendStrength, adxV, adxTrending,
    isRangeMarket, isWeakTrend, primaryTrendRead, momentumRead,
    flowRead, bbSqueezeRead, rr, rangeEvidence,
  } = result;

  const modeLabel = isRangeMarket ? 'RANGE' : isWeakTrend ? 'WEAK TREND' : 'TRENDING';
  const tradeable = isRangeMarket || isWeakTrend ? 'CAUTION' : 'YES';
  const tradeableColor = isRangeMarket || isWeakTrend ? 'var(--bb-orange)' : 'var(--bb-green)';

  const cfCells = [
    { k: 'Technical Bias', v: techDirection, vc: techDirection === 'BULLISH' ? 'var(--bb-green)' : techDirection === 'BEARISH' ? 'var(--bb-red)' : 'var(--bb-orange)' },
    { k: 'Trend Strength', v: `${trendStrength}`, vc: 'var(--text)', sub: `ADX ${adxV.toFixed(1)}` },
    { k: 'Market Mode',    v: modeLabel, vc: isRangeMarket ? 'var(--bb-cyan)' : isWeakTrend ? 'var(--bb-orange)' : 'var(--bb-green)' },
    { k: 'Tradeable',      v: tradeable, vc: tradeableColor },
  ];

  const tableRows = [
    { factor: 'Primary Trend (EMA200+Stack)', reading: primaryTrendRead,
      action: primaryTrendRead === 'Bearish' ? 'Short bias / avoid longs' : 'Long bias' },
    { factor: 'Momentum (RSI, MACD)',         reading: momentumRead,
      action: momentumRead !== 'Mixed' ? 'Momentum confirms direction' : 'Wait for alignment' },
    { factor: 'Volume Flow (OBV, CMF, MFI)',  reading: flowRead,
      action: flowRead !== 'Mixed' ? 'Smart money positioning' : 'Indeterminate flow' },
    { factor: 'Trend Strength (ADX)',
      reading: `${trendStrength === 'STRONG' ? 'Strong' : trendStrength === 'MODERATE' ? 'Moderate' : 'Weak'} (${adxV.toFixed(1)})`,
      action: !adxTrending ? 'Weak — signals less reliable' : 'Signals more reliable' },
    { factor: 'Volatility (BB Width)',        reading: bbSqueezeRead,
      action: bbSqueezeRead.includes('Squeeze') ? 'Fade extremes' : 'Breakout potential' },
    { factor: 'Net Assessment',               reading: finalSignal,
      action: isRangeMarket ? 'Buy support / sell resistance' : finalSignal },
  ];

  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Signal Conflict Analysis</span>
      </div>

      {/* 4-cell summary */}
      <div className="bb-cf-grid" style={{ borderBottom: '1px solid rgba(245,166,35,0.08)' }}>
        {cfCells.map((c, i) => (
          <div className="bb-cf-cell" key={i}>
            <div className="bb-cf-k">{c.k}</div>
            <div className="bb-cf-v" style={{ color: c.vc }}>
              {c.v}
              {(c as any).sub && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{(c as any).sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="bb-table">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Reading</th>
              <th>Action Implication</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{row.factor}</td>
                <td>
                  <span className={`bb-tag ${row.reading.includes('Bullish') || row.reading === 'BUY' || row.reading === 'STRONG BUY' ? 'bb-tag-bull' : row.reading.includes('Bearish') || row.reading === 'SELL' || row.reading === 'STRONG SELL' ? 'bb-tag-bear' : 'bb-tag-neutral'}`}>
                    {row.reading}
                  </span>
                </td>
                <td style={{ color: 'var(--text3)', fontSize: 11 }}>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expander */}
      <button className="bb-expander-btn" onClick={() => setOpen(o => !o)}>
        <span>◈ Pro Interpretation — What This Market Is Saying</span>
        <span className={`bb-expander-ico ${open ? 'open' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="bb-expander-body">
          {isRangeMarket ? (
            <>
              <h3>Range-Bound Market Detected</h3>
              <p>Indicators are giving <strong style={{ color: 'var(--bb-orange)' }}>conflicting signals</strong> because the market is NOT trending — it's consolidating.</p>
              <p>Range evidence active ({rangeEvidence.length}/3):</p>
              <ul>{rangeEvidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
              <h3>Correct Trade Approach</h3>
              <ul>
                <li>DO NOT aggressively trend-trade — signals are unreliable in sideways markets</li>
                <li>Buy near support with a stop below</li>
                <li>Sell near resistance with a stop above</li>
                <li>Watch for breakout: ADX &gt; 20 + rising + price closes outside range with volume</li>
              </ul>
            </>
          ) : isWeakTrend ? (
            <>
              <h3>Weak Trend Environment</h3>
              <p>Directional bias exists but <strong style={{ color: 'var(--bb-orange)' }}>trend strength is insufficient</strong> for high-confidence trend trades.</p>
              <ul>
                <li>ADX = {adxV.toFixed(1)} (below 20 threshold) — trend signals are less reliable</li>
                <li>Technical bias = <strong>{techDirection}</strong></li>
                <li>Recommended: smaller position size, wider stops, take profits earlier</li>
              </ul>
            </>
          ) : (
            <>
              <h3>Trending Market Confirmed</h3>
              <p>ADX = {adxV.toFixed(1)} confirms a real trend is in place.</p>
              <p>Signal: <strong style={{ color: 'var(--bb-orange)' }}>{finalSignal}</strong></p>
              <ul>
                <li>Trend-following strategies are appropriate</li>
                <li>Use ATR-based stops as calculated in the trade plan</li>
                <li>Respect the R:R ratio of 1:{rr}</li>
                <li>Trail stop as price moves in your favour</li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
