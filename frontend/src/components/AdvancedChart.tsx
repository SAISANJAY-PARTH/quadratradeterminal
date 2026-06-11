import React, { useEffect, useRef, useMemo } from 'react';
import { IndicatorRow, ChartType, IndicatorOption } from '../types';

declare const Plotly: any;

const ALL_INDICATORS: IndicatorOption[] = [
  'EMA', 'SMA', 'VWAP', 'Bollinger Bands', 'Keltner Channel',
  'Support/Resistance', 'Pivot Points', 'Supertrend', 'PSAR',
  'RSI', 'Stoch RSI', 'MACD', 'Williams %R', 'CCI', 'MFI',
  'Volume', 'OBV', 'CMF', 'ATR', 'ADX', 'ROC',
];

interface Props {
  df: IndicatorRow[];
  chartType: ChartType;
  selected: IndicatorOption[];
  setSelected: (s: IndicatorOption[]) => void;
}

export default function AdvancedChart({ df, chartType, selected, setSelected }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const toggleIndicator = (ind: IndicatorOption) => {
    setSelected(selected.includes(ind) ? selected.filter(s => s !== ind) : [...selected, ind]);
  };

  const plotData = useMemo(() => {
    if (!df || df.length === 0) return null;
    const dates = df.map(d => d.date);
    const lowerPanels: string[] = [];
    if (['RSI', 'Stoch RSI', 'Williams %R', 'MFI'].some(x => selected.includes(x as IndicatorOption))) lowerPanels.push('momentum');
    if (selected.includes('MACD')) lowerPanels.push('macd');
    if (['Volume', 'OBV', 'CMF'].some(x => selected.includes(x as IndicatorOption))) lowerPanels.push('volume');
    if (['ATR', 'ADX', 'ROC', 'CCI'].some(x => selected.includes(x as IndicatorOption))) lowerPanels.push('misc');

    const nRows = 1 + lowerPanels.length;
    const rowHeights = [0.55, ...Array(lowerPanels.length).fill(+(0.45 / Math.max(lowerPanels.length, 1)).toFixed(2))];
    const panel: Record<string, number> = {};
    lowerPanels.forEach((name, i) => { panel[name] = i + 2; });

    const traces: any[] = [];

    if (chartType === 'Heikin Ashi') {
      traces.push({ type: 'candlestick', x: dates, open: df.map(d => d.HA_Open), high: df.map(d => d.HA_High), low: df.map(d => d.HA_Low), close: df.map(d => d.HA_Close), name: 'Heikin Ashi', xaxis: 'x', yaxis: 'y', increasing: { line: { color: '#00d46a' }, fillcolor: 'rgba(0,212,106,0.7)' }, decreasing: { line: { color: '#ff3b3b' }, fillcolor: 'rgba(255,59,59,0.7)' } });
    } else if (chartType === 'Line') {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.close), name: 'Close', line: { color: '#f5a623', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(245,166,35,0.04)', xaxis: 'x', yaxis: 'y' });
    } else {
      traces.push({ type: 'candlestick', x: dates, open: df.map(d => d.open), high: df.map(d => d.high), low: df.map(d => d.low), close: df.map(d => d.close), name: 'Price', xaxis: 'x', yaxis: 'y', increasing: { line: { color: '#00d46a' }, fillcolor: 'rgba(0,212,106,0.7)' }, decreasing: { line: { color: '#ff3b3b' }, fillcolor: 'rgba(255,59,59,0.7)' } });
    }

    const emaColors: Record<string, string> = { EMA9: '#ff3b3b', EMA20: '#f5a623', EMA50: '#00d46a', EMA200: '#00d4ff' };
    if (selected.includes('EMA')) {
      for (const [col, color] of Object.entries(emaColors)) {
        traces.push({ type: 'scatter', x: dates, y: df.map(d => (d as any)[col]), name: col, line: { color, width: 1.2 }, xaxis: 'x', yaxis: 'y' });
      }
    }
    if (selected.includes('SMA')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.SMA50), name: 'SMA50', line: { color: '#f5c842', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.SMA200), name: 'SMA200', line: { color: '#00b4d8', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('VWAP')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.VWAP), name: 'VWAP', line: { color: '#a78bfa', dash: 'dash', width: 1.5 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('Bollinger Bands')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.BB_Upper), name: 'BB Upper', line: { color: 'rgba(245,166,35,0.4)', dash: 'dash', width: 1 }, xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.BB_Lower), name: 'BB Lower', line: { color: 'rgba(245,166,35,0.4)', dash: 'dash', width: 1 }, fill: 'tonexty', fillcolor: 'rgba(245,166,35,0.03)', xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.BB_Mid), name: 'BB Mid', line: { color: 'rgba(245,166,35,0.25)', width: 1 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('Keltner Channel')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.KC_Upper), name: 'KC Upper', line: { color: 'rgba(0,212,106,0.4)', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.KC_Lower), name: 'KC Lower', line: { color: 'rgba(0,212,106,0.4)', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('Support/Resistance')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.Support), name: 'Support', line: { color: 'rgba(0,212,106,0.6)', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.Resistance), name: 'Resistance', line: { color: 'rgba(255,59,59,0.6)', dash: 'dot', width: 1 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('Pivot Points')) {
      [['Pivot', '#f5c842'], ['R1', '#ff6b6b'], ['S1', '#69ff8f'], ['R2', '#ff3b3b'], ['S2', '#00ff87']].forEach(([col, color]) => {
        traces.push({ type: 'scatter', x: dates, y: df.map(d => (d as any)[col]), name: col, line: { color, width: 1, dash: 'dot' }, xaxis: 'x', yaxis: 'y' });
      });
    }
    if (selected.includes('Supertrend')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.ST_Dir === 1 ? d.Supertrend : NaN), name: 'ST Bull', line: { color: '#00d46a', width: 2 }, xaxis: 'x', yaxis: 'y' });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.ST_Dir === -1 ? d.Supertrend : NaN), name: 'ST Bear', line: { color: '#ff3b3b', width: 2 }, xaxis: 'x', yaxis: 'y' });
    }
    if (selected.includes('PSAR')) {
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.PSAR), name: 'PSAR', mode: 'markers', marker: { size: 3, color: '#f5a623' }, xaxis: 'x', yaxis: 'y' });
    }

    const yaxisMap: Record<number, string> = { 1: 'y', 2: 'y2', 3: 'y3', 4: 'y4', 5: 'y5' };

    if (panel['momentum']) {
      const r = panel['momentum']; const ya = yaxisMap[r]; const xa = `x${r > 1 ? r : ''}`;
      if (selected.includes('RSI')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.RSI), name: 'RSI', line: { color: '#f5a623', width: 1.5 }, xaxis: xa, yaxis: ya });
      if (selected.includes('Stoch RSI')) {
        traces.push({ type: 'scatter', x: dates, y: df.map(d => d.StochK), name: 'StochK', line: { color: '#00d4ff', width: 1.5 }, xaxis: xa, yaxis: ya });
        traces.push({ type: 'scatter', x: dates, y: df.map(d => d.StochD), name: 'StochD', line: { color: '#ff6b6b', width: 1.5 }, xaxis: xa, yaxis: ya });
      }
      if (selected.includes('Williams %R')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.WilliamsR), name: '%R', line: { color: '#a78bfa', width: 1.5 }, xaxis: xa, yaxis: ya });
      if (selected.includes('MFI')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.MFI), name: 'MFI', line: { color: '#f5c842', width: 1.5 }, xaxis: xa, yaxis: ya });
    }
    if (panel['macd']) {
      const r = panel['macd']; const ya = yaxisMap[r]; const xa = `x${r > 1 ? r : ''}`;
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.MACD), name: 'MACD', line: { color: '#00d4ff', width: 1.5 }, xaxis: xa, yaxis: ya });
      traces.push({ type: 'scatter', x: dates, y: df.map(d => d.MACD_Signal), name: 'Signal', line: { color: '#ff6b6b', width: 1.5 }, xaxis: xa, yaxis: ya });
      traces.push({ type: 'bar', x: dates, y: df.map(d => d.MACD_Hist), name: 'Hist', marker: { color: df.map(d => (d.MACD_Hist || 0) >= 0 ? 'rgba(0,212,106,0.6)' : 'rgba(255,59,59,0.6)') }, xaxis: xa, yaxis: ya });
    }
    if (panel['volume']) {
      const r = panel['volume']; const ya = yaxisMap[r]; const xa = `x${r > 1 ? r : ''}`;
      if (selected.includes('Volume')) traces.push({ type: 'bar', x: dates, y: df.map(d => d.volume), name: 'Volume', marker: { color: df.map(d => d.close >= d.open ? 'rgba(0,212,106,0.5)' : 'rgba(255,59,59,0.5)') }, xaxis: xa, yaxis: ya });
      if (selected.includes('OBV')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.OBV), name: 'OBV', line: { color: '#f5a623', width: 1.5 }, xaxis: xa, yaxis: ya });
      if (selected.includes('CMF')) traces.push({ type: 'bar', x: dates, y: df.map(d => d.CMF), name: 'CMF', marker: { color: df.map(d => (d.CMF || 0) >= 0 ? 'rgba(0,212,106,0.5)' : 'rgba(255,59,59,0.5)') }, xaxis: xa, yaxis: ya });
    }
    if (panel['misc']) {
      const r = panel['misc']; const ya = yaxisMap[r]; const xa = `x${r > 1 ? r : ''}`;
      if (selected.includes('ATR')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.True_ATR), name: 'ATR', line: { color: '#f5a623', width: 1.5 }, xaxis: xa, yaxis: ya });
      if (selected.includes('ADX')) {
        traces.push({ type: 'scatter', x: dates, y: df.map(d => d.ADX), name: 'ADX', line: { color: '#00d4ff', width: 1.5 }, xaxis: xa, yaxis: ya });
        traces.push({ type: 'scatter', x: dates, y: df.map(d => d.Plus_DI), name: '+DI', line: { color: '#00d46a', dash: 'dot', width: 1 }, xaxis: xa, yaxis: ya });
        traces.push({ type: 'scatter', x: dates, y: df.map(d => d.Minus_DI), name: '-DI', line: { color: '#ff3b3b', dash: 'dot', width: 1 }, xaxis: xa, yaxis: ya });
      }
      if (selected.includes('ROC')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.ROC), name: 'ROC', line: { color: '#a78bfa', width: 1.5 }, xaxis: xa, yaxis: ya });
      if (selected.includes('CCI')) traces.push({ type: 'scatter', x: dates, y: df.map(d => d.CCI), name: 'CCI', line: { color: '#f5c842', width: 1.5 }, xaxis: xa, yaxis: ya });
    }

    return { traces, nRows, rowHeights, lowerPanels };
  }, [df, chartType, selected]);

  useEffect(() => {
    if (!chartRef.current || !plotData || !df.length) return;
    const { traces, nRows, rowHeights, lowerPanels } = plotData;

    const yAxisDomain = (row: number, total: number, heights: number[]) => {
      let cumH = 0;
      const gaps = 0.03 * (total - 1);
      const totalH = heights.reduce((a, b) => a + b, 0);
      const scale = (1 - gaps) / totalH;
      for (let i = total - 1; i > row - 1; i--) { cumH += heights[i] * scale + (i < total - 1 ? 0.03 : 0); }
      const end = 1 - cumH;
      const start = end - heights[row - 1] * scale;
      return [Math.max(0, start), Math.min(1, end)];
    };

    const gridColor = 'rgba(245,166,35,0.06)';
    const bgColor = '#080808';
    const plotBg = '#0a0a0a';

    const layout: any = {
      template: 'plotly_dark',
      paper_bgcolor: bgColor,
      plot_bgcolor: plotBg,
      height: Math.max(700, 420 + lowerPanels.length * 170),
      showlegend: true,
      xaxis_rangeslider_visible: false,
      legend: {
        orientation: 'h', yanchor: 'bottom', y: 1.01, xanchor: 'right', x: 1,
        font: { size: 9, color: '#b8a88a', family: 'JetBrains Mono' },
        bgcolor: 'rgba(14,14,14,0.8)', bordercolor: 'rgba(245,166,35,0.2)', borderwidth: 1,
      },
      margin: { l: 10, r: 80, t: 60, b: 20 },
      font: { family: 'JetBrains Mono', color: '#b8a88a', size: 10 },
      xaxis: {
        showgrid: true, gridcolor: gridColor, gridwidth: 1,
        linecolor: 'rgba(245,166,35,0.15)', zerolinecolor: 'rgba(245,166,35,0.1)',
        domain: [0, 1], tickfont: { size: 9, color: '#6b5c40' },
      },
      yaxis: {
        side: 'right', showgrid: true, gridcolor: gridColor, gridwidth: 1,
        linecolor: 'rgba(245,166,35,0.15)', zerolinecolor: 'rgba(245,166,35,0.1)',
        domain: yAxisDomain(1, nRows, rowHeights),
        tickfont: { size: 9, color: '#6b5c40' },
      },
    };

    lowerPanels.forEach((_, i) => {
      const row = i + 2;
      layout[`yaxis${row}`] = { side: 'right', showgrid: true, gridcolor: gridColor, domain: yAxisDomain(row, nRows, rowHeights), anchor: `x${row}`, tickfont: { size: 9, color: '#6b5c40' } };
      layout[`xaxis${row}`] = { showgrid: true, gridcolor: gridColor, matches: 'x', domain: [0, 1], anchor: `y${row}`, tickfont: { size: 9, color: '#6b5c40' } };
    });

    if (typeof Plotly !== 'undefined') {
      Plotly.react(chartRef.current, traces, layout, {
        responsive: true, displayModeBar: true,
        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
        modeBarStyle: { background: 'transparent' },
      });
    }
  }, [plotData, df]);

  return (
    <>
      {/* Indicator chip selector */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(245,166,35,0.08)', background: '#080808' }}>
        <div className="bb-chip-grid">
          {ALL_INDICATORS.map(ind => (
            <span key={ind} className={`bb-chip ${selected.includes(ind) ? 'active' : ''}`} onClick={() => toggleIndicator(ind)}>
              {ind}
            </span>
          ))}
        </div>
      </div>

      <div className="bb-chart-outer">
        <div ref={chartRef} style={{ width: '100%' }} />
      </div>
    </>
  );
}
