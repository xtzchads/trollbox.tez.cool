// Cloudflare Worker for Giphy API Proxy (Tenor v2 & Giphy v1 Compatible)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
  const request = event.request

  // Set CORS headers to allow requests from your domain
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://trollbox.xtzchad.xyz', // In production, replace with your domain
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle OPTIONS request (preflight request)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  // Block non-GET methods
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }

  // Parse and sanitize query parameters
  const url = new URL(request.url)
  const rawType = url.searchParams.get('type') || 'trending'
  const searchType = rawType === 'search' ? 'search' : 'trending'
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100)
  const rawLimit = parseInt(url.searchParams.get('limit'), 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 50

  // Build a normalized cache key using only the sanitized parameters
  // (strips arbitrary cache-busting query params or random paths)
  const cache = caches.default
  const cacheUrl = new URL(url.origin)
  cacheUrl.pathname = '/'
  cacheUrl.searchParams.set('type', searchType)
  if (searchType === 'search' && query) {
    cacheUrl.searchParams.set('q', query.toLowerCase())
  }
  cacheUrl.searchParams.set('limit', String(limit))
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' })

  const CACHE_TTL_SECONDS = 300 // Cache GIF queries at the edge for 5 minutes

  // Check Cloudflare Edge Cache first
  let cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    const hitHeaders = new Headers(cachedResponse.headers)
    Object.entries(corsHeaders).forEach(([k, v]) => hitHeaders.set(k, v))
    hitHeaders.set('X-Cache', 'HIT')
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers: hitHeaders
    })
  }

  // Support either GIPHY_KEY or existing TENOR_KEY secret binding
  const apiKey = typeof GIPHY_KEY !== 'undefined' ? GIPHY_KEY : TENOR_KEY

  // Determine the Giphy v1 endpoint based on the search type
  let giphyUrl = ''
  if (searchType === 'search' && query) {
    giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
  } else {
    giphyUrl = `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=g`
  }

  try {
    // Fetch data from Giphy API
    const giphyResponse = await fetch(giphyUrl)
    if (!giphyResponse.ok) {
      throw new Error(`Upstream Giphy error: ${giphyResponse.status}`)
    }
    const giphyData = await giphyResponse.json()
    const items = Array.isArray(giphyData.data) ? giphyData.data : []

    // Map Giphy items into Tenor v2 (`results[].media_formats`) & v1 (`results[].media`)
    // while also preserving Giphy's native `data` array for full backwards compatibility
    const results = items.map(item => {
      const imgs = item.images || {}
      const orig = imgs.original || {}
      const med = imgs.downsized_medium || imgs.fixed_height || orig
      const tiny = imgs.fixed_height_small || imgs.downsized_small || imgs.preview_gif || med
      const nano = imgs.fixed_height_small || imgs.preview_gif || tiny
      const preview = imgs.original_still?.url || imgs.fixed_height_still?.url || ''

      const toFormat = (imgObj) => ({
        url: imgObj.url || orig.url || '',
        dims: [Number(imgObj.width) || 0, Number(imgObj.height) || 0],
        size: Number(imgObj.size) || 0,
        preview
      })

      const mediaFormats = {
        gif: toFormat(orig),
        mediumgif: toFormat(med),
        tinygif: toFormat(tiny),
        nanogif: toFormat(nano)
      }

      return {
        id: String(item.id || ''),
        title: item.title || '',
        content_description: item.title || '',
        itemurl: item.url || '',
        url: orig.url || '',
        media_formats: mediaFormats,
        media: [mediaFormats]
      }
    })

    const nextOffset = (giphyData.pagination?.offset || 0) + (giphyData.pagination?.count || results.length)
    const compatiblePayload = {
      results,
      next: String(nextOffset),
      data: items,
      pagination: giphyData.pagination || {}
    }

    const response = new Response(JSON.stringify(compatiblePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'X-Cache': 'MISS',
        ...corsHeaders
      }
    })

    event.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    // Return error with CORS headers
    return new Response(JSON.stringify({ error: 'Failed to fetch GIFs' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
