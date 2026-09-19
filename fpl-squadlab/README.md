# FPL SquadLab

A React (Vite) web app for Fantasy Premier League managers. It reads live data from
the official FPL API and lets you build a legal 15-player squad, analyse it, and
compare transfer candidates.

## Features

- **Dashboard** – current gameweek, player/team counts and total managers.
- **Players** – searchable, filterable, sortable table of every FPL player.
- **Player details** – season stats, a custom (clearly labelled) SquadLab score,
  points-per-gameweek chart and upcoming fixtures.
- **Team Builder** – pitch view with starting XI, bench, captain and vice-captain,
  enforced by FPL squad rules (budget, position limits, max 3 players per club).
- **Fixtures** – gameweek/club filtered fixture list with FDR badges.
- **Team Analysis** – squad statistics, position/club/fixture-difficulty charts,
  transfer comparison and a local data-based assistant.

The squad is saved in `localStorage` (`fpl_squad`), so it survives reloads and is
shared between the Team Builder, Team Analysis and player details pages.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

## How the FPL API is reached

The official API (`https://fantasy.premierleague.com/api/...`) does not allow
browser requests from other origins, so the app always calls the relative path
`/api/...` and that path is proxied:

| Environment     | Proxy                                                |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | `server.proxy` in `vite.config.js`                   |
| `npm run preview` | `preview.proxy` in `vite.config.js`                |
| Vercel          | `rewrites` in `vercel.json`                          |

`/api/bootstrap-static/`, `/api/fixtures/` and `/api/element-summary/:id/` are the
only endpoints used. Successful responses are cached in memory for five minutes
(see `src/services/fplApi.js`) because the bootstrap payload is large and every
page needs it.

Every request includes its **trailing slash**, and the Vercel rewrite must keep it.
Verified against the live API: the slash-less form answers with `301` and a
`Location` of `https://fantasy.premierleague.com/api/bootstrap-static/` - an
absolute, cross-origin URL. If a proxy ever drops the trailing slash, the browser
follows that redirect as a *new cross-origin request*, which the API refuses, and
the app breaks in production while working fine locally (where Vite forwards the
path verbatim).

That is why the rewrite captures the path with a regex (`/api/(.*)`) instead of a
path-segment placeholder (`:path*`): the regex copies the request path through
unchanged, whereas `:path*` is re-serialised by Vercel's router and Vercel is
known to normalise trailing slashes on rewrite destinations. Same idea for the
fallback: `/(.*)` rather than `/:path*`.

## Error handling

- `src/services/fplApi.js` gives every request a 15 second timeout, reports an
  empty or non-JSON body with a message that names the likely cause, and exposes
  `asArray()` so a changed API shape can never crash a list render.
- Each page has loading, error and retry states, so a failed request shows a
  message instead of an endless spinner.
- `src/components/ErrorBoundary.jsx` wraps the routes. If a page still throws,
  the user sees an explanation and a retry button rather than a blank screen.
- The saved squad is only ever read through `src/utils/squadStorage.js`, which
  tolerates missing storage, invalid JSON, a non-array payload and entries from an
  older format.

## Deploying to Vercel

1. Import the repository in Vercel.
2. **Set Root Directory to `fpl-squadlab`.** The app lives in a subfolder, and
the repository root has no `package.json`. Without this setting the build fails
with a "no package.json" style error. The framework preset (Vite), build command
(`npm run build`) and output directory (`dist/`) are all detected automatically,
and are also pinned in `vercel.json`.
3. No environment variables are required - the project has no API keys, tokens or
secrets of any kind, so there is no `.env` file to create. The FPL API is public
and is reached through the `/api` proxy described above, never with a key.
4. `vercel.json` contains the two rewrites the app needs, **in this order**:
   - `/api/(.*)` → `https://fantasy.premierleague.com/api/$1` (API proxy)
   - `/(.*)` → `/index.html` (SPA fallback, so `/players`, `/team-builder`,
     `/fixtures`, `/analysis` and `/players/:id` all work when opened directly)

To reproduce the production behaviour locally before deploying:

```bash
npm run build
npm run preview    # serves dist/ on http://localhost:4173 and proxies /api
```

### Troubleshooting after a deploy

The first thing to check is a direct API call through the deployment:

```bash
curl -i https://your-app.vercel.app/api/bootstrap-static/
```

- **200 with JSON** - the proxy is working.
- **HTML (the app's `index.html`)** - the `/api` rewrite is missing or ordered
after the SPA fallback, so the catch-all is swallowing the API route.
- **301 to `fantasy.premierleague.com`** - the trailing slash was dropped.

If the FPL API ever rejects requests coming from Vercel's servers, replace the
first rewrite with a small serverless function that forwards the request with a
browser-like `User-Agent` header; the client code does not need to change.

## Notes

- This is an unofficial, non-commercial project and is not affiliated with the
  Premier League. SquadLab scores and fixture-difficulty figures are transparent
  calculations, not predictions.
