import { config } from 'dotenv';
import { growthAnalytics } from './analytics/growth/growth';
import { qualityAnalytics } from './analytics/quality/quality';
import { calculatePiotroski } from './analytics/piotroski';
import { calculateAltman } from './analytics/altman';
import { overallScore } from './analytics/scoring';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import xml2js from 'xml2js';
import path from 'path';

import {
  getCachedFundamentals,
  setCachedFundamentals
} from './cache/fundamentalsCache';

import {
  getFundamentals,
  saveFundamentals
} from './db/fundamentalsRepo';
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const YF_HEADERS = { 'User-Agent': UA, Accept: 'application/json' };

let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getYFCrumb(): Promise<{ crumb: string; cookie: string }> {
  const now = Date.now();
  if (crumbCache && now < crumbCache.expiresAt) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }
  const consentRes = await axios.get('https://fc.yahoo.com/', {
    headers: { 'User-Agent': UA },
    maxRedirects: 5,
    validateStatus: () => true,
    timeout: 10000,
  });
  const rawCookies: string[] = [];
  const setCookie = consentRes.headers['set-cookie'];
  if (Array.isArray(setCookie)) rawCookies.push(...setCookie);
  else if (setCookie) rawCookies.push(setCookie);
  const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');
  const crumbRes = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Accept: 'text/plain,*/*', Cookie: cookieStr },
    timeout: 10000,
  });
  const crumb = typeof crumbRes.data === 'string' ? crumbRes.data.trim() : '';
  if (!crumb || crumb.includes('Unauthorized') || crumb.includes('{')) {
    throw new Error('Could not obtain Yahoo Finance crumb');
  }
  crumbCache = { crumb, cookie: cookieStr, expiresAt: now + 55 * 60 * 1000 };
  console.log('YF crumb refreshed:', crumb.slice(0, 6) + '…');
  return { crumb, cookie: cookieStr };
}

async function yfSummary(ticker: string, modules: string, retried = false): Promise<any> {
  const { crumb, cookie } = await getYFCrumb();
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: cookie },
    timeout: 15000,
  });
  const err = res.data?.quoteSummary?.error || res.data?.finance?.error;
  if (err?.code === 'Unauthorized' && !retried) {
    crumbCache = null;
    return yfSummary(ticker, modules, true);
  }
  const result = res.data?.quoteSummary?.result?.[0] ?? res.data?.finance?.result?.[0];
  if (!result) throw new Error(err?.description || 'No data returned from Yahoo Finance');
  return result;
}

function safeFmt(obj: any, ...keys: string[]): number | null {
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return null;
    cur = cur[k];
  }
  if (cur == null) return null;
  if (typeof cur === 'object' && cur.raw != null) return Number(cur.raw);
  if (!isNaN(Number(cur))) return Number(cur);
  return null;
}

function safeStr(obj: any, ...keys: string[]): string | null {
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return null;
    cur = cur[k];
  }
  if (cur == null) return null;
  if (typeof cur === 'object' && cur.fmt != null) return String(cur.fmt);
  return String(cur);
}

function nz(v: number | null): number | null {
  return (v === 0 || v == null) ? null : v;
}

function periodToInterval(period: string): string {
  const map: Record<string, string> = {
    '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d',
    '6mo': '1d', '1y': '1d', '2y': '1wk', '5y': '1mo', 'max': '1mo',
  };
  return map[period] || '1d';
}

// ── Build flat rows keyed by asOfDate from timeseries result array ────────────
function buildTimeseriesRows(results: any[]): Record<string, any> {
  const rows: Record<string, any> = {};
  for (const item of results) {
    const type = item.meta?.type?.[0];
    if (!type) continue;
    const values = item[type] || [];
    for (const v of values) {
      const date = v.asOfDate;
      if (!date) continue;
      if (!rows[date]) rows[date] = { date };
      rows[date][type] = v.reportedValue?.raw ?? null;
    }
  }
  return rows;
}

