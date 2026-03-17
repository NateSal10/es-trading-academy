// conceptsData.js — metadata only, Pages imported dynamically in LearnPage
export const CONCEPT_CATEGORIES = [
  'Basics',
  'Market Structure',
  'SMC Core',
  'Entry Techniques',
  'Technical Analysis',
  'Sessions & Time',
  'Risk & Psychology',
];

export const CONCEPT_META = [
  { id: 'candles',          category: 'Basics',            difficulty: 'beginner',     icon: '🕯',  label: 'Candlestick Anatomy',           description: 'Learn to read the language of price — bodies, wicks, and what they mean.' },
  { id: 'structure',        category: 'Market Structure',  difficulty: 'beginner',     icon: '📊',  label: 'Market Structure',              description: 'HH/HL/LH/LL, Break of Structure (BOS), and Change of Character (CHoCH).' },
  { id: 'fvg',              category: 'SMC Core',          difficulty: 'intermediate', icon: '⚡',  label: 'Fair Value Gaps',               description: '3-candle imbalances that institutions must return to fill.' },
  { id: 'liq',              category: 'SMC Core',          difficulty: 'intermediate', icon: '🎯',  label: 'Liquidity Sweeps',              description: 'How smart money hunts stop clusters before reversing.' },
  { id: 'ob',               category: 'SMC Core',          difficulty: 'intermediate', icon: '📦',  label: 'Order Blocks',                  description: 'The last opposing candle before an impulse — where institutions loaded.' },
  { id: 'bnr',              category: 'Entry Techniques',  difficulty: 'intermediate', icon: '🔄',  label: 'Break & Retest',                description: 'Old resistance becomes support. Wait for the retest, not the break.' },
  { id: 'premium_discount', category: 'SMC Core',          difficulty: 'intermediate', icon: '📐',  label: 'Premium & Discount Zones',      description: 'Fibonacci-based framework: buy in discount, sell in premium.' },
  { id: 'sessions',         category: 'Sessions & Time',   difficulty: 'intermediate', icon: '🕐',  label: 'Trading Sessions & Kill Zones', description: 'London, NY, Asia sessions and the high-probability kill zone windows.' },
  { id: 'vwap',             category: 'Technical Analysis',difficulty: 'intermediate', icon: '📉',  label: 'VWAP & Moving Averages',        description: 'VWAP, EMA 9/21/50/200 — how institutions use them as dynamic S/R.' },
  { id: 'risk',             category: 'Risk & Psychology', difficulty: 'beginner',     icon: '🛡',  label: 'Risk Management',               description: 'R-multiples, position sizing, drawdown management, and the 1% rule.' },
  { id: 'power_of_3',       category: 'SMC Core',          difficulty: 'advanced',     icon: '⚡',  label: 'Power of 3 (AMD)',              description: 'Accumulation, Manipulation, Distribution — the daily price cycle.' },
  { id: 'confluence',       category: 'Entry Techniques',  difficulty: 'advanced',     icon: '🎯',  label: 'Multi-Confluence Entries',      description: 'The A+ setup: stacking OB + FVG + liquidity sweep + session timing.' },
];

export const CONCEPT_COUNT = CONCEPT_META.length;
