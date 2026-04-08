// Cache the price server-side to avoid hammering external APIs
let cachedPrice: { ethereum: { usd: number } } | null = null
let lastFetchTime = 0
const CACHE_DURATION = 60_000 // 60 seconds

export async function GET() {
  const now = Date.now()

  // Return cached data if still fresh
  if (cachedPrice && now - lastFetchTime < CACHE_DURATION) {
    return Response.json(cachedPrice)
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      // If rate-limited but we have a cache, return stale cache
      if (cachedPrice) return Response.json(cachedPrice)
      return Response.json({ error: 'CoinGecko API error' }, { status: res.status })
    }

    const data = await res.json()
    cachedPrice = data
    lastFetchTime = now

    return Response.json(data)
  } catch (err) {
    // On failure, return stale cache if available
    if (cachedPrice) return Response.json(cachedPrice)
    return Response.json({ error: 'Failed to fetch ETH price' }, { status: 500 })
  }
}