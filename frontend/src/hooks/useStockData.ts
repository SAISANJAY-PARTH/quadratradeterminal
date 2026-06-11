import { useState, useCallback } from 'react';
import { OHLCV, QuoteInfo, SearchResult, NewsItem, Period } from '../types';
import { computeIndicators } from '../lib/indicators';
import { IndicatorRow } from '../types';

const BASE = 'https://quadratradeterminal-1.onrender.com/api';

export function useStockData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [df, setDf] = useState<IndicatorRow[]>([]);
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [fundamentals, setFundamentals] = useState<any | null>(null);
  const [fundLoading, setFundLoading] = useState(false);

  const fetchData = useCallback(async (ticker: string, period: Period) => {
    setLoading(true);
    setError(null);
    setFundamentals(null);
    try {
      const [histRes, quoteRes, newsRes] = await Promise.all([
        fetch(`${BASE}/history?ticker=${encodeURIComponent(ticker)}&period=${period}`),
        fetch(`${BASE}/quote?ticker=${encodeURIComponent(ticker)}`),
        fetch(`${BASE}/news?ticker=${encodeURIComponent(ticker)}`),
      ]);

      if (!histRes.ok) throw new Error(`No data for ${ticker}`);
      const histJson = await histRes.json();
      if (!histJson.data || histJson.data.length === 0) throw new Error(`No price data for ${ticker}`);

      const ohlcv: OHLCV[] = histJson.data;
      setDf(computeIndicators(ohlcv));

      if (quoteRes.ok) setQuote(await quoteRes.json());
      if (newsRes.ok) { const nj = await newsRes.json(); setNews(nj.items || []); }

      // Fetch fundamentals in background (non-blocking)
      setFundLoading(true);
      fetch(`${BASE}/fundamentals?ticker=${encodeURIComponent(ticker)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && !data.error) setFundamentals(data); })
        .catch(() => {})
        .finally(() => setFundLoading(false));

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setDf([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTickers = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];
    try {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.results || [];
    } catch {
      return [];
    }
  }, []);

  return { loading, error, df, quote, news, fundamentals, fundLoading, fetchData, searchTickers };
}
