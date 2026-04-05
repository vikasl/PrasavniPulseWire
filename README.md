# PulseWire

PulseWire is a cross-platform news app with:

- Expo frontend for iPhone, Android, and web
- Synology-friendly Node backend that proxies news APIs
- Docker setup for backend + hosted web client
- Fallback content so the app still renders cleanly if the upstream feed is unavailable

## Project layout

- `App.tsx`
  Frontend app shell and UI
- `src/`
  Frontend hooks, services, theme, and mock data
- `backend/server.js`
  Express API for hosted news access
- `docker-compose.yml`
  Synology-friendly multi-container setup
- `Dockerfile.web`
  Production web build served by nginx

## News providers

The backend supports two modes:

1. `spaceflight`
   Public Spaceflight News API, no key required
2. `gnews`
   GNews, requires a server-side API key
3. `thenewsapi`
   TheNewsAPI, requires a server-side API key

Keep private provider keys on the backend only. Do not ship private secrets in the mobile app.

## Local frontend setup

The root `.env` controls how the Expo app reaches the backend:

```env
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_NEWS_API_MODE=spaceflight
EXPO_PUBLIC_NEWS_API_KEY=
```

Recommended values:

- iPhone/Android on a real device:
  `EXPO_PUBLIC_API_BASE_URL=http://YOUR_SYNOLOGY_IP:4000`
- Web in Docker:
  leave this to the Docker build, which uses `/api`
- Local fallback-only development:
  leave it blank and the app will use public data or bundled mock content

## Local backend setup

The backend config lives in `backend/.env`:

```env
PORT=4000
NEWS_PROVIDER=spaceflight
NEWS_API_KEY=
ALLOWED_ORIGINS=*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
CACHE_TTL_MS=300000
REQUEST_TIMEOUT_MS=8000
TRUST_PROXY=1
LOG_LEVEL=info
```

To switch to GNews:

```env
NEWS_PROVIDER=gnews
NEWS_API_KEY=your_real_gnews_key
```

To switch to TheNewsAPI:

```env
NEWS_PROVIDER=thenewsapi
NEWS_API_KEY=your_real_thenewsapi_token
```

## Run locally

Frontend:

```bash
cd C:\Research\Codex
npm start
```

Backend:

```bash
cd C:\Research\Codex\backend
npm start
```

Then:

- press `a` for Android emulator
- press `i` for iPhone simulator on macOS
- or scan the QR code with Expo Go

For a real phone on the same network, set:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:4000
```

## Run web locally

```bash
cd C:\Research\Codex
npm run web
```

## Build static web output

```bash
cd C:\Research\Codex
npm run export:web
```

## Synology deployment

Copy this project to your Synology NAS, then from the project root run:

```bash
docker compose up --build -d
```

That starts:

- web app on port `8080`
- backend API on port `4000`

Routes:

- `http://YOUR_SYNOLOGY_IP:8080`
  web app
- `http://YOUR_SYNOLOGY_IP:4000/health`
  backend health check
- `http://YOUR_SYNOLOGY_IP:4000/api/news?category=technology`
  backend news endpoint

If you want the web app and API on one public URL, keep the provided nginx config as-is. It proxies `/api/*` from the web container to the backend container.

## Production hardening

The stack now includes:

- security headers in nginx and Express
- API rate limiting
- upstream request timeout handling
- in-memory response caching for news fetches
- container healthchecks
- backend startup as a non-root user
- proxy-aware request handling for Synology reverse proxy setups

Recommended production settings in `backend/.env`:

```env
NEWS_PROVIDER=thenewsapi
NEWS_API_KEY=your_real_provider_key
ALLOWED_ORIGINS=https://news.yourdomain.com
TRUST_PROXY=1
LOG_LEVEL=info
```

Avoid leaving `ALLOWED_ORIGINS=*` in production unless you intentionally want the API to be public from any browser origin.

## Synology reverse proxy and HTTPS

Recommended setup:

1. Run the containers on Synology with `docker compose up -d --build`
2. In Synology Reverse Proxy, point your public host like `news.yourdomain.com` to:
   `http://127.0.0.1:8080`
3. Enable HTTPS in Synology and attach a valid certificate
4. Keep port `4000` private if possible and expose only the web entrypoint through Synology

Suggested public flow:

- browser -> Synology HTTPS reverse proxy -> PulseWire web container
- web container -> internal Docker network -> backend container

This keeps the API behind the web entrypoint and lets Synology handle TLS termination.

## Post-deploy checks

After deployment, verify:

```bash
docker compose ps
curl http://YOUR_SYNOLOGY_IP:4000/health
curl http://YOUR_SYNOLOGY_IP:8080/api/news?category=technology
```

If you are using Synology HTTPS reverse proxy, also verify:

```bash
curl https://news.yourdomain.com
curl https://news.yourdomain.com/api/news?category=technology
```

## Mobile app against Synology

To make the phone app use your Synology backend, update the root `.env` before starting Expo:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_SYNOLOGY_IP:4000
```

Then restart Expo with:

```bash
npm start
```

## Notes

- The current saved stories feature is local to the device via AsyncStorage.
- If you want multi-user accounts or shared bookmarks next, the backend is the right place to add them.
- If the key you pasted earlier was a real `sk-...` secret, revoke it. That key format should not be exposed to clients.

## Git setup

To push this project to your own repository:

```bash
git init
git add .
git commit -m "Initial PulseWire app"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

The `.gitignore` already excludes local env files, dependencies, Expo cache, and generated web export folders.
