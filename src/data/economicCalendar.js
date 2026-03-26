/**
 * Static US economic calendar events for 2025-2026.
 * Time is Eastern Time (ET). Impact: 'high' = major market mover.
 */
export const ECONOMIC_EVENTS = [
  // ── 2025 ──────────────────────────────────────────────────────────────────

  // NFP (first Friday of each month)
  { date: '2025-01-10', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Dec 2024)' },
  { date: '2025-02-07', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Jan 2025)' },
  { date: '2025-03-07', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Feb 2025)' },
  { date: '2025-04-04', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Mar 2025)' },
  { date: '2025-05-02', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Apr 2025)' },
  { date: '2025-06-06', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (May 2025)' },
  { date: '2025-07-03', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Jun 2025)' },
  { date: '2025-08-01', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Jul 2025)' },
  { date: '2025-09-05', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Aug 2025)' },
  { date: '2025-10-03', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Sep 2025)' },
  { date: '2025-11-07', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Oct 2025)' },
  { date: '2025-12-05', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Nov 2025)' },

  // CPI
  { date: '2025-01-15', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Dec 2024)' },
  { date: '2025-02-12', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Jan 2025)' },
  { date: '2025-03-12', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Feb 2025)' },
  { date: '2025-04-10', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Mar 2025)' },
  { date: '2025-05-13', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Apr 2025)' },
  { date: '2025-06-11', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (May 2025)' },
  { date: '2025-07-11', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Jun 2025)' },
  { date: '2025-08-12', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Jul 2025)' },
  { date: '2025-09-10', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Aug 2025)' },
  { date: '2025-10-14', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Sep 2025)' },
  { date: '2025-11-13', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Oct 2025)' },
  { date: '2025-12-10', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Nov 2025)' },

  // FOMC (8 per year in 2025)
  { date: '2025-01-29', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2025-03-19', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },
  { date: '2025-05-07', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2025-06-18', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },
  { date: '2025-07-30', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2025-09-17', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },
  { date: '2025-10-29', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2025-12-10', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },

  // PPI
  { date: '2025-01-14', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (Dec 2024)' },
  { date: '2025-02-13', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (Jan 2025)' },
  { date: '2025-03-13', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (Feb 2025)' },
  { date: '2025-04-11', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (Mar 2025)' },
  { date: '2025-05-15', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (Apr 2025)' },
  { date: '2025-06-12', time: '8:30 AM ET', label: 'PPI', desc: 'Producer Price Index (May 2025)' },

  // GDP (quarterly advance estimates)
  { date: '2025-01-30', time: '8:30 AM ET', label: 'GDP', desc: 'Advance Q4 2024 GDP' },
  { date: '2025-04-30', time: '8:30 AM ET', label: 'GDP', desc: 'Advance Q1 2025 GDP' },
  { date: '2025-07-30', time: '8:30 AM ET', label: 'GDP', desc: 'Advance Q2 2025 GDP' },
  { date: '2025-10-29', time: '8:30 AM ET', label: 'GDP', desc: 'Advance Q3 2025 GDP' },

  // ── 2026 ──────────────────────────────────────────────────────────────────

  // NFP 2026
  { date: '2026-01-09', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Dec 2025)' },
  { date: '2026-02-06', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Jan 2026)' },
  { date: '2026-03-06', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Feb 2026)' },
  { date: '2026-04-03', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Mar 2026)' },
  { date: '2026-05-08', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (Apr 2026)' },
  { date: '2026-06-05', time: '8:30 AM ET', label: 'NFP', desc: 'Non-Farm Payrolls (May 2026)' },

  // CPI 2026
  { date: '2026-01-14', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Dec 2025)' },
  { date: '2026-02-11', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Jan 2026)' },
  { date: '2026-03-11', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Feb 2026)' },
  { date: '2026-04-09', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Mar 2026)' },
  { date: '2026-05-13', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (Apr 2026)' },
  { date: '2026-06-10', time: '8:30 AM ET', label: 'CPI', desc: 'Consumer Price Index (May 2026)' },

  // FOMC 2026
  { date: '2026-01-28', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2026-03-18', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },
  { date: '2026-05-06', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Statement' },
  { date: '2026-06-17', time: '2:00 PM ET', label: 'FOMC', desc: 'Fed Rate Decision + Projections' },
]

// Build a lookup map: date string → array of events
export const EVENTS_BY_DATE = ECONOMIC_EVENTS.reduce((map, ev) => {
  if (!map[ev.date]) map[ev.date] = []
  map[ev.date].push(ev)
  return map
}, {})

// Colors per event type
export const EVENT_COLORS = {
  NFP:  '#22c55e',
  CPI:  '#f59e0b',
  FOMC: '#4f8ef7',
  PPI:  '#a78bfa',
  GDP:  '#fb923c',
}
