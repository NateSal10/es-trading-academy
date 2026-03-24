/**
 * Vercel serverless function: translate a Pine Script strategy into
 * a structured config object for the Custom Strategy Builder.
 *
 * Requires ANTHROPIC_API_KEY env var set in Vercel project settings.
 */

const ALLOWED_ORIGIN = 'https://es-trading-academy.vercel.app'

const SYSTEM_PROMPT = `You are a Pine Script strategy translator for a futures trading backtesting app (ES/NQ/MES/MNQ).

Read the Pine Script code and extract the trading strategy logic into a JSON config object.

Available condition types (use exact "type" strings):
- "price_above_vwap" — price is above VWAP
- "price_below_vwap" — price is below VWAP
- "price_crosses_above_vwap" — price crosses above VWAP
- "price_crosses_below_vwap" — price crosses below VWAP
- "price_above_ema" — price above EMA (requires emaPeriod: number)
- "price_below_ema" — price below EMA (requires emaPeriod: number)
- "bullish_fvg" — bullish Fair Value Gap formed
- "bearish_fvg" — bearish Fair Value Gap formed
- "bullish_ob" — bullish Order Block formed
- "bearish_ob" — bearish Order Block formed
- "bullish_bos" — bullish Break of Structure
- "bearish_bos" — bearish Break of Structure
- "time_between" — time filter (requires startHour, startMin, endHour, endMin in 24h ET)
- "bullish_candle" — current bar closes bullish
- "bearish_candle" — current bar closes bearish

SL methods: "fixed_points" | "below_signal_candle" | "swing_point"
TP methods: "rr_multiple" | "fixed_points"

Output ONLY valid JSON (no markdown, no explanation):
{
  "conditions": [{ "type": "condition_type_id", ...optional params }],
  "direction": "LONG" | "SHORT" | "AUTO",
  "slMethod": "fixed_points" | "below_signal_candle" | "swing_point",
  "slValue": number,
  "tpMethod": "rr_multiple" | "fixed_points",
  "tpValue": number,
  "maxTradesPerDay": number,
  "summary": "1-2 sentence plain English description of what the Pine Script strategy does"
}

Rules:
- Map strategy.entry("Long") → direction LONG, strategy.entry("Short") → direction SHORT
- Map ta.ema(close, N) conditions → price_above_ema or price_below_ema with emaPeriod: N
- Map ta.vwap conditions → price_above_vwap or price_below_vwap
- Map time() filters → time_between condition
- Map strategy.exit stop_loss → slValue in points; profit_target → tpValue
- If direction is ambiguous or both long and short, use "AUTO"
- maxTradesPerDay default 2 if not specified
- Extract as many conditions as possible from the Pine Script`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

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

  const script = (body?.script ?? '').trim()
  if (!script || script.length < 50) {
    res.status(400).json({ error: 'Pine Script too short (minimum 50 characters)' })
    return
  }
  if (script.length > 5000) {
    res.status(400).json({ error: 'Pine Script too long (maximum 5000 characters)' })
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
        messages: [{ role: 'user', content: script }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      res.status(502).json({ error: data?.error?.message ?? 'Claude API error' })
      return
    }

    const raw = data?.content?.[0]?.text ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(502).json({ error: 'Could not parse strategy from Pine Script' })
      return
    }

    const config = JSON.parse(jsonMatch[0])
    res.status(200).json(config)
  } catch (err) {
    res.status(500).json({ error: 'Pine Script translation failed: ' + err.message })
  }
}
