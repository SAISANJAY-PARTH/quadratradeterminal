import React from 'react';
import { DecisionResult, QuoteInfo } from '../types';

interface Props { result: DecisionResult; quote: QuoteInfo | null; }

function fmt(v: number | null, sym: string) {
  if (v === null || isNaN(v)) return '—';
  return `${sym}${v.toFixed(2)}`;
}

export default function DecisionEnginePanel({ result, quote }: Props) {
  const sym = quote?.currency || '$';
  const {
    finalSignal, bullScore, bearScore, bullPct, strategyMode, signals,
    rangeEvidence, isRangeMarket, entry, sl, target, target2, rr,
    midPrice, signalOverride, entryWarning, adxV, adxTrending,
  } = result;

  const sigKey = finalSignal.replace(/ /g, '_') as string;
  const sigBadge: Record<string, string> = {
    'STRONG BUY': 'sbuy', 'BUY': 'buy', 'STRONG SELL': 'ssell', 'SELL': 'sell',
    'RANGE': 'range', 'PULLBACK': 'pull', 'WAIT': 'wait',
  };
  const last = result as any;

  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Multi-Factor Decision Engine</span>
        <span className="bb-badge" style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 8px', borderRadius: 3, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', color: 'var(--text2)' }}>
          MODE: {strategyMode}
        </span>
      </div>

      <div className="bb-de-cols">
        {/* LEFT — Signal + Trade Plan */}
        <div className="bb-de-col">
          <div className={`bb-signal-big ${sigKey}`}>{finalSignal}</div>

          {entryWarning && (
            <div className="bb-alert bb-alert-warning" style={{ marginBottom: 8 }}>{entryWarning}</div>
          )}
          {signalOverride && (
            <div className="bb-override-box">
              <div style={{ fontWeight: 700, marginBottom: 3 }}>⬡ OVERRIDE / NOTE</div>
              <div style={{ color: 'var(--text2)' }}>{signalOverride}</div>
            </div>
          )}

          {/* Mini stat cards */}
          <div className="bb-mini-cards">
            <div className="bb-mini-card">
              <div className="bb-mc-k">Bull</div>
              <div className="bb-mc-v bull">{bullScore}</div>
              <div className="bb-mc-d bull">{bullPct}% bullish</div>
            </div>
            <div className="bb-mini-card">
              <div className="bb-mc-k">Bear</div>
              <div className="bb-mc-v bear">{bearScore}</div>
              <div className="bb-mc-d bear">{100 - bullPct}% bearish</div>
            </div>
            <div className="bb-mini-card">
              <div className="bb-mc-k">ADX</div>
              <div className="bb-mc-v gold">{adxV.toFixed(1)}</div>
              <div className="bb-mc-d neutral">{adxTrending ? 'Trending' : 'Weak'}</div>
            </div>
          </div>

          {/* Strength bar */}
          <div className="bb-score-row">
            <span className="bb-score-lbl" style={{ color: 'var(--bb-green)' }}>{bullScore}</span>
            <div className="bb-score-bar-bg">
              <div className="bb-score-bar-fill bb-score-bar-bull" style={{ width: `${bullPct}%` }} />
            </div>
            <span className="bb-score-lbl" style={{ color: 'var(--bb-red)', textAlign: 'right' }}>{bearScore}</span>
          </div>

          {/* Trade plan */}
          {entry !== null && finalSignal !== 'RANGE' && (
            <div className="bb-trade-plan">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
                Trade Plan (ATR-based)
              </div>
              {[
                { k: 'Entry Zone', v: fmt(entry, sym), cls: 'bb-tp-entry' },
                { k: 'Stop Loss',  v: fmt(sl, sym),    cls: 'bb-tp-sl' },
                { k: 'Target 1',   v: fmt(target, sym), cls: 'bb-tp-t1' },
                { k: 'Target 2',   v: fmt(target2, sym), cls: 'bb-tp-t2' },
                { k: 'Risk:Reward', v: `1 : ${rr}`, cls: 'bb-tp-rr' },
              ].map(row => (
                <div className="bb-tp-row" key={row.k}>
                  <span className="bb-tp-k">{row.k}</span>
                  <span className={`bb-tp-v ${row.cls}`}>{row.v}</span>
                </div>
              ))}
            </div>
          )}

          {finalSignal === 'RANGE' && (
            <div className="bb-trade-plan">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
                Range Trade Plan
              </div>
              {[
                { k: 'Support',    v: fmt(last.support || midPrice * 0.98, sym), cls: 'bb-tp-t1' },
                { k: 'Resistance', v: fmt(last.resistance || midPrice * 1.02, sym), cls: 'bb-tp-sl' },
                { k: 'Mid Zone',   v: fmt(midPrice, sym), cls: 'bb-tp-entry' },
              ].map(row => (
                <div className="bb-tp-row" key={row.k}>
                  <span className="bb-tp-k">{row.k}</span>
                  <span className={`bb-tp-v ${row.cls}`}>{row.v}</span>
                </div>
              ))}
              <div className="bb-alert bb-alert-info" style={{ marginTop: 8, fontSize: 10 }}>
                Buy near support · Sell near resistance · Avoid the mid-zone
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Signal breakdown */}
        <div className="bb-de-col">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>
            Signal Breakdown ({signals.length} factors)
          </div>

          {rangeEvidence.length > 0 && (
            <div className="bb-alert bb-alert-warning" style={{ marginBottom: 10, fontSize: 10 }}>
              ◈ Range Evidence ({rangeEvidence.length}/3): {rangeEvidence.join(' · ')}
            </div>
          )}

          <div className="bb-sig-list">
            {signals.map((s, i) => (
              <div key={i} className={`bb-sig-item ${s.type}`}>
                <span className="bb-sig-dot" />
                {s.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
