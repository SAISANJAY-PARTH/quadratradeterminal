import React from 'react';
import { QuoteInfo } from '../types';

interface Props { quote: QuoteInfo | null; }

function fmt(v: number | null, sym: string, dp = 2) {
  if (v === null || isNaN(v)) return '—';
  return `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

function fmtVol(v: number | null) {
  if (v === null || isNaN(v)) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
  return v.toLocaleString();
}

function fmtMcap(v: number | null, sym: string) {
  if (v === null || isNaN(v)) return '—';
  if (v >= 1e12) return `${sym}${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7) return `${sym}${(v / 1e7).toFixed(2)}Cr`;
  return `${sym}${v.toLocaleString()}`;
}

export default function PriceSummary({ quote }: Props) {
  if (!quote) return null;
  const sym = quote.currency || '$';
  const change = (quote.lastPrice != null && quote.previousClose != null)
    ? quote.lastPrice - quote.previousClose : null;
  const changePct = (change != null && quote.previousClose)
    ? (change / quote.previousClose) * 100 : null;
  const isPos = change != null ? change >= 0 : null;

  const metrics = [
    {
      k: 'Last Price',
      v: fmt(quote.lastPrice, sym),
      cls: '',
      d: change != null && changePct != null
        ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`
        : '',
      dc: isPos ? 'pos' : 'neg',
      glow: true
    },
    { k: 'Day High', v: fmt(quote.dayHigh, sym), cls: '', d: '', dc: '' },
    { k: 'Day Low', v: fmt(quote.dayLow, sym), cls: '', d: '', dc: '' },
    { k: 'Prev Close', v: fmt(quote.previousClose, sym), cls: '', d: '', dc: '' },
    { k: 'Volume', v: fmtVol(quote.lastVolume), cls: 'gold', d: '', dc: '' },

  ];

  return (
    <div className="bb-metrics-strip">
      {metrics.map((m, i) => (
        <div className="bb-metric" key={i}>
          <div className="bb-metric-k">{m.k}</div>
          <div className={`bb-metric-v ${m.cls} ${(m as any).glow && isPos != null ? '' : ''}`} style={(m as any).glow && isPos != null ? { color: isPos ? 'var(--bb-green)' : 'var(--bb-red)' } : {}}>
            {m.v}
          </div>
          {m.d && <div className={`bb-metric-d ${m.dc}`}>{m.d}</div>}
        </div>
      ))}
    </div>
  );
}
