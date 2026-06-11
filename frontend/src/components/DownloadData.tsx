import React from 'react';
import { IndicatorRow } from '../types';

interface Props { df: IndicatorRow[]; ticker: string; }

function toCSV(rows: IndicatorRow[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]) as (keyof IndicatorRow)[];
  return [keys.join(','), ...rows.map(row =>
    keys.map(k => { const v = row[k]; if (v === null || v === undefined) return ''; if (typeof v === 'boolean') return v ? 'true' : 'false'; return String(v); }).join(',')
  )].join('\n');
}

export default function DownloadData({ df, ticker }: Props) {
  if (!df || df.length === 0) return null;

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Export Data</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '1px' }}>
          {df.length} ROWS · {ticker}
        </span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div className="bb-dl-row">
          <button className="bb-dl-btn" onClick={() => download(toCSV(df), `${ticker}_full_indicators.csv`)}>
            ↓ Full Data + Indicators (CSV)
          </button>
          <button className="bb-dl-btn" onClick={() => {
            const raw = df.map(d => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }));
            download(['date,open,high,low,close,volume', ...raw.map(r => `${r.date},${r.open},${r.high},${r.low},${r.close},${r.volume}`)].join('\n'), `${ticker}_raw_ohlcv.csv`);
          }}>
            ↓ Raw OHLCV Data (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
