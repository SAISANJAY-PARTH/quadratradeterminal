import React, { useState } from 'react';

interface Props {
  data: any;
  quote: any;
  loading: boolean;
  ticker: string;
}

type Tab = 'overview' | 'income' | 'balance' | 'cashflow' | 'analyst';
type Freq = 'annual' | 'quarterly';

function fmtNum(v: number | null, digits = 2): string {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtLarge(v: number | null, sym = ''): string {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}${sym}${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}${sym}${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

function fmtPct(v: number | null): string {
  if (v == null || isNaN(v)) return '—';
  return `${(v * 100).toFixed(2)}%`;
}

function pctColor(v: number | null): string {
  if (v == null) return '';
  return v >= 0 ? 'pos' : 'neg';
}

function valColor(v: number | null): string {
  if (v == null) return '';
  return v >= 0 ? 'pos' : 'neg';
}

function KVRow({ label, value, note, cls }: { label: string; value: string; note?: string; cls?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(245,166,35,0.06)' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.3px' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: cls === 'pos' ? 'var(--bb-green)' : cls === 'neg' ? 'var(--bb-red)' : cls === 'gold' ? 'var(--bb-orange)' : 'var(--text)' }}>{value}</span>
        {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>{note}</div>}
      </div>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bb-orange)', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 0 6px', borderBottom: '1px solid rgba(245,166,35,0.15)', marginBottom: 4, fontWeight: 700 }}>
      {title}
    </div>
  );
}

