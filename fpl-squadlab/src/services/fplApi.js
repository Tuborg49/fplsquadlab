// We use a relative path '/api' which the dev and preview servers proxy to
// https://fantasy.premierleague.com/api (see vite.config.js), and which Vercel
// proxies with the rewrites in vercel.json. This bypasses CORS restrictions.
//
// Every endpoint is called WITH its trailing slash, because the FPL API redirects
// the slash-less form to the slashed one with a 301 to an absolute URL - a
// cross-origin redirect the browser would block. The matching rewrite in
// vercel.json uses a regex capture so the trailing slash is preserved.
const API_BASE_URL = '/api';

// The FPL bootstrap payload is ~1.5MB and every page needs it, so keep results
// briefly in memory instead of refetching on each navigation.
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const responseCache = new Map();

// A request that never settles would leave a page stuck on its loading state.
// AbortSignal.timeout is not available in older browsers, so fall back to a
// normal request there instead of throwing.
const timeoutOptions = () => {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
    }
  } catch {
    // Ignore and fall through to a request without a timeout.
  }
  return {};
};

const parseResponse = async (response, description) => {
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';

  let body = '';
  try {
    body = await response.text();
  } catch {
    throw new Error(`Could not read the response from the FPL API (${description}).`);
  }

  if (!body.trim()) {
    throw new Error('The FPL API returned an empty response.');
  }

  // This is what a misconfigured proxy looks like: the SPA fallback hands back
  // index.html, so parsing it as JSON would only ever say "Unexpected token <".
  if (!contentType.includes('json')) {
    throw new Error(
      'The /api proxy returned HTML instead of JSON. The API rewrites in vercel.json are not being applied.'
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error('The FPL API returned a malformed JSON response.');
  }
};

const fetchJson = (path, description) => {
  const cached = responseCache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = fetch(`${API_BASE_URL}${path}`, timeoutOptions())
    .then(response => parseResponse(response, description))
    .catch(error => {
      console.error(`Error fetching FPL ${description}:`, error);
      // Never cache a failure so the retry button can work immediately.
      responseCache.delete(path);

      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new Error('The FPL API took too long to respond. Please try again.');
      }

      throw error;
    });

  responseCache.set(path, { timestamp: Date.now(), promise });
  return promise;
};

// Guards against the API changing shape: callers always receive an array.
export const asArray = value => (Array.isArray(value) ? value : []);

export const getBootstrap = () => fetchJson('/bootstrap-static/', 'bootstrap data');

export const getPlayerDetails = playerId => fetchJson(`/element-summary/${playerId}/`, `details for player ${playerId}`);

export const getFixtures = () => fetchJson('/fixtures/', 'fixtures');