// ── All timeseries field names we request (both annual + quarterly) ───────────
const ANNUAL_TYPES = [

  // Income Statement
  'annualTotalRevenue',
  'annualCostOfRevenue',
  'annualGrossProfit',
  'annualOperatingIncome',
  'annualEbit',
  'annualNetIncome',
  'annualBasicEPS',
  'annualDilutedEPS',
  'annualEbitda',
  'annualResearchAndDevelopment',
  'annualTaxProvision',
  'annualPretaxIncome',
  'annualTotalExpenses',
  'annualSellingGeneralAndAdministration',

  // Balance Sheet
  'annualTotalAssets',
  'annualCurrentAssets',
  'annualCurrentLiabilities',
  'annualCashAndCashEquivalents',
  'annualCashCashEquivalentsAndShortTermInvestments',
  'annualNetReceivables',
  'annualReceivables',
  'annualAccountsReceivable',
  'annualInventory',

  'annualLongTermDebt',
  'annualLongTermDebtAndCapitalLeaseObligation',
  'annualLongTermDebtAndCapitalLeaseObligationCurrent',

  'annualCurrentDebt',
  'annualCurrentLongTermDebt',
  'annualCurrentDebtAndCapitalLeaseObligation',

  'annualTotalDebt',

  'annualStockholdersEquity',
  'annualCommonStockEquity',

  'annualTotalLiabilities',
  'annualTotalLiabilitiesNetMinorityInterest',

  'annualShortTermInvestments',

  'annualGoodwill',
  'annualGoodwillAndOtherIntangibleAssets',

  'annualRetainedEarnings',

  // Cash Flow
  'annualOperatingCashFlow',
  'annualCapitalExpenditure',
  'annualFreeCashFlow',
  'annualInvestingCashFlow',
  'annualFinancingCashFlow',
  'annualDepreciationAndAmortization',
  'annualDeferredIncomeTax',
  'annualCommonStockDividendPaid',
  'annualCashDividendsPaid',
  'annualChangesInCash',
  'annualEndCashPosition',

].join(',');


const QUARTERLY_TYPES = ANNUAL_TYPES.replace(/annual/g, 'quarterly');

// ── Map a row to an income record ─────────────────────────────────────────────
function mapIncomeRow(row: any, prefix: 'annual' | 'quarterly') {
  const p = prefix;
  return {
    date: row.date,
    totalRevenue: row[`${p}TotalRevenue`] ?? null,
    grossProfit: row[`${p}GrossProfit`] ?? null,
    operatingIncome: row[`${p}OperatingIncome`] ?? null,
    ebit: row[`${p}Ebit`] ?? row[`${p}OperatingIncome`] ?? null,
    netIncome: row[`${p}NetIncome`] ?? null,
    researchDevelopment: row[`${p}ResearchAndDevelopment`] ?? null,
    sellingGeneralAdministrative: row[`${p}SellingGeneralAndAdministration`] ?? null,
    totalOperatingExpenses: row[`${p}TotalExpenses`] ?? null,
    incomeBeforeTax: row[`${p}PretaxIncome`] ?? null,
    incomeTaxExpense: row[`${p}TaxProvision`] ?? null,
    eps: row[`${p}DilutedEPS`] ?? row[`${p}BasicEPS`] ?? null,
  };
}

// ── Map a row to a balance sheet record ───────────────────────────────────────
function mapBalanceRow(row: any, prefix: 'annual' | 'quarterly') {
  const p = prefix;
  // Yahoo sometimes puts cash+STI together; split gracefully
  const cashAndSTI = row[`${p}CashCashEquivalentsAndShortTermInvestments`] ?? null;
  const cashOnly = row[`${p}CashAndCashEquivalents`] ?? cashAndSTI;
  const sti = row[`${p}ShortTermInvestments`]
    ?? (cashAndSTI != null && cashOnly != null ? cashAndSTI - cashOnly : null);
  return {
    date: row.date,

    // Assets
    totalAssets:
      row[`${p}TotalAssets`] ??
      null,

    totalCurrentAssets:
      row[`${p}CurrentAssets`] ??
      null,

    cash:
      cashOnly,

    shortTermInvestments:
      sti,

    netReceivables:
      row[`${p}NetReceivables`] ??
      row[`${p}Receivables`] ??
      row[`${p}AccountsReceivable`] ??
      null,

    inventory:
      row[`${p}Inventory`] ??
      null,

    goodWill:
      row[`${p}Goodwill`] ??
      row[`${p}GoodwillAndOtherIntangibleAssets`] ??
      null,

    // Liabilities
    totalLiab:
      row[`${p}TotalLiabilitiesNetMinorityInterest`] ??
      row[`${p}TotalLiabilities`] ??
      null,

    totalCurrentLiabilities:
      row[`${p}CurrentLiabilities`] ??
      null,

    // Long Term Debt (Yahoo uses multiple names)
    longTermDebt:
      row[`${p}LongTermDebt`] ??
      row[`${p}LongTermDebtAndCapitalLeaseObligation`] ??
      row[`${p}LongTermDebtAndCapitalLeaseObligationCurrent`] ??
      row[`${p}TotalDebt`] ??
      null,

    // Short Term Debt
    shortLongTermDebt:
      row[`${p}CurrentDebt`] ??
      row[`${p}CurrentLongTermDebt`] ??
      row[`${p}CurrentDebtAndCapitalLeaseObligation`] ??
      null,

    // Equity
    totalStockholderEquity:
      row[`${p}StockholdersEquity`] ??
      row[`${p}CommonStockEquity`] ??
      null,

    retainedEarnings:
      row[`${p}RetainedEarnings`] ??
      null,
  };
}

