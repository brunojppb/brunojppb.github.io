/**
 * CLoudflare worker for custom endpoint serving
 * Good Reads real-time info from my profile.
 * We cannot call Good Reads straight up from the browser. Their CORS settings do not allow that.
 * 
 * Environment Variables required:
 * - GOODREADS_KEY
 * 
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const parseQueryString = (request) => {
  const params = {};
  const url = new URL(request.url);
  const queryString = url.search.slice(1).split('&');

  queryString.forEach(item => {
    const kv = item.split('=')
    if (kv[0]) {
      params[kv[0]] = kv[1] || true;
    }
  });
  return params;
};

function responseWithStatus(body, status) {
  return new Response(body, {
    status,
    headers: corsHeaders,
  });
}

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  try {
    const query = parseQueryString(request);
    const readingList = query.readingList || 'currently-reading';
    const currentlyReadingUrl = `https://www.goodreads.com/review/list/39733988.xml?key=${GOODREADS_KEY}&v=2&shelf=${readingList}`;
    const response = await fetch(currentlyReadingUrl);
    return responseWithStatus(response.body, 200);
  } catch(e) {
    return responseWithStatus('Oops! Something went wrong.', 500);
  }
}