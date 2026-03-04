# Geo + Login Web App

Monorepo: Node/Express API and React (Vite + Tailwind + shadcn/ui) frontend.

**Requirements:** Node.js **v22.12.0** (see `.nvmrc`; use `nvm use` if you use nvm). Expect this to be tested on other local machines.

## API (`api/`)

- **Setup:** Copy `api/.env.example` to `api/.env` and set:
  - `MONGODB_URI` – MongoDB connection string
  - `JWT_SECRET` – Secret for JWT signing
  - `IPINFO_TOKEN` – Token from [ipinfo.io](https://ipinfo.io) (free tier works)
- **Install & run:**
  ```bash
  cd api && npm install && npm run seed && npm run dev
  ```
- **Seeded user:** `user@example.com` / `password123` (run `npm run seed` before first login)

## Web (`web/`)

- **Setup:** Optional – copy `web/.env.example` to `web/.env` and set `VITE_API_URL=http://localhost:8000` (default).
- **Install & run:**
  ```bash
  cd web && npm install && npm run dev
  ```
- Open the URL shown (e.g. http://localhost:5173), log in with the seeded user, then use the Home screen to view your IP/geo and search by IP.

## Features

- **Login:** Email/password validated against MongoDB; JWT stored in localStorage.
- **Home:** Shows current IP and geolocation; search by IP with validation; clear to revert; history list with click-to-show and multi-delete.