// ── Map a row to a cash-flow record ───────────────────────────────────────────
function mapCashRow(row: any, prefix: 'annual' | 'quarterly') {
  const p = prefix;
  return {
    date: row.date,
    totalCashFromOperatingActivities: row[`${p}OperatingCashFlow`] ?? null,
    capitalExpenditures: row[`${p}CapitalExpenditure`] ?? null,
    freeCashflow: row[`${p}FreeCashFlow`] ?? null,
    totalCashFromInvestingActivities: row[`${p}InvestingCashFlow`] ?? null,
    totalCashFromFinancingActivities: row[`${p}FinancingCashFlow`] ?? null,
    netIncome: row[`${p}NetIncome`] ?? null,
    depreciation: row[`${p}DepreciationAndAmortization`] ?? null,
    dividendsPaid: row[`${p}CommonStockDividendPaid`]
      ?? row[`${p}CashDividendsPaid`] ?? null,
    changeInCash: row[`${p}ChangesInCash`]
      ?? row[`${p}EndCashPosition`] ?? null,
    changeToInventory: null,
  };
}

app.get('/api/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  if (!q || q.length < 2) { res.json({ results: [] }); return; }
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&quotesCount=15&newsCount=0&listsCount=0`;
    const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 7000 });
    const results = (data.quotes || []).filter((item: any) => item.symbol).map((item: any) => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.symbol,
      exchange: item.exchDisp || '',
      type: item.quoteType || '',
      label: `${item.longname || item.shortname || item.symbol}  [${item.symbol}]  ${item.exchDisp || ''}`,
    }));
    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ results: [], error: e.message });
  }
});

app.get('/api/history', async (req, res) => {
  const ticker = (req.query.ticker as string) || '';
  const period = (req.query.period as string) || '6mo';
  if (!ticker) { res.status(400).json({ error: 'Missing ticker' }); return; }
  try {
    const interval = periodToInterval(period);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${period}&interval=${interval}&events=history`;
    const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 15000 });
    const chart = data.chart?.result?.[0];
    if (!chart) { res.status(404).json({ error: 'No data' }); return; }
    const timestamps: number[] = chart.timestamp || [];
    const ohlcv = chart.indicators?.quote?.[0];
    if (!ohlcv || timestamps.length === 0) { res.status(404).json({ error: 'No OHLCV data' }); return; }
    const rows = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString(),
      open: ohlcv.open?.[i] ?? null, high: ohlcv.high?.[i] ?? null,
      low: ohlcv.low?.[i] ?? null, close: ohlcv.close?.[i] ?? null,
      volume: ohlcv.volume?.[i] ?? 0,
    })).filter((r: any) => r.open !== null && r.close !== null);
    res.json({ data: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/quote', async (req, res) => {
  const ticker = (req.query.ticker as string) || '';
  if (!ticker) { res.status(400).json({ error: 'Missing ticker' }); return; }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const { data } = await axios.get(url, { headers: YF_HEADERS, timeout: 10000 });
    const meta = data.chart?.result?.[0]?.meta || {};
    const currencyMap: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    const currency = meta.currency || 'USD';
    res.json({
      lastPrice: meta.regularMarketPrice ?? null,
      dayHigh: meta.regularMarketDayHigh ?? null,
      dayLow: meta.regularMarketDayLow ?? null,
      previousClose: meta.previousClose ?? meta.chartPreviousClose ?? null,
      lastVolume: meta.regularMarketVolume ?? null,
      currency: currencyMap[currency] || currency + ' ',
      symbol: meta.symbol || ticker,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message, lastPrice: null, currency: '$', symbol: ticker });
  }
});

