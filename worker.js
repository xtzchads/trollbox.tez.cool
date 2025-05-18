// Cloudflare Worker for Giphy API Proxy
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Set CORS headers to allow requests from your domain
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, replace with your domain
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

  // Parse the URL to get the query parameters
  const url = new URL(request.url)
  const searchType = url.searchParams.get('type') || 'trending'
  const query = url.searchParams.get('q') || ''
  const limit = url.searchParams.get('limit') || '50'

  // Determine the Giphy endpoint based on the search type
  let giphyUrl = ''
  if (searchType === 'search' && query) {
    giphyUrl = `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&q=${encodeURIComponent(query)}&limit=${limit}`
  } else {
    giphyUrl = `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&q=funny&limit=${limit}`
  }

  try {
    // Fetch data from Giphy API
    const giphyResponse = await fetch(giphyUrl)
    const giphyData = await giphyResponse.json()

    // Return the data with CORS headers
    return new Response(JSON.stringify(giphyData), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
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
