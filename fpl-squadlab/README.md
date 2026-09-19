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

## Deploying to Vercel

1. Import the repository in Vercel. The Vite framework preset is detected
   automatically (`npm run build` → `dist/`).
2. No environment variables are required.
3. `vercel.json` already contains the two rewrites the app needs, **in order**:
   - `/api/:path*` → `https://fantasy.premierleague.com/api/:path*` (API proxy)
   - `/:path*` → `/index.html` (SPA fallback so client-side routes deep-link)

If the FPL API ever rejects requests coming from Vercel's servers, replace the
first rewrite with a small serverless function that forwards the request with a
browser-like `User-Agent` header; the client code does not need to change.

## Notes

- This is an unofficial, non-commercial project and is not affiliated with the
  Premier League. SquadLab scores and fixture-difficulty figures are transparent
  calculations, not predictions.
