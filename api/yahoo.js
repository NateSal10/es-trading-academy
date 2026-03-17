export default async function handler(req, res) {
  // Strip /api/yahoo prefix and forward the rest to Yahoo Finance
  const path = req.url.replace(/^\/api\/yahoo/, '')
  const url = `https://query1.finance.yahoo.com${path}`

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
    res.status(500).json({ error: 'Yahoo Finance proxy failed', detail: err.message })
  }
}
