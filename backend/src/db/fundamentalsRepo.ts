import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function getFundamentals(ticker: string) {
  const { data, error } = await supabase
    .from('fundamentals')
    .select('*')
    .eq('ticker', ticker)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function saveFundamentals(
  ticker: string,
  fundamentals: any
) {
  const { error } = await supabase
    .from('fundamentals')
    .upsert({
      ticker,
      data: fundamentals,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);
  }
}