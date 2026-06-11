import React, { useState, useEffect, useRef } from 'react';
import { QuoteInfo, Period } from '../types';

declare const Plotly: any;

interface Props {
  defaultTicker: string;
  defaultPrice: number;
  quote: QuoteInfo | null;
  period: Period;
}

export default function PortfolioTracker({ defaultTicker, defaultPrice, quote, period }: Props) {
  const [ticker, setTicker] = useState(defaultTicker);
  const [qty, setQty] = useState(10);
  const [buyPrice, setBuyPrice] = useState(defaultPrice);
  const [portData, setPortData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chartRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  const sym = quote?.currency || '₹';

  useEffect(() => {
    setTicker(defaultTicker);
    setBuyPrice(defaultPrice > 0 ? defaultPrice : 100);
  }, [defaultTicker, defaultPrice]);

  const fetchPortfolio = async () => {
    if (!ticker) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/history?ticker=${encodeURIComponent(ticker)}&period=${period}`);
      if (!res.ok) throw new Error('No data');
      const json = await res.json();
      const data = (json.data || []).filter((r: any) => r.close !== null);
      if (!data.length) { setError('No price data returned'); return; }
      setPortData(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portData.length === 0) return;
    const vals = portData.map((d: any) => d.close * qty);
    const invested = qty * buyPrice;
    const investedArr = portData.map(() => invested);
    const dates = portData.map((d: any) => d.date);

    const cfg = { responsive: true };
    const layout = {
      template: 'plotly_dark', paper_bgcolor: '#080808', plot_bgcolor: '#0a0a0a',
      margin: { l: 10, r: 70, t: 20, b: 30 },
      font: { family: 'JetBrains Mono', color: '#b8a88a', size: 9 },
      xaxis: { showgrid: true, gridcolor: 'rgba(245,166,35,0.06)', tickfont: { size: 9, color: '#6b5c40' } },
      yaxis: { side: 'right', showgrid: true, gridcolor: 'rgba(245,166,35,0.06)', tickfont: { size: 9, color: '#6b5c40' } },
      legend: { orientation: 'h', y: 1.08, font: { size: 9 } },
      showlegend: true,
    };

    if (chartRef.current && typeof Plotly !== 'undefined') {
      const current = vals[vals.length - 1];
      const isProfit = current >= invested;
      Plotly.react(chartRef.current, [
        { type: 'scatter', x: dates, y: vals, name: 'Portfolio Value', line: { color: isProfit ? '#00d46a' : '#ff3b3b', width: 2 }, fill: 'tozeroy', fillcolor: isProfit ? 'rgba(0,212,106,0.05)' : 'rgba(255,59,59,0.05)' },
        { type: 'scatter', x: dates, y: investedArr, name: 'Cost Basis', line: { dash: 'dash', width: 1.5, color: 'rgba(245,166,35,0.5)' } },
      ], { ...layout, height: 280 }, cfg);
    }

    let peak = vals[0];
    const drawdown = vals.map(v => { peak = Math.max(peak, v); return ((v - peak) / (peak + 1e-10)) * 100; });
    if (ddRef.current && typeof Plotly !== 'undefined') {
      Plotly.react(ddRef.current, [
        { type: 'scatter', x: dates, y: drawdown, fill: 'tozeroy', name: 'Drawdown %', line: { color: '#ff3b3b', width: 1.5 }, fillcolor: 'rgba(255,59,59,0.08)' },
      ], { ...layout, height: 180 }, cfg);
    }
  }, [portData, qty, buyPrice]);

  const vals = portData.map((d: any) => d.close * qty);
  const invested = qty * buyPrice;
  const current = vals.length ? vals[vals.length - 1] : 0;
  const pnl = current - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  let peak = vals[0] || 0;
  const dds = vals.map(v => { peak = Math.max(peak, v); return ((v - peak) / (peak + 1e-10)) * 100; });
  const maxDD = dds.length ? Math.min(...dds) : 0;
  const closes = portData.map((d: any) => d.close);
  const dailyRet = closes.map((c: number, i: number) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1] * 100);
  const bestDay = dailyRet.length ? Math.max(...dailyRet) : 0;

  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Portfolio Tracker</span>
      </div>

      <div className="bb-port-form">
        <div className="bb-form-group">
          <label>Ticker</label>
          <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} />
        </div>
        <div className="bb-form-group">
          <label>Quantity</label>
          <input type="number" value={qty} min={0} onChange={e => setQty(Number(e.target.value))} />
        </div>
        <div className="bb-form-group">
          <label>Buy Price</label>
          <input type="number" value={buyPrice} min={0.01} step={0.01} onChange={e => setBuyPrice(Number(e.target.value))} />
        </div>
        <div>
          <button className="bb-calc-btn" onClick={fetchPortfolio} disabled={loading} style={{ marginTop: 17 }}>
            {loading ? 'LOADING…' : '▶ CALC'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '8px 16px' }}><div className="bb-alert bb-alert-error">{error}</div></div>}

      {portData.length > 0 && (
        <>
          {/* PnL metrics */}
          <div className="bb-metrics-strip" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
            {[
              { k: 'Invested',    v: `${sym}${invested.toFixed(2)}`, c: '' },
              { k: 'Current',     v: `${sym}${current.toFixed(2)}`, c: pnl >= 0 ? 'pos' : 'neg' },
              { k: 'P & L',       v: `${sym}${Math.abs(pnl).toFixed(2)}`, c: pnl >= 0 ? 'pos' : 'neg', d: `${pnl >= 0 ? '+' : '-'}${Math.abs(pnlPct).toFixed(2)}%` },
              { k: 'Max Drawdown', v: `${maxDD.toFixed(2)}%`, c: 'neg' },
              { k: 'Best Day',    v: `+${bestDay.toFixed(2)}%`, c: 'pos' },
            ].map((m, i) => (
              <div className="bb-metric" key={i}>
                <div className="bb-metric-k">{m.k}</div>
                <div className={`bb-metric-v ${m.c}`}>{m.v}</div>
                {(m as any).d && <div className={`bb-metric-d ${m.c}`}>{(m as any).d}</div>}
              </div>
            ))}
          </div>

          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(245,166,35,0.08)' }}>
            {pnlPct < -30 && <div className="bb-alert bb-alert-error">⚡ Heavy Loss Zone — position risk very high.</div>}
            {pnlPct >= -30 && pnlPct < -10 && <div className="bb-alert bb-alert-warning">▽ In drawdown — review stop-loss parameters.</div>}
            {pnlPct > 50 && <div className="bb-alert bb-alert-success">▲ Exceptional gain — consider booking partial profits.</div>}
            {pnlPct >= 20 && pnlPct <= 50 && <div className="bb-alert bb-alert-success">▲ Strong profit — consider trailing stop or partial exit.</div>}
            {pnlPct > -10 && pnlPct < 20 && <div className="bb-alert bb-alert-info">◈ Neutral zone — no immediate action required. Monitor.</div>}
          </div>

          <div style={{ padding: '4px 0' }}>
            <div ref={chartRef} style={{ width: '100%' }} />
            <div ref={ddRef} style={{ width: '100%' }} />
          </div>
        </>
      )}
    </div>
  );
}
