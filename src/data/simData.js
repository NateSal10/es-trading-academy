// Generates ~390 realistic 5-min ES futures candles across 5 trading days
// Timestamps are actual recent trading day dates so the chart shows dates correctly

function lastNTradingDays(n) {
  const days = [];
  const d = new Date();
  // Go back far enough to collect n trading days
  for (let i = 30; i >= 0 && days.length < n; i--) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    if (t.getDay() !== 0 && t.getDay() !== 6) days.push(new Date(t));
  }
  return days.slice(-n);
}

// Seeded pseudo-random for deterministic-looking (but fresh each load) price action
function mkRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Generate candles for a given interval (seconds).
// Covers enough history to be useful for replay regardless of timeframe.
export function buildSimCandles(intervalSecs = 300) {
  const rng = mkRng(Date.now() & 0xffff);

  // Full session: 4 AM ET → 8 PM ET = 16 hours (covers pre-market + RTH + after-hours)
  // 4 AM ET = 08:00 UTC (EDT, UTC-4)
  const barsPerDay = {
    60:    960,   // 1m  — 16h × 60
    300:   192,   // 5m  — 16h × 12
    900:    64,   // 15m — 16h × 4
    1800:   32,   // 30m — 16h × 2
    3600:   16,   // 1h  — 16 bars
    14400:   4,   // 4h  — 4 bars
    86400:   1,   // 1D
  }[intervalSecs] || 192;

  const isDaily = intervalSecs >= 86400;
  const days = isDaily ? lastNTradingDays(500) : lastNTradingDays(Math.ceil(300 / barsPerDay) + 2);

  const candles = [];
  let price = 5650;

  for (const day of days) {
    const base = new Date(day);

    if (isDaily) {
      // One candle per day, closing price
      const t = Math.floor(base.getTime() / 1000);
      const dayBias = (rng() - 0.45) * 15;
      const vol = 8 + rng() * 12;
      const open = price;
      const close = open + dayBias + (rng() - 0.5) * vol;
      const high = Math.max(open, close) + rng() * vol * 0.6;
      const low  = Math.min(open, close) - rng() * vol * 0.6;
      candles.push({
        time: t, open: +open.toFixed(2), high: +high.toFixed(2),
        low: +low.toFixed(2), close: +close.toFixed(2),
        volume: Math.floor(50000 + rng() * 100000),
      });
      price = close;
      const drift = price - 5285;
      if (Math.abs(drift) > 200) price -= drift * 0.1;
      continue;
    }

    // Intraday: start at 4:00 AM ET (08:00 UTC, EDT = UTC-4)
    // Covers: pre-market (4–9:30 AM), RTH (9:30 AM–4:15 PM), after-hours (4:15–8 PM)
    base.setUTCHours(8, 0, 0, 0);
    let t = Math.floor(base.getTime() / 1000);

    const dayBias  = (rng() - 0.5) * 8;
    const rthBias  = dayBias;
    const pmBias   = -dayBias * 0.6;

    // Fractional breakpoints relative to 16-hour session:
    //   pre-market:  0.00 – 0.34  (4 AM  – 9:30 AM,  5.5h)
    //   RTH open:    0.34 – 0.37  (9:30  – 10:00 AM, burst)
    //   RTH AM:      0.37 – 0.60  (10 AM – 12 PM)
    //   Midday chop: 0.60 – 0.72  (12 PM – 1:55 PM)
    //   RTH PM:      0.72 – 0.88  (1:55  – 4:15 PM)
    //   After-hours: 0.88 – 1.00  (4:15  – 8 PM, thin & slow)

    for (let bar = 0; bar < barsPerDay; bar++) {
      const frac = bar / barsPerDay;
      let bias = 0;
      if      (frac <  0.34) bias = (rng() - 0.5) * 1.2;            // pre-market: quiet drift
      else if (frac <  0.37) bias = (rng() - 0.5) * 14;             // RTH open burst
      else if (frac <  0.60) bias = rthBias + (rng() - 0.5) * 2;    // RTH AM trend
      else if (frac <  0.72) bias = (rng() - 0.5) * 1.2;            // midday chop
      else if (frac <  0.88) bias = pmBias  + (rng() - 0.5) * 2;    // RTH PM
      else                   bias = (rng() - 0.5) * 0.8;             // after-hours: very quiet

      // Volume profile: heaviest at RTH open, low pre/post market
      const isPreMkt  = frac < 0.34;
      const isRTHOpen = frac >= 0.34 && frac < 0.40;
      const isAfter   = frac >= 0.88;
      const vol = isRTHOpen ? 5 + rng() * 7
                : isPreMkt || isAfter ? 0.4 + rng() * 0.8
                : 1.5 + rng() * 3.5;

      const open  = price;
      const move  = bias + (rng() - 0.5) * vol;
      const close = open + move;
      const wick  = rng() * vol * 0.9;
      candles.push({
        time: t,
        open:  +open.toFixed(2),
        high:  +(Math.max(open, close) + wick).toFixed(2),
        low:   +(Math.min(open, close) - wick).toFixed(2),
        close: +close.toFixed(2),
        volume: Math.floor((isRTHOpen ? 2000 : isPreMkt || isAfter ? 50 : 300) + rng() * (isRTHOpen ? 3000 : 500)),
      });
      price = close;
      t += intervalSecs;
    }

    const drift = price - 5285;
    if (Math.abs(drift) > 80) price -= drift * 0.3;
  }

  return candles;
}

// Static export for components that need a quick array (e.g. old canvas sim)
export const CANDLES = [
  { o: 5218, h: 5226, l: 5212, c: 5222 },
  { o: 5222, h: 5230, l: 5218, c: 5228 },
  { o: 5228, h: 5234, l: 5224, c: 5226 },
  { o: 5226, h: 5232, l: 5216, c: 5220 },
  { o: 5220, h: 5224, l: 5208, c: 5212 },
  { o: 5212, h: 5218, l: 5205, c: 5210 },
  { o: 5210, h: 5212, l: 5197, c: 5200 },
  { o: 5200, h: 5203, l: 5194, c: 5197 },
  { o: 5197, h: 5200, l: 5193, c: 5196 },
  { o: 5196, h: 5222, l: 5194, c: 5220 },
  { o: 5220, h: 5240, l: 5218, c: 5238 },
  { o: 5238, h: 5245, l: 5234, c: 5242 },
  { o: 5242, h: 5248, l: 5238, c: 5245 },
  { o: 5245, h: 5250, l: 5241, c: 5248 },
  { o: 5248, h: 5254, l: 5244, c: 5252 },
  { o: 5252, h: 5255, l: 5244, c: 5246 },
  { o: 5246, h: 5248, l: 5236, c: 5240 },
  { o: 5240, h: 5242, l: 5220, c: 5224 },
  { o: 5224, h: 5235, l: 5218, c: 5232 },
  { o: 5232, h: 5244, l: 5230, c: 5242 },
  { o: 5242, h: 5256, l: 5240, c: 5254 },
  { o: 5254, h: 5264, l: 5252, c: 5262 },
  { o: 5262, h: 5272, l: 5258, c: 5268 },
];
