import React, { useState, useCallback, useEffect } from 'react';
import StockSearch from './components/StockSearch';
import AdvancedChart from './components/AdvancedChart';
import PriceSummary from './components/PriceSummary';
import IndicatorSnapshot from './components/IndicatorSnapshot';
import PortfolioTracker from './components/PortfolioTracker';
import NewsFeed from './components/NewsFeed';
import Methodology from './components/Methodology';
import DownloadData from './components/DownloadData';
import FundamentalAnalysis from './components/FundamentalAnalysis';
import ScenarioAnalysis from './components/ScenarioAnalysis';
import { useStockData } from './hooks/useStockData';
import { Period, ChartType, IndicatorOption } from './types';

const DEFAULT_INDICATORS: IndicatorOption[] = ['EMA', 'RSI', 'MACD'];

const FKEYS = [
  { n: 'F1', l: 'CHART' }, { n: 'F2', l: 'TECHNICALS' }, { n: 'F3', l: 'FUNDAMENTALS' },
  { n: 'F4', l: 'SCENARIO' }, { n: 'F5', l: 'PORTFOLIO' }, { n: 'F6', l: 'NEWS' },
  { n: 'F7', l: 'DOWNLOAD' }, { n: 'F8', l: 'METHODOLOGY' },
];

const TAPE_SYMBOLS = [

];

