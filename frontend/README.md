# EventPulse frontend

React 19 + TypeScript SPA for the EventPulse ticketing platform.

- **Stack:** Vite, TanStack Query, React Router, Tailwind CSS 4
- **Auth model:** access token kept in memory only; session restored via the
  httpOnly refresh cookie on reload
- **Dev:** `npm install && npm run dev` — proxies `/api` to `localhost:8080`
  (see `vite.config.ts`)
- **Build:** `npm run build` (typecheck + bundle)

See the [root README](../README.md) for full setup.
