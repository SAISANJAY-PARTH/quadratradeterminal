import { useState, useCallback } from 'react';
import { OHLCV, QuoteInfo, SearchResult, NewsItem, Period } from '../types';
import { computeIndicators } from '../lib/indicators';
import { IndicatorRow } from '../types';

const BASE = 'https://quadratradeterminal.onrender.com';

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
        fetch(`${BASE}/api/history?ticker=${encodeURIComponent(ticker)}&period=${period}`),
        fetch(`${BASE}/api/quote?ticker=${encodeURIComponent(ticker)}`),
        fetch(`${BASE}/api/news?ticker=${encodeURIComponent(ticker)}`),
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
      fetch(`${BASE}/api/fundamentals?ticker=${encodeURIComponent(ticker)}`)
        .then(async r => {
          if (!r.ok) {
            const txt = await r.text();
            console.error("Fundamentals API Error:", r.status, txt);
            return null;
          }
          return r.json();
        })
        .then(data => {
          if (data && !data.error) {
            setFundamentals(data);
          }
        })
        .catch(err => {
          console.error("Fundamentals Fetch Failed:", err);
        })
        .finally(() => {
          setFundLoading(false);
        });

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
      const res = await fetch(
        `${BASE}/api/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.results || [];
    } catch {
      return [];
    }
  }, []);

  return { loading, error, df, quote, news, fundamentals, fundLoading, fetchData, searchTickers };
}
