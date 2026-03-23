/**
 * Convert backtest trades to CSV string.
 */
export function tradesToCsv(trades) {
  if (!trades || trades.length === 0) return '';

  const headers = ['#', 'Entry Time', 'Side', 'Entry', 'Exit', 'SL', 'TP', 'P&L', 'R:R', 'Bars', 'Exit Reason', 'Reason'];
  const rows = trades.map((t, i) => {
    const risk = Math.abs(t.entry - t.sl);
    const rr = risk === 0 ? 0 : (Math.abs(t.exitPrice - t.entry) / risk).toFixed(2);
    const bars = (t.exitBar ?? 0) - (t.entryBar ?? 0);
    const time = t.entryTime
      ? new Date(t.entryTime * 1000).toLocaleString('en-US', { timeZone: 'America/New_York' })
      : '';

    return [
      i + 1,
      time,
      t.side,
      t.entry?.toFixed(2) ?? '',
      t.exitPrice?.toFixed(2) ?? '',
      t.sl?.toFixed(2) ?? '',
      t.tp?.toFixed(2) ?? '',
      t.pnl?.toFixed(2) ?? '',
      rr,
      bars,
      t.exitReason?.toUpperCase() ?? '',
      `"${(t.reason ?? '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