app.get('/api/fundamentals', async (req, res) => {
  const ticker = (req.query.ticker as string) || '';

  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker' });
  }
  const dbRecord = await getFundamentals(ticker);

  if (dbRecord) {
    const age =
      Date.now() -
      new Date(dbRecord.updated_at).getTime();

    const HOURS_24 = 24 * 60 * 60 * 1000;

    if (age < HOURS_24) {
      console.log('SUPABASE HIT:', ticker);
      return res.json(dbRecord.data);
    }
  }
  const cached = getCachedFundamentals(ticker);

  if (cached) {
    console.log('CACHE HIT:', ticker);
    return res.json(cached);
  }
  try {
    const modules = [
      'financialData', 'defaultKeyStatistics', 'summaryDetail',
      'earningsTrend', 'assetProfile',
    ].join(',');

    // ── Fetch quoteSummary + both timeseries in parallel ──────────────────────
    const [r, annualRows, quarterlyRows] = await Promise.all([
      yfSummary(ticker, modules),
      fetchTimeseries(ticker, ANNUAL_TYPES),
      fetchTimeseries(ticker, QUARTERLY_TYPES),
    ]);

    async function fetchTimeseries(sym: string, types: string) {
      try {
        const { crumb, cookie } = await getYFCrumb();
        // period1 = 2010-01-01 to get max history (covers 2022 and beyond)
        const url =
          `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(sym)}` +
          `?type=${types}&period1=1262304000&period2=${Math.floor(Date.now() / 1000)}` +
          `&crumb=${encodeURIComponent(crumb)}`;
        const res = await axios.get(url, {
          headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: cookie },
          timeout: 20000,
        });
        const results = res.data?.timeseries?.result || [];

        console.log(`Fetching fundamentals: ${sym}`);

        const rowMap = buildTimeseriesRows(results);

        console.log(
          'DATES FOUND:',
          Object.keys(rowMap)
        );

        return Object.values(rowMap).sort(
          (a: any, b: any) => a.date.localeCompare(b.date)
        );
      } catch (e: any) {
        console.warn(`Timeseries fetch failed (${types.slice(0, 20)}…):`, e.message);
        return [];
      }
    }

    // ── quoteSummary helpers ──────────────────────────────────────────────────
    const fd = r.financialData || {};
    const ks = r.defaultKeyStatistics || {};
    const sd = r.summaryDetail || {};
    const ap = r.assetProfile || {};
    const v = (obj: any, k: string) => safeFmt(obj, k);

    const valuation = {
      trailingPE: v(sd, 'trailingPE') ?? v(ks, 'trailingPE'),
      forwardPE: v(sd, 'forwardPE') ?? v(ks, 'forwardPE'),
      priceToBook: v(ks, 'priceToBook'),
      priceToSales: v(sd, 'priceToSalesTrailing12Months'),
      pegRatio: v(ks, 'pegRatio'),
      enterpriseValue: v(ks, 'enterpriseValue'),
      evToEbitda: v(ks, 'enterpriseToEbitda'),
      evToRevenue: v(ks, 'enterpriseToRevenue'),
      marketCap: v(sd, 'marketCap'),
      
    };

    const keyStats = {
      trailingEps: v(ks, 'trailingEps'),
      forwardEps: v(ks, 'forwardEps'),
      bookValue: v(ks, 'bookValue'),
      beta: v(sd, 'beta') ?? v(ks, 'beta'),
      sharesOutstanding: v(ks, 'sharesOutstanding'),
      floatShares: v(ks, 'floatShares'),
      shortRatio: v(ks, 'shortRatio'),
      week52High: v(sd, 'fiftyTwoWeekHigh'),
      week52Low: v(sd, 'fiftyTwoWeekLow'),
      fiftyDayAvg: v(sd, 'fiftyDayAverage'),
      twoHundredDayAvg: v(sd, 'twoHundredDayAverage'),
      lastSplitFactor: safeStr(ks, 'lastSplitFactor'),
      lastSplitDate: safeStr(ks, 'lastSplitDate'),
    };

    const dividends = {
      dividendYield: v(sd, 'dividendYield') ?? v(sd, 'trailingAnnualDividendYield'),
      dividendRate: v(sd, 'dividendRate') ?? v(sd, 'trailingAnnualDividendRate'),
      exDividendDate: safeStr(sd, 'exDividendDate'),
      payoutRatio: v(sd, 'payoutRatio'),
      fiveYearAvgYield: v(sd, 'fiveYearAvgDividendYield'),
    };

    const profitability = {
      grossMargins: v(fd, 'grossMargins'),
      operatingMargins: v(fd, 'operatingMargins'),
      profitMargins: v(fd, 'profitMargins'),
      returnOnAssets: v(fd, 'returnOnAssets'),
      returnOnEquity: v(fd, 'returnOnEquity'),
      revenuePerShare: v(fd, 'revenuePerShare'),
      totalRevenue: v(fd, 'totalRevenue'),
      revenueGrowth: v(fd, 'revenueGrowth'),
      grossProfits: v(fd, 'grossProfits'),
      ebitda: v(fd, 'ebitda'),
      ebitdaMargins: v(fd, 'ebitdaMargins'),
      earningsGrowth: v(fd, 'earningsGrowth'),
    };

    const health = {
      totalCash: v(fd, 'totalCash'),
      totalCashPerShare: v(fd, 'totalCashPerShare'),
      totalDebt: v(fd, 'totalDebt'),
      debtToEquity: v(fd, 'debtToEquity'),
      currentRatio: v(fd, 'currentRatio'),
      quickRatio: v(fd, 'quickRatio'),
      freeCashflow: v(fd, 'freeCashflow'),
      operatingCashflow: v(fd, 'operatingCashflow'),
    };

    const company = {
      sector: ap.sector || null,
      industry: ap.industry || null,
      employees: ap.fullTimeEmployees || null,
      website: ap.website || null,
      description: ap.longBusinessSummary || null,
    };

    const growth = growthAnalytics(
      annualRows.map(r => mapIncomeRow(r, 'annual'))
    );

    const quality = qualityAnalytics(
      profitability,
      health
    );

    const piotroski = calculatePiotroski(
      profitability,
      health
    );

    const altman = calculateAltman(
      mapBalanceRow(
        annualRows[annualRows.length - 1],
        'annual'
      ),
      mapIncomeRow(
        annualRows[annualRows.length - 1],
        'annual'
      )
    );

    const stockScore = overallScore(
      profitability,
      health,
      valuation,
      growth,
      quality,
      (r.earningsTrend?.trend || []).map((t: any) => ({
        period: t.period || '',
        epsMeanGrowth: safeFmt(t, 'earningsEstimate', 'growth'),
        revenueEstimateMean: safeFmt(t, 'revenueEstimate', 'avg')
      })),
      keyStats,
      piotroski,
      altman ?? 0
    );

    const response = {
      valuation,
      keyStats,
      dividends,
      profitability,
      health,
      company,

      growth,
      quality,
      piotroski,
      altman,
      stockScore,

      incomeAnnual: annualRows.map(row => mapIncomeRow(row, 'annual')),
      balanceAnnual: annualRows.map(row => mapBalanceRow(row, 'annual')),
      cashflowAnnual: annualRows.map(row => mapCashRow(row, 'annual')),

      incomeQuarterly: quarterlyRows.map(row => mapIncomeRow(row, 'quarterly')),
      balanceQuarterly: quarterlyRows.map(row => mapBalanceRow(row, 'quarterly')),
      cashflowQuarterly: quarterlyRows.map(row => mapCashRow(row, 'quarterly')),

      analystTrend: (r.earningsTrend?.trend || []).map((t: any) => ({
        period: t.period || '',
        endDate: t.endDate || '',
        epsEstimateLow: safeFmt(t, 'earningsEstimate', 'low'),
        epsEstimateHigh: safeFmt(t, 'earningsEstimate', 'high'),
        epsEstimateMean: safeFmt(t, 'earningsEstimate', 'avg'),
        epsMeanGrowth: safeFmt(t, 'earningsEstimate', 'growth'),
        revenueEstimateLow: safeFmt(t, 'revenueEstimate', 'low'),
        revenueEstimateMean: safeFmt(t, 'revenueEstimate', 'avg'),
        revenueEstimateHigh: safeFmt(t, 'revenueEstimate', 'high'),
      }))
    };

    setCachedFundamentals(
      ticker,
      response,
      1440
    );
    await saveFundamentals(
      ticker,
      response
    );

    console.log(
      'SAVED TO SUPABASE:',
      ticker
    );

    res.json(response);

  } catch (e: any) {
    console.error('FUNDAMENTALS ERROR', e?.message);
    console.error(e?.stack);
    res.status(500).json({ error: e?.message || 'Unknown error' });
  }
});

app.get('/api/news', async (req, res) => {
  const ticker = (req.query.ticker as string) || '';
  const query = ticker.replace('.NS', '').replace('.BO', '').replace('-USD', '');
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' stock')}&hl=en-IN&gl=IN&ceid=IN:en`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 8000 });
    const parsed = await xml2js.parseStringPromise(data, { explicitArray: false });
    const items = parsed?.rss?.channel?.item || [];
    const arr = Array.isArray(items) ? items : [items];
    res.json({ items: arr.slice(0, 8).map((item: any) => ({ title: item.title || '', link: item.link || '', published: item.pubDate || '' })) });
  } catch {
    res.json({ items: [] });
  }
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'QuadraAI Backend'
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

getYFCrumb().catch(e => console.warn('Crumb pre-warm failed:', e.message));