const ALLOWED_ORIGIN = 'https://es-trading-academy.vercel.app'

// Only permit chart endpoints for safe ticker symbols.
// Pattern: /v8/finance/chart/<SYMBOL> where SYMBOL contains only
// alphanumeric characters, hyphens, dots, equals signs, and carets.
const ALLOWED_PATH_RE = /^\/v8\/finance\/chart\/[A-Za-z0-9\-.\^=]+$/

export default async function handler(req, res) {
  // CORS — restrict to production origin
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  // Strip /api/yahoo prefix to get the forwarded path + query string
  const rawPath = req.url.replace(/^\/api\/yahoo/, '')
  // Validate only the pathname portion (before any query string)
  const pathname = rawPath.split('?')[0]

  if (!ALLOWED_PATH_RE.test(pathname)) {
    res.status(400).json({ error: 'Invalid path' })
    return
  }

  const url = `https://query1.finance.yahoo.com${rawPath}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Yahoo Finance proxy failed' })
  }
}