// ── Freq toggle component ─────────────────────────────────────────────────────
function FreqToggle({ freq, onChange }: { freq: Freq; onChange: (f: Freq) => void }) {
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', padding: '0 14px', gap: 6 }}>
      {(['annual', 'quarterly'] as Freq[]).map(f => (
        <button key={f} onClick={() => onChange(f)} style={{
          background: freq === f ? 'rgba(245,166,35,0.1)' : 'transparent',
          border: `1px solid ${freq === f ? 'var(--bb-orange)' : 'rgba(245,166,35,0.15)'}`,
          borderRadius: 3, color: freq === f ? 'var(--bb-orange)' : 'var(--text3)',
          padding: '3px 10px', fontFamily: 'var(--mono)', fontSize: 9,
          cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          {f}
        </button>
      ))}
    </div>
  );
}

export default function FundamentalAnalysis({ data, quote, loading, ticker }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  // Each statement tab has its own independent freq
  const [incomeFreq, setIncomeFreq] = useState<Freq>('annual');
  const [balanceFreq, setBalanceFreq] = useState<Freq>('annual');
  const [cashFreq, setCashFreq] = useState<Freq>('annual');

  const sym = quote?.currency || '$';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'OVERVIEW' },
    { key: 'income', label: 'INCOME STMT' },
    { key: 'balance', label: 'BALANCE SHEET' },
    { key: 'cashflow', label: 'CASH FLOW' },
    { key: 'analyst', label: 'ANALYST EST.' },
  ];

  if (loading) {
    return (
      <div className="bb-content-section">
        <div className="bb-section-hdr"><span className="bb-section-title">Fundamental Analysis</span></div>
        <div style={{ padding: '32px 16px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
          <div className="bb-spinner" style={{ width: 18, height: 18 }} /> FETCHING FUNDAMENTAL DATA…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bb-content-section">
        <div className="bb-section-hdr"><span className="bb-section-title">Fundamental Analysis</span></div>
        <div style={{ padding: '16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
          No fundamental data available for <span style={{ color: 'var(--bb-orange)' }}>{ticker}</span> — may be an index, crypto, or unsupported instrument.
        </div>
      </div>
    );
  }

  const {
    valuation: val,
    keyStats: ks,
    dividends: div,
    profitability: prof,
    health,
    company,
    incomeAnnual,
    incomeQuarterly,
    balanceAnnual,
    balanceQuarterly,
    cashflowAnnual,
    cashflowQuarterly,
    analystTrend,
  } = data;

  const currentPrice = quote?.lastPrice;
  const week52High = ks?.week52High;
  const week52Low = ks?.week52Low;
  const pricePct52 = (currentPrice && week52High && week52Low)
    ? ((currentPrice - week52Low) / (week52High - week52Low + 1e-10)) * 100 : null;

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1px', background: 'rgba(245,166,35,0.06)' }}>
      {/* Valuation */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="Valuation" />
        <KVRow label="Trailing P/E" value={val?.trailingPE != null ? fmtNum(val.trailingPE, 2) + 'x' : '—'} />
        <KVRow label="Forward P/E" value={val?.forwardPE != null ? fmtNum(val.forwardPE, 2) + 'x' : '—'} />
        <KVRow label="Price / Book" value={val?.priceToBook != null ? fmtNum(val.priceToBook, 2) + 'x' : '—'} />
        <KVRow label="Price / Sales" value={val?.priceToSales != null ? fmtNum(val.priceToSales, 2) + 'x' : '—'} />
        <KVRow label="PEG Ratio" value={val?.pegRatio != null ? fmtNum(val.pegRatio, 2) : '—'} />
        <KVRow label="EV / EBITDA" value={val?.evToEbitda != null ? fmtNum(val.evToEbitda, 2) + 'x' : '—'} />
        <KVRow label="EV / Revenue" value={val?.evToRevenue != null ? fmtNum(val.evToRevenue, 2) + 'x' : '—'} />
        <KVRow label="Enterprise Value" value={fmtLarge(val?.enterpriseValue, sym)} cls="gold" />
        <KVRow
          label="Market Cap"
          value={fmtLarge(val?.marketCap, sym)}
          cls="gold"
        />
      </div>

      {/* Key Stats */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="Key Statistics" />
        <KVRow label="EPS (TTM)" value={ks?.trailingEps != null ? sym + fmtNum(ks.trailingEps) : '—'} cls={ks?.trailingEps >= 0 ? 'pos' : 'neg'} />
        <KVRow label="EPS (Forward)" value={ks?.forwardEps != null ? sym + fmtNum(ks.forwardEps) : '—'} cls={ks?.forwardEps >= 0 ? 'pos' : 'neg'} />
        <KVRow label="Book Value / Share" value={ks?.bookValue != null ? sym + fmtNum(ks.bookValue) : '—'} />
        <KVRow label="Beta (5Y Monthly)" value={ks?.beta != null ? fmtNum(ks.beta, 3) : '—'} />
        <KVRow label="Shares Outstanding" value={fmtLarge(ks?.sharesOutstanding)} />
        <KVRow label="Float" value={fmtLarge(ks?.floatShares)} />
        <KVRow label="Short Ratio" value={ks?.shortRatio != null ? fmtNum(ks.shortRatio, 2) : 'Not Published'} />
        {ks?.lastSplitFactor && <KVRow label="Last Split" value={`${ks.lastSplitFactor} (${ks.lastSplitDate || ''})`} />}
      </div>

      {/* 52-Week + Dividends */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="52-Week Range" />
        <KVRow label="52W High" value={week52High != null ? sym + fmtNum(week52High) : '—'} />
        <KVRow label="52W Low" value={week52Low != null ? sym + fmtNum(week52Low) : '—'} />
        <KVRow label="Current vs High" value={currentPrice && week52High ? (((currentPrice / week52High) - 1) * 100).toFixed(2) + '%' : '—'} cls={currentPrice && week52High ? valColor((currentPrice / week52High) - 1) : ''} />
        {pricePct52 != null && (
          <div style={{ margin: '6px 0 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>
              <span>52W LOW</span><span>52W HIGH</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(245,166,35,0.1)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${pricePct52}%`, height: '100%', background: 'linear-gradient(90deg, var(--bb-red), var(--bb-green))', borderRadius: 3 }} />
              <div style={{ position: 'absolute', top: -1, left: `calc(${pricePct52}% - 3px)`, width: 6, height: 8, background: 'var(--bb-orange)', borderRadius: 2 }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bb-orange)', textAlign: 'center', marginTop: 3 }}>
              {pricePct52.toFixed(1)}% of 52W range
            </div>
          </div>
        )}
        <KVRow label="50D Avg" value={ks?.fiftyDayAvg != null ? sym + fmtNum(ks.fiftyDayAvg) : '—'} />
        <KVRow label="200D Avg" value={ks?.twoHundredDayAvg != null ? sym + fmtNum(ks.twoHundredDayAvg) : '—'} />

        <SectionHead title="Dividends" />
        <KVRow label="Dividend Yield" value={div?.dividendYield != null ? fmtPct(div.dividendYield) : '—'} cls={div?.dividendYield > 0 ? 'pos' : ''} />
        <KVRow label="Annual Dividend" value={div?.dividendRate != null ? sym + fmtNum(div.dividendRate) : '—'} />
        <KVRow label="Payout Ratio" value={div?.payoutRatio != null ? fmtPct(div.payoutRatio) : '—'} />
        <KVRow label="5Y Avg Yield" value={div?.fiveYearAvgYield != null ? fmtNum(div.fiveYearAvgYield, 2) + '%' : '—'} />
        <KVRow label="Ex-Div Date" value={div?.exDividendDate || '—'} />
      </div>

      {/* Profitability */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="Profitability" />
        <KVRow label="Gross Margin" value={fmtPct(prof?.grossMargins)} cls={pctColor(prof?.grossMargins)} />
        <KVRow label="Operating Margin" value={fmtPct(prof?.operatingMargins)} cls={pctColor(prof?.operatingMargins)} />
        <KVRow label="Net Profit Margin" value={fmtPct(prof?.profitMargins)} cls={pctColor(prof?.profitMargins)} />
        <KVRow label="EBITDA Margin" value={fmtPct(prof?.ebitdaMargins)} cls={pctColor(prof?.ebitdaMargins)} />
        <KVRow label="Return on Assets" value={fmtPct(prof?.returnOnAssets)} cls={pctColor(prof?.returnOnAssets)} />
        <KVRow label="Return on Equity" value={fmtPct(prof?.returnOnEquity)} cls={pctColor(prof?.returnOnEquity)} />
        <KVRow label="Revenue (TTM)" value={fmtLarge(prof?.totalRevenue, sym)} cls="gold" />
        <KVRow label="Revenue / Share" value={prof?.revenuePerShare != null ? sym + fmtNum(prof.revenuePerShare) : '—'} />
        <KVRow label="Revenue Growth" value={fmtPct(prof?.revenueGrowth)} cls={pctColor(prof?.revenueGrowth)} />
        <KVRow label="Earnings Growth" value={fmtPct(prof?.earningsGrowth)} cls={pctColor(prof?.earningsGrowth)} />
        <KVRow label="Gross Profit (TTM)" value={fmtLarge(prof?.grossProfits, sym)} />
        <KVRow label="EBITDA (TTM)" value={fmtLarge(prof?.ebitda, sym)} />
      </div>

      {/* Financial Health */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="Financial Health" />
        <KVRow label="Total Cash" value={fmtLarge(health?.totalCash, sym)} cls="pos" />
        <KVRow label="Cash / Share" value={health?.totalCashPerShare != null ? sym + fmtNum(health.totalCashPerShare) : '—'} />
        <KVRow label="Total Debt" value={fmtLarge(health?.totalDebt, sym)} cls="neg" />
        <KVRow label="Debt / Equity" value={health?.debtToEquity != null ? fmtNum(health.debtToEquity, 2) + '%' : '—'} cls={health?.debtToEquity > 100 ? 'neg' : 'pos'} />
        <KVRow label="Current Ratio" value={health?.currentRatio != null ? fmtNum(health.currentRatio, 2) : '—'} cls={health?.currentRatio >= 1.5 ? 'pos' : health?.currentRatio < 1 ? 'neg' : ''} />
        <KVRow label="Quick Ratio" value={health?.quickRatio != null ? fmtNum(health.quickRatio, 2) : '—'} cls={health?.quickRatio >= 1 ? 'pos' : 'neg'} />
        <KVRow label="Free Cash Flow" value={fmtLarge(health?.freeCashflow, sym)} cls={health?.freeCashflow >= 0 ? 'pos' : 'neg'} />
        <KVRow label="Operating Cash Flow" value={fmtLarge(health?.operatingCashflow, sym)} cls={health?.operatingCashflow >= 0 ? 'pos' : 'neg'} />
      </div>

      {/* Company */}
      <div style={{ background: 'var(--bb-bg)', padding: '12px 14px' }}>
        <SectionHead title="Company Profile" />
        {company?.sector && <KVRow label="Sector" value={company.sector} />}
        {company?.industry && <KVRow label="Industry" value={company.industry} />}
        {company?.employees && <KVRow label="Full-Time Employees" value={Number(company.employees).toLocaleString()} />}
        {company?.website && (
          <div style={{ marginTop: 6 }}>
            <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--bb-cyan)', textDecoration: 'none' }}>
              {company.website.replace(/^https?:\/\//, '')} →
            </a>
          </div>
        )}
        {company?.description && (
          <div style={{ marginTop: 10, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--text3)', lineHeight: 1.7, maxHeight: 120, overflow: 'hidden' }}>
            {company.description.slice(0, 360)}{company.description.length > 360 ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  );

  // ── FINANCIAL STATEMENT TABLE ─────────────────────────────────────────────
  const renderFSTable = (
    rows: any[],
    cols: { key: string; label: string; fmt?: (v: any) => string; cls?: (v: any) => string }[]
  ) => {
    if (!rows || rows.length === 0) return (
      <div style={{ padding: '16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>No data available.</div>
    );
    const sorted = [...rows].sort((a, b) => (a.date > b.date ? -1 : 1));
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="bb-table">
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>Metric</th>
              {sorted.map(r => <th key={r.date} style={{ textAlign: 'right', minWidth: 110 }}>{r.date}</th>)}
            </tr>
          </thead>
          <tbody>
            {cols.map(col => (
              <tr key={col.key}>
                <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{col.label}</td>
                {sorted.map(r => {
                  const v = r[col.key];
                  const fmt = col.fmt ? col.fmt(v) : fmtLarge(v, sym);
                  const cls = col.cls ? col.cls(v) : '';
                  return (
                    <td key={r.date} style={{ textAlign: 'right', color: cls === 'pos' ? 'var(--bb-green)' : cls === 'neg' ? 'var(--bb-red)' : cls === 'gold' ? 'var(--bb-orange)' : 'var(--text)' }}>
                      {fmt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Column definitions ─────────────────────────────────────────────────────
  const incomeCols = [
    { key: 'totalRevenue', label: 'Total Revenue', cls: () => 'gold' },
    { key: 'grossProfit', label: 'Gross Profit', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'operatingIncome', label: 'Operating Income', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'ebit', label: 'EBIT', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'netIncome', label: 'Net Income', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'researchDevelopment', label: 'R&D Expense', cls: () => 'neg' },
    { key: 'sellingGeneralAdministrative', label: 'SG&A Expense', cls: () => 'neg' },
    { key: 'totalOperatingExpenses', label: 'Total Op. Expenses', cls: () => 'neg' },
    { key: 'incomeBeforeTax', label: 'Income Before Tax', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'incomeTaxExpense', label: 'Income Tax Expense', cls: () => 'neg' },
    { key: 'eps', label: 'EPS (Diluted)', fmt: (v: any) => v != null ? sym + fmtNum(v) : '—', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
  ];

  const balanceCols = [
    { key: 'totalAssets', label: 'Total Assets', cls: () => 'gold' },
    { key: 'totalCurrentAssets', label: '  Current Assets', cls: () => 'pos' },
    { key: 'cash', label: '    Cash & Equivalents', cls: () => 'pos' },
    { key: 'shortTermInvestments', label: '    Short-Term Investments', cls: (v: any) => v >= 0 ? 'pos' : '' },
    { key: 'netReceivables', label: '    Net Receivables', cls: () => '' },
    { key: 'inventory', label: '    Inventory', cls: () => '' },
    { key: 'goodWill', label: '  Goodwill', cls: () => '' },
    { key: 'totalLiab', label: 'Total Liabilities', cls: () => 'neg' },
    { key: 'totalCurrentLiabilities', label: '  Current Liabilities', cls: () => 'neg' },
    { key: 'longTermDebt', label: '  Long-Term Debt', cls: () => 'neg' },
    { key: 'shortLongTermDebt', label: '  Short-Term Debt', cls: () => 'neg' },
    { key: 'totalStockholderEquity', label: "Total Shareholders' Equity", cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'retainedEarnings', label: '  Retained Earnings', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
  ];

  const cashCols = [
    { key: 'totalCashFromOperatingActivities', label: 'Operating Cash Flow', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'capitalExpenditures', label: 'Capital Expenditures', cls: () => 'neg' },
    { key: 'freeCashflow', label: 'Free Cash Flow', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'totalCashFromInvestingActivities', label: 'Investing Cash Flow', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'totalCashFromFinancingActivities', label: 'Financing Cash Flow', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'changeInCash', label: 'Net Change in Cash', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'netIncome', label: 'Net Income', cls: (v: any) => v >= 0 ? 'pos' : 'neg' },
    { key: 'depreciation', label: 'Depreciation & Amort.', cls: () => '' },
    { key: 'dividendsPaid', label: 'Dividends Paid', cls: () => 'neg' },
  ];

  // ── ANALYST ───────────────────────────────────────────────────────────────
  const renderAnalyst = () => {
    if (!analystTrend || analystTrend.length === 0) return (
      <div style={{ padding: '16px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>No analyst estimates available.</div>
    );
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="bb-table">
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: 'right' }}>End Date</th>
              <th style={{ textAlign: 'right' }}>EPS Low</th>
              <th style={{ textAlign: 'right' }}>EPS Mean</th>
              <th style={{ textAlign: 'right' }}>EPS High</th>
              <th style={{ textAlign: 'right' }}>EPS Growth</th>
              <th style={{ textAlign: 'right' }}>Rev Low</th>
              <th style={{ textAlign: 'right' }}>Rev Mean</th>
              <th style={{ textAlign: 'right' }}>Rev High</th>
            </tr>
          </thead>
          <tbody>
            {analystTrend.map((t: any, i: number) => (
              <tr key={i}>
                <td style={{ color: 'var(--bb-orange)', fontWeight: 600 }}>{t.period}</td>
                <td style={{ textAlign: 'right' }}>{t.endDate}</td>
                <td style={{ textAlign: 'right', color: 'var(--bb-red)' }}>{t.epsEstimateLow != null ? sym + fmtNum(t.epsEstimateLow) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--text)' }}>{t.epsEstimateMean != null ? sym + fmtNum(t.epsEstimateMean) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--bb-green)' }}>{t.epsEstimateHigh != null ? sym + fmtNum(t.epsEstimateHigh) : '—'}</td>
                <td style={{ textAlign: 'right', color: t.epsMeanGrowth >= 0 ? 'var(--bb-green)' : 'var(--bb-red)' }}>{t.epsMeanGrowth != null ? fmtPct(t.epsMeanGrowth) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--bb-red)' }}>{t.revenueEstimateLow != null ? fmtLarge(t.revenueEstimateLow, sym) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--text)' }}>{t.revenueEstimateMean != null ? fmtLarge(t.revenueEstimateMean, sym) : '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--bb-green)' }}>{t.revenueEstimateHigh != null ? fmtLarge(t.revenueEstimateHigh, sym) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Which rows to render per tab ──────────────────────────────────────────
  const incomeRows = incomeFreq === 'annual' ? incomeAnnual : (incomeQuarterly || []);
  const balanceRows = balanceFreq === 'annual' ? balanceAnnual : (balanceQuarterly || []);
  const cashRows = cashFreq === 'annual' ? cashflowAnnual : (cashflowQuarterly || []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bb-content-section">
      <div className="bb-section-hdr">
        <span className="bb-section-title">Fundamental Analysis</span>
        {company?.sector && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '1px' }}>
            {company.sector} · {company.industry}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(245,166,35,0.08)', background: '#050505', gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? 'rgba(245,166,35,0.08)' : 'transparent',
            border: 'none',
            borderBottom: tab === t.key ? '2px solid var(--bb-orange)' : '2px solid transparent',
            color: tab === t.key ? 'var(--bb-orange)' : 'var(--text3)',
            padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 10,
            cursor: 'pointer', letterSpacing: '1px', transition: 'all 0.12s',
          }}>
            {t.label}
          </button>
        ))}

        {/* Freq toggle — shown for all three statement tabs */}
        {tab === 'income' && <FreqToggle freq={incomeFreq} onChange={setIncomeFreq} />}
        {tab === 'balance' && <FreqToggle freq={balanceFreq} onChange={setBalanceFreq} />}
        {tab === 'cashflow' && <FreqToggle freq={cashFreq} onChange={setCashFreq} />}
      </div>

      {tab === 'overview' && renderOverview()}
      {tab === 'income' && renderFSTable(incomeRows, incomeCols as any)}
      {tab === 'balance' && renderFSTable(balanceRows, balanceCols as any)}
      {tab === 'cashflow' && renderFSTable(cashRows, cashCols as any)}
      {tab === 'analyst' && renderAnalyst()}
    </div>
  );
}
