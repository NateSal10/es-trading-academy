export const CHECKLIST_SECTIONS = [
  { id: 'pre_market', label: '🌅 Pre-Market (8:00–9:30 AM ET)' },
  { id: 'opening',    label: '⚡ Opening Range (9:30–10:00 AM ET)' },
  { id: 'entry',      label: '✅ Entry Checklist (All Required)' },
  { id: 'trade_mgmt', label: '📏 Trade Management' },
  { id: 'post_trade', label: '📝 Post-Trade Review' },
];

export const CHECKLIST_ITEMS = [
  // pre_market (8 items)
  { id: 'mark_pdh_pdl',    section: 'pre_market', label: 'Mark PDH and PDL on chart' },
  { id: 'mark_weekly',     section: 'pre_market', label: 'Mark weekly and monthly open' },
  { id: 'mark_overnight',  section: 'pre_market', label: 'Mark overnight high and low' },
  { id: 'round_numbers',   section: 'pre_market', label: 'Mark round numbers (every 25 pts)' },
  { id: 'htf_bias',        section: 'pre_market', label: 'Determine HTF bias (1H/15m structure)' },
  { id: 'econ_calendar',   section: 'pre_market', label: 'Check economic calendar — no red news?' },
  { id: 'identify_zones',  section: 'pre_market', label: 'Mark 2-3 high-quality FVG/OB zones' },
  { id: 'daily_target',    section: 'pre_market', label: 'Set daily profit target and loss limit' },

  // opening (4 items)
  { id: 'watch_open',      section: 'opening', label: 'Watch 9:30 open — no trades yet' },
  { id: 'note_sweep',      section: 'opening', label: 'Note opening sweep direction' },
  { id: 'mark_orh_orl',    section: 'opening', label: 'Mark opening range H/L by 10:00 AM' },
  { id: 'confirm_bias',    section: 'opening', label: 'Confirm session bias after open' },

  // entry (5 items)
  { id: 'htf_aligned',     section: 'entry', label: '1. Trade aligns with 15m/1H structure' },
  { id: 'confluence',      section: 'entry', label: '2. At least 2 confluences (OB+FVG, sweep+OB, etc.)' },
  { id: 'liq_swept',       section: 'entry', label: '3. Liquidity swept before entry' },
  { id: 'rejection',       section: 'entry', label: '4. Rejection candle confirms entry' },
  { id: 'rr_valid',        section: 'entry', label: '5. R:R is at least 1:2' },

  // trade_mgmt (4 items)
  { id: 'stop_structural', section: 'trade_mgmt', label: 'Stop is structural (not fixed points)' },
  { id: 'partial_1to1',    section: 'trade_mgmt', label: 'Scale out 50% at 1:1, move stop to entry' },
  { id: 'runner_target',   section: 'trade_mgmt', label: 'Runner targeting next liquidity pool' },
  { id: 'no_new_330',      section: 'trade_mgmt', label: 'No new entries after 3:30 PM ET' },

  // post_trade (5 items)
  { id: 'log_trade',       section: 'post_trade', label: 'Log trade in journal with entry/exit/notes' },
  { id: 'screenshot',      section: 'post_trade', label: 'Screenshot the setup for review' },
  { id: 'review_plan',     section: 'post_trade', label: 'Did I follow the plan? Was this an A+ setup?' },
  { id: 'emotion_check',   section: 'post_trade', label: 'Check emotional state — any revenge trades?' },
  { id: 'update_stats',    section: 'post_trade', label: 'Update prop tracker P&L for the day' },
];
