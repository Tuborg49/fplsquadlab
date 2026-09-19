// We use a relative path '/api' which the dev and preview servers proxy to
// https://fantasy.premierleague.com/api (see vite.config.js), and which Vercel
// proxies with the rewrites in vercel.json. This bypasses CORS restrictions.
const API_BASE_URL = '/api';

// The FPL bootstrap payload is ~1.5MB and every page needs it, so keep results
// briefly in memory instead of refetching on each navigation.
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map();

const fetchJson = (path, description) => {
  const cached = responseCache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = fetch(`${API_BASE_URL}${path}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    })
    .catch(error => {
      console.error(`Error fetching FPL ${description}:`, error);
      // Never cache a failure so the retry button can work immediately.
      responseCache.delete(path);
      throw error;
    });

  responseCache.set(path, { timestamp: Date.now(), promise });
  return promise;
};

export const getBootstrap = () => fetchJson('/bootstrap-static/', 'bootstrap data');

export const getPlayerDetails = playerId => fetchJson(`/element-summary/${playerId}/`, `details for player ${playerId}`);

export const getFixtures = () => fetchJson('/fixtures/', 'fixtures');
