addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  const url = new URL(request.url)
  const searchType = url.searchParams.get('type') || 'trending'
  const query = url.searchParams.get('q') || ''
  const limit = url.searchParams.get('limit') || '50'

  let giphyUrl = ''
  if (searchType === 'search' && query) {
    giphyUrl = `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&q=${encodeURIComponent(query)}&limit=${limit}`
  } else {
    giphyUrl = `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&q=funny&limit=${limit}`
  }

  try {
    const giphyResponse = await fetch(giphyUrl)
    const giphyData = await giphyResponse.json()

    return new Response(JSON.stringify(giphyData), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch GIFs' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