export default function App() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [period, setPeriod] = useState<Period>('6mo');
  const [chartType, setChartType] = useState<ChartType>('Candlestick');
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorOption[]>(DEFAULT_INDICATORS);
  const [activeSection, setActiveSection] = useState('CHART');
  const [time, setTime] = useState('');

  const { loading, error, df, quote, news, fundamentals, fundLoading, fetchData, searchTickers } = useStockData();

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = useCallback((t: string, p: Period) => {
    setTicker(t);
    setPeriod(p);
    fetchData(t, p);
  }, [fetchData]);

  const defaultPrice = quote?.lastPrice ?? (df.length > 0 ? df[df.length - 1].close : 100);
  const change = (quote?.lastPrice != null && quote?.previousClose != null)
    ? quote.lastPrice - quote.previousClose : null;
  const changePct = (change != null && quote?.previousClose)
    ? (change / quote.previousClose) * 100 : null;

  const tapeItems = [...TAPE_SYMBOLS, ...TAPE_SYMBOLS];

  return (
    <div className="terminal-grid" style={{ minHeight: '100vh' }}>
      {/* ── TOP BAR ── */}
      <header className="bb-topbar">
        <div className="bb-topbar-inner">
          <div className="bb-logo">
            <div className="bb-logo-mark">Ƭ</div>
            <div className="bb-logo-text">
              <a
                href="https://quadraforge.in"
                target="_blank"
                rel="noopener noreferrer"
                className="bb-logo-name"
              >
                QuadraForge
              </a>
              <div className="bb-logo-sub">tradeterminal
              </div>
            </div>
          </div>

          <div className="bb-tape-wrap">
            <div className="bb-tape-inner ticker-animate">
              {tapeItems.map((item, i) => (
                <div className="bb-tape-item" key={i}>
                  <span className="bb-tape-sym">{item.sym}</span>
                  <span className="bb-tape-price">{item.price}</span>
                  <span className={`bb-tape-chg ${item.pos ? 'pos' : 'neg'}`}>{item.chg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bb-topbar-right">
            <span className="bb-time">{time}</span>
            <div className="bb-live-badge">
              <span className="bb-live-dot live-dot" />
              LIVE
            </div>
          </div>
        </div>

        <div className="bb-fkey-bar">
          {FKEYS.map(f => (
            <div key={f.n} className={`bb-fkey ${activeSection === f.l ? 'active' : ''}`} onClick={() => setActiveSection(f.l)}>
              <span className="bb-fkey-n">{f.n}</span>
              <span className="bb-fkey-l">{f.l}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── LAYOUT ── */}
      <div className="bb-layout">
        {/* SIDEBAR */}
        <aside className="bb-sidebar">
          <StockSearch
            onSearch={handleSearch}
            searchTickers={searchTickers}
            loading={loading}
            period={period}
            setPeriod={setPeriod}
            chartType={chartType}
            setChartType={setChartType}
          />

          {quote && (
            <div className="bb-sb-section fade-up-2">
              <div className="bb-sb-label">Active Position</div>
              <div className="bb-ticker-card">
                <div className="bb-tc-sym">{quote.symbol || ticker}</div>
                <div className={`bb-tc-price ${change != null ? (change >= 0 ? 'pos' : 'neg') : ''}`}>
                  {quote.currency}{quote.lastPrice?.toFixed(2) ?? '—'}
                </div>
                {change != null && changePct != null && (
                  <div className={`bb-tc-chg ${change >= 0 ? 'pos' : 'neg'}`}>
                    {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({change >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                  </div>
                )}
                <div className="bb-tc-grid">
                  <div className="bb-tc-item"><div className="bb-tc-k">High</div><div className="bb-tc-v">{quote.currency}{quote.dayHigh?.toFixed(2) ?? '—'}</div></div>
                  <div className="bb-tc-item"><div className="bb-tc-k">Low</div><div className="bb-tc-v">{quote.currency}{quote.dayLow?.toFixed(2) ?? '—'}</div></div>
                  <div className="bb-tc-item"><div className="bb-tc-k">Prev</div><div className="bb-tc-v">{quote.currency}{quote.previousClose?.toFixed(2) ?? '—'}</div></div>
                  <div className="bb-tc-item">
                    <div className="bb-tc-k">Vol</div>
                    <div className="bb-tc-v">{quote.lastVolume != null ? (quote.lastVolume >= 1e7 ? (quote.lastVolume / 1e7).toFixed(1) + 'Cr' : (quote.lastVolume / 1e5).toFixed(1) + 'L') : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick fundamentals in sidebar */}
          {fundamentals && !fundLoading && (
            <div className="bb-sb-section fade-up-3">
              <div className="bb-sb-label">Quick Fundamentals</div>
              {[
                { k: 'P/E (TTM)', v: fundamentals.valuation?.trailingPE != null ? fundamentals.valuation.trailingPE.toFixed(1) + 'x' : '—' },
                { k: 'Forward P/E', v: fundamentals.valuation?.forwardPE != null ? fundamentals.valuation.forwardPE.toFixed(1) + 'x' : '—' },
                { k: 'P/B Ratio', v: fundamentals.valuation?.priceToBook != null ? fundamentals.valuation.priceToBook.toFixed(2) + 'x' : '—' },
                { k: 'EPS (TTM)', v: fundamentals.keyStats?.trailingEps != null ? (quote?.currency || '$') + fundamentals.keyStats.trailingEps.toFixed(2) : '—' },
                { k: 'Div Yield', v: fundamentals.dividends?.dividendYield != null ? (fundamentals.dividends.dividendYield * 100).toFixed(2) + '%' : '—' },
                { k: 'ROE', v: fundamentals.profitability?.returnOnEquity != null ? (fundamentals.profitability.returnOnEquity * 100).toFixed(2) + '%' : '—' },
              ].map(item => (
                <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(245,166,35,0.05)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{item.k}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bb-orange)', fontWeight: 600 }}>{item.v}</span>
                </div>
              ))}
            </div>
          )}

          {fundLoading && (
            <div className="bb-sb-section">
              <div className="bb-sb-label">Fundamentals</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
                <div className="bb-spinner" style={{ width: 14, height: 14 }} /> Loading…
              </div>
            </div>
          )}

          <div className="bb-sb-section" style={{ marginTop: 'auto' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', lineHeight: 1.7 }}>
              <strong style={{ color: 'rgba(245,166,35,0.5)', display: 'block', marginBottom: 4 }}>⚠ DISCLAIMER</strong>
              Educational use only. Not financial advice. Yahoo Finance data may have delays or gaps.
              Past performance ≠ future results.
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="bb-main">
          {loading && (
            <div className="bb-spinner-wrap">
              <div className="bb-spinner" />
              <div className="bb-spinner-label">LOADING MARKET DATA…</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: 16 }}>
              <div className="bb-alert bb-alert-error">⚡ {error} — try a different ticker or time period.</div>
            </div>
          )}

          {!loading && df.length === 0 && !error && (
            <div className="bb-empty fade-up">
              <div className="bb-empty-icon">◈</div>
              <div className="bb-empty-title">Search for a Symbol</div>
              <div className="bb-empty-sub">
                Enter a company name in the sidebar — e.g. Reliance, TCS, Apple, Bitcoin —
                select it from the dropdown, choose period and chart type, then click LOAD CHART.
              </div>
            </div>
          )}

          {!loading && df.length > 0 && (
            <>
              {/* Price metrics strip */}
              <PriceSummary quote={quote} />

              {/* Chart */}
              <div className="bb-content-section fade-up-1">
                <div className="bb-section-hdr">
                  <span className="bb-section-title">Advanced Chart</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{ticker} · {period}</span>
                </div>
                <AdvancedChart df={df} chartType={chartType} selected={selectedIndicators} setSelected={setSelectedIndicators} />
              </div>

              {/* Indicator Snapshot */}
              <div className="fade-up-2">
                <IndicatorSnapshot df={df} quote={quote} />
              </div>

              {/* Fundamental Analysis */}
              <div className="fade-up-3">
                <FundamentalAnalysis data={fundamentals} quote={quote} loading={fundLoading} ticker={ticker} />
              </div>

              {/* Scenario Analysis */}
              <div className="fade-up-4">
                <ScenarioAnalysis fundamentals={fundamentals} quote={quote} ticker={ticker} />
              </div>

              {/* Portfolio Tracker */}
              <div className="fade-up-5">
                <PortfolioTracker defaultTicker={ticker} defaultPrice={defaultPrice} quote={quote} period={period} />
              </div>

              {/* Download */}
              <DownloadData df={df} ticker={ticker} />

              {/* News */}
              <NewsFeed items={news} ticker={ticker} />

              {/* Methodology */}
              <Methodology />

              {/* Footer */}
              <div className="bb-footer">
                <strong>⚠ DISCLAIMER:</strong> All data sourced from Yahoo Finance and may contain delays, gaps, or inaccuracies.
                Technical indicators and fundamental analysis are for <strong>educational and informational purposes only</strong> — NOT financial advice.
                Past performance does not guarantee future results. Always conduct independent due diligence before making investment decisions.
                Never risk capital you cannot afford to lose.
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
