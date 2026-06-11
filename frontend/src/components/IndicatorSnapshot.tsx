import React, { useState } from 'react';
import { IndicatorRow, QuoteInfo } from '../types';

interface Props { df: IndicatorRow[]; quote: QuoteInfo | null; }

export default function IndicatorSnapshot({ df, quote }: Props) {
  const [expanded, setExpanded] = useState(true);
  if (!df || df.length === 0) return null;

  const last = df[df.length - 1];
  const sym = quote?.currency || '$';
  const safe = (v: number, fb = 0) => (!v || isNaN(v)) ? fb : v;

  const rsiV = safe(last.RSI, 50);
  const macdV = safe(last.MACD, 0);
  const macdSig = safe(last.MACD_Signal, 0);
  const stochK = safe(last.StochK, 50);
  const stochD = safe(last.StochD, 50);
  const willR = safe(last.WilliamsR, -50);
  const cciV = safe(last.CCI, 0);
  const mfiV = safe(last.MFI, 50);
  const cmfV = safe(last.CMF, 0);
  const adxV = safe(last.ADX, 0);
  const atrV = safe(last.True_ATR, 0);
  const bbPct = safe(last.BB_Pct, 0.5);
  const avgATR = df.map(d => d.True_ATR).filter(v => v && !isNaN(v)).reduce((a, b, _, arr) => a + b / arr.length, 0);

  const rows = [
    { ind: 'RSI (14)',       val: rsiV.toFixed(2),
      sig: rsiV > 70 ? 'Overbought' : rsiV < 30 ? 'Oversold' : rsiV > 50 ? 'Bullish' : 'Bearish',
      type: rsiV > 70 ? 'bear' : rsiV < 30 ? 'bull' : rsiV > 50 ? 'bull' : 'bear',
      bar: rsiV / 100, showBar: true },
    { ind: 'MACD',           val: `${macdV.toFixed(4)} / ${macdSig.toFixed(4)}`,
      sig: macdV > macdSig ? 'Bullish' : 'Bearish', type: macdV > macdSig ? 'bull' : 'bear', showBar: false },
    { ind: 'Stoch K / D',    val: `${stochK.toFixed(1)} / ${stochD.toFixed(1)}`,
      sig: stochK > stochD ? 'Bullish' : 'Bearish', type: stochK > stochD ? 'bull' : 'bear',
      bar: stochK / 100, showBar: true },
    { ind: 'Williams %R',    val: willR.toFixed(2),
      sig: willR > -20 ? 'Overbought' : willR < -80 ? 'Oversold' : 'Neutral',
      type: willR > -20 ? 'bear' : willR < -80 ? 'bull' : 'neutral',
      bar: (willR + 100) / 100, showBar: true },
    { ind: 'CCI (20)',        val: cciV.toFixed(2),
      sig: cciV > 100 ? 'Overbought' : cciV < -100 ? 'Oversold' : 'Neutral',
      type: cciV > 100 ? 'bear' : cciV < -100 ? 'bull' : 'neutral', showBar: false },
    { ind: 'MFI (14)',        val: mfiV.toFixed(2),
      sig: mfiV > 80 ? 'Overbought' : mfiV < 20 ? 'Oversold' : mfiV > 50 ? 'Bullish' : 'Bearish',
      type: mfiV > 80 ? 'bear' : mfiV < 20 ? 'bull' : mfiV > 50 ? 'bull' : 'bear',
      bar: mfiV / 100, showBar: true },
    { ind: 'CMF (20)',        val: cmfV.toFixed(4),
      sig: cmfV > 0 ? 'Buying Pressure' : 'Selling Pressure', type: cmfV > 0 ? 'bull' : 'bear', showBar: false },
    { ind: 'ADX (14)',        val: adxV.toFixed(2),
      sig: adxV > 25 ? 'Strong Trend' : adxV > 20 ? 'Moderate' : adxV > 15 ? 'Weak' : 'No Trend',
      type: adxV > 25 ? 'bull' : adxV > 15 ? 'neutral' : 'neutral',
      bar: adxV / 60, showBar: true },
    { ind: 'ATR (14)',        val: atrV.toFixed(4),
      sig: atrV > avgATR ? 'High Volatility' : 'Low Volatility', type: 'neutral', showBar: false },
    { ind: 'BB %B',           val: bbPct.toFixed(3),
      sig: bbPct > 0.8 ? 'Near Upper Band' : bbPct < 0.2 ? 'Near Lower Band' : 'Mid Band',
      type: bbPct > 0.8 ? 'bear' : bbPct < 0.2 ? 'bull' : 'neutral',
      bar: bbPct, showBar: true },
    { ind: 'Supertrend',      val: last.ST_Dir === 1 ? 'BULLISH ▲' : 'BEARISH ▼',
      sig: last.ST_Dir === 1 ? 'Bullish' : 'Bearish', type: last.ST_Dir === 1 ? 'bull' : 'bear', showBar: false },
    { ind: 'PSAR',            val: `${last.close > last.PSAR ? 'Above ▲' : 'Below ▼'} (${sym}${(last.PSAR || 0).toFixed(2)})`,
      sig: last.close > last.PSAR ? 'Bullish' : 'Bearish', type: last.close > last.PSAR ? 'bull' : 'bear', showBar: false },
  ];

  return (
    <div className="bb-content-section">
      <button className="bb-expander-btn" onClick={() => setExpanded(e => !e)}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bb-orange)', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Indicator Snapshot
        </span>
        <span className={`bb-expander-ico ${expanded ? 'open' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div style={{ overflowX: 'auto' }}>
          <table className="bb-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Value</th>
                <th>Signal</th>
                <th style={{ minWidth: 80 }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text2)', fontWeight: 500, fontFamily: 'var(--mono)', fontSize: 11 }}>{row.ind}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.val}</td>
                  <td>
                    <span className={`bb-tag bb-tag-${row.type}`}>{row.sig}</span>
                  </td>
                  <td>
                    {row.showBar && (
                      <div style={{ width: '100%', height: 4, background: 'rgba(245,166,35,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(0, (row.bar ?? 0) * 100))}%`,
                          height: '100%', borderRadius: 2,
                          background: row.type === 'bull' ? 'var(--bb-green)' : row.type === 'bear' ? 'var(--bb-red)' : 'var(--bb-orange)',
                        }} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
