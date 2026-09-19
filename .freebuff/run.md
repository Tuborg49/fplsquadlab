# Run doc — FPL SquadLab

Workspace root: `C:\project\FPL`
The app itself lives in the `fpl-squadlab/` subdirectory. **Run every command from
`fpl-squadlab/`, not from the workspace root** (there is no `package.json` at the root).

## 1. Reproduce the uncommitted artifacts

A fresh checkout needs nothing beyond dependencies. Specifics:

- **Dependencies:** `cd fpl-squadlab && npm install` (npm; `package-lock.json` is committed).
  `node_modules/` was already present in this worktree, so no install was needed.
- **Env files:** there are **none**, and none are required. No `.env`, `.env.local`,
  `.env.*` exists in the main checkout or in this worktree — nothing to copy.
  The app needs no API keys: it calls the public FPL API through a relative `/api`
  path that Vite proxies (`server.proxy` / `preview.proxy` in `vite.config.js`).
  If environment variables are ever introduced, they must be `VITE_`-prefixed and
  their values must live only in the Vercel dashboard or a gitignored local file.
- **Build output:** `fpl-squadlab/dist/` is a generated artifact (gitignored). It is
  not needed for the dev server. Regenerate with `npm run build` if you want to test
  the production bundle via `npm run preview`.

## 2. Run the server

Default port **5173** (Vite's default). It was free, so no port adaptation was needed.

Start it detached on Windows (PowerShell — `Start-Process` does not resolve shell shims,
so name `npm.cmd` exactly; stdout and stderr must go to different files):

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5173','--strictPort' -WorkingDirectory 'C:\project\FPL\fpl-squadlab' -RedirectStandardOutput 'C:\project\FPL\.freebuff\preview-a849b61a-ed44-40f9-8aca-b90374bc307d.log' -RedirectStandardError 'C:\project\FPL\.freebuff\preview-a849b61a-ed44-40f9-8aca-b90374bc307d.log.err' -WindowStyle Hidden -PassThru).Id"
```

Notes:
- `-WorkingDirectory` is required because the app is in the `fpl-squadlab/` subdirectory.
- `--strictPort` makes a port clash fail loudly instead of silently sliding to 5174.
- The `npm run dev` wrapper spawns child node processes; the process actually listening
  on 5173 is the Vite node process — find it with
  `netstat -ano | grep ":5173"` and that PID is the one to register.
- Health checks: `curl http://localhost:5173/` and
  `curl http://localhost:5173/api/bootstrap-static/` should both return **200**.
  The second confirms the API proxy is working, which every page depends on.
- Logs: see the `.log` / `.log.err` paths above.

## 3. Run the production build instead (recommended before a Vercel deploy)

`npm run dev` serves source files; Vercel serves `dist/`. To preview what Vercel
actually serves, build first and run Vite's preview server (default port **4173**):

```bash
cd fpl-squadlab
npm run build
```

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','preview','--','--strictPort' -WorkingDirectory 'C:\project\FPL\fpl-squadlab' -RedirectStandardOutput 'C:\project\FPL\.freebuff\preview-a849b61a-ed44-40f9-8aca-b90374bc307d.log' -RedirectStandardError 'C:\project\FPL\.freebuff\preview-a849b61a-ed44-40f9-8aca-b90374bc307d.log.err' -WindowStyle Hidden -PassThru).Id"
```

Health checks for the production preview:

```bash
curl http://localhost:4173/                      # 200, the built index.html
curl http://localhost:4173/players               # 200, SPA deep-link works
curl http://localhost:4173/api/bootstrap-static/ # 200 JSON through preview.proxy
```

The `/api` proxy exists in **both** `server.proxy` and `preview.proxy`, because
`npm run preview` would otherwise have no API at all. On Vercel the equivalent is
the `/api/(.*)` rewrite in `vercel.json` — keep the three in sync.
