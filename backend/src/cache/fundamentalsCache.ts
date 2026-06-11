const cache = new Map<string, any>();

export function getCachedFundamentals(ticker: string) {
  const item = cache.get(ticker);

  if (!item) return null;

  if (Date.now() > item.expiry) {
    cache.delete(ticker);
    return null;
  }

  return item.data;
}

export function setCachedFundamentals(
  ticker: string,
  data: any,
  ttlMinutes = 1440
) {
  cache.set(ticker, {
    data,
    expiry: Date.now() + ttlMinutes * 60 * 1000
  });
}