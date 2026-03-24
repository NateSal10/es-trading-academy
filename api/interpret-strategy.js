/**
 * Vercel serverless function: interpret a natural language strategy description
 * into a structured config object for the Custom Strategy Builder.
 *
 * Requires ANTHROPIC_API_KEY env var set in Vercel project settings.
 */

const ALLOWED_ORIGIN = 'https://es-trading-academy.vercel.app'

const SYSTEM_PROMPT = `You are a trading strategy interpreter for a futures trading backtesting app (ES/NQ/MES/MNQ).

Convert the user's natural language strategy description into a JSON config object.

Available condition types (use exact "type" strings):
- "price_above_vwap" — price is above VWAP
- "price_below_vwap" — price is below VWAP
- "price_crosses_above_vwap" — price crosses above VWAP (previous bar below, current above)
- "price_crosses_below_vwap" — price crosses below VWAP
- "price_above_ema" — price above EMA (requires emaPeriod: number)
- "price_below_ema" — price below EMA (requires emaPeriod: number)
- "bullish_fvg" — bullish Fair Value Gap formed (3-bar bullish gap)
- "bearish_fvg" — bearish Fair Value Gap formed (3-bar bearish gap)
- "bullish_ob" — bullish Order Block formed (bearish candle followed by strong bullish impulse)
- "bearish_ob" — bearish Order Block formed (bullish candle followed by strong bearish impulse)
- "bullish_bos" — bullish Break of Structure (close above recent swing high)
- "bearish_bos" — bearish Break of Structure (close below recent swing low)
- "time_between" — time filter (requires startHour, startMin, endHour, endMin in 24h ET)
- "bullish_candle" — current bar closes bullish (close > open)
- "bearish_candle" — current bar closes bearish (close < open)

SL methods: "fixed_points" | "below_signal_candle" | "swing_point"
TP methods: "rr_multiple" | "fixed_points"

Output ONLY valid JSON in this exact shape (no markdown, no explanation):
{
  "conditions": [
    { "type": "condition_type_id", ...optional params }
  ],
  "direction": "LONG" | "SHORT" | "AUTO",
  "slMethod": "fixed_points" | "below_signal_candle" | "swing_point",
  "slValue": number,
  "tpMethod": "rr_multiple" | "fixed_points",
  "tpValue": number,
  "maxTradesPerDay": number,
  "summary": "1-2 sentence plain English summary of what was interpreted"
}

Rules:
- Always include a "time_between" condition if the user specifies time windows
- For EMA conditions include emaPeriod (e.g. 9, 21, 50, 200)
- If direction is ambiguous, use "AUTO"
- slValue in points (ES futures: typical stop 5-20 pts)
- tpValue in R:R ratio (1.5 - 4) or points
- maxTradesPerDay default 2
- Extract as many conditions as possible from the description
- If a concept maps to multiple conditions, include all of them`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' })
    return
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  const text = (body?.text ?? '').trim()
  if (!text || text.length < 10) {
    res.status(400).json({ error: 'Strategy description too short' })
    return
  }
  if (text.length > 2000) {
    res.status(400).json({ error: 'Strategy description too long (max 2000 chars)' })
    return
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      res.status(502).json({ error: data?.error?.message ?? 'Claude API error' })
      return
    }

    const raw = data?.content?.[0]?.text ?? ''

    // Extract JSON from response (strip any accidental markdown fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(502).json({ error: 'Could not parse strategy from response' })
      return
    }

    const config = JSON.parse(jsonMatch[0])
    res.status(200).json(config)
  } catch (err) {
    res.status(500).json({ error: 'Strategy interpretation failed: ' + err.message })
  }
}
