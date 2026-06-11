import React, { useState, useEffect, useRef } from 'react';
import { SearchResult, Period, ChartType } from '../types';

interface Props {
  onSearch: (ticker: string, period: Period) => void;
  searchTickers: (q: string) => Promise<SearchResult[]>;
  loading: boolean;
  period: Period;
  setPeriod: (p: Period) => void;
  chartType: ChartType;
  setChartType: (c: ChartType) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '1d', label: '1 Day' }, { value: '5d', label: '5 Days' },
  { value: '1mo', label: '1 Month' }, { value: '3mo', label: '3 Months' },
  { value: '6mo', label: '6 Months' }, { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' }, { value: '5y', label: '5 Years' },
  { value: 'max', label: 'Max' },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'Candlestick', label: 'Candlestick' },
  { value: 'Heikin Ashi', label: 'Heikin Ashi' },
  { value: 'Line', label: 'Line' },
];

export default function StockSearch({ onSearch, searchTickers, loading, period, setPeriod, chartType, setChartType }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setDdOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchTickers(query);
      setResults(r);
      setSearching(false);
      if (r.length > 0) setDdOpen(true);
    }, 400);
  }, [query, searchTickers]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setSelected(r);
    setQuery(r.name);
    setDdOpen(false);
  };

  const handleFetch = () => {
    const tickerSym = selected?.symbol || 'RELIANCE.NS';
    onSearch(tickerSym, period);
  };

  const typeColor: Record<string, string> = {
    EQUITY: '#00d4ff', ETF: '#00d46a', CRYPTOCURRENCY: '#f5a623',
    INDEX: '#a78bfa', MUTUALFUND: '#f5c842',
  };

  return (
    <div className="bb-sb-section fade-up">
      <div className="bb-sb-label">Symbol Search</div>

      {/* Search input */}
      <div className="bb-search-wrap" ref={ddRef}>
        <span className="bb-search-icon">⌕</span>
        <input
          className="bb-input"
          type="text"
          placeholder="Company or ticker…"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) setSelected(null); }}
          onFocus={() => results.length > 0 && setDdOpen(true)}
        />

        {/* Dropdown results */}
        {ddOpen && results.length > 0 && (
          <div className="bb-dd-menu">
            {results.map(r => (
              <div
                key={r.symbol}
                className={`bb-dd-item ${selected?.symbol === r.symbol ? 'sel' : ''}`}
                onClick={() => handleSelect(r)}
              >
                <span className="bb-dd-item-sym" style={{ color: typeColor[r.type?.toUpperCase()] || 'var(--bb-orange)' }}>
                  {r.symbol}
                </span>
                <span className="bb-dd-item-name">{r.name}</span>
                <span className="bb-dd-item-type">{r.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {searching && <div className="bb-searching">SEARCHING<span className="cursor-blink">_</span></div>}

      {/* Selected chip */}
      {selected && (
        <div style={{
          marginTop: 7, padding: '6px 10px', borderRadius: 4,
          background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bb-cyan)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: 'var(--bb-orange)', fontWeight: 700 }}>{selected.symbol}</span>
          <span style={{ color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
          <span style={{ color: 'var(--text3)' }}>{selected.exchange}</span>
        </div>
      )}

      {/* Period */}
      <div className="bb-select-group" style={{ marginTop: 10 }}>
        <label className="bb-select-label">Time Period</label>
        <select className="bb-select" value={period} onChange={e => setPeriod(e.target.value as Period)}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Chart type */}
      <div className="bb-select-group">
        <label className="bb-select-label">Chart Type</label>
        <select className="bb-select" value={chartType} onChange={e => setChartType(e.target.value as ChartType)}>
          {CHART_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <button
        className="bb-load-btn"
        onClick={handleFetch}
        disabled={loading || query.length < 1}
      >
        {loading ? (
          <>
            <div style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            LOADING…
          </>
        ) : (
          '▶ LOAD CHART'
        )}
      </button>
    </div>
  );
}
