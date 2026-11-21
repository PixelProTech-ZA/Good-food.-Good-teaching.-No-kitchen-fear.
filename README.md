# Mom Sindy + OpenRouter (PixelProTech Solutions)

```
Browser (index.html)  --->  Cloudflare Worker  --->  OpenRouter
no key, public page         holds OPENROUTER_API_KEY   /api/v1/chat/completions
```

The page only ever talks to your Worker. The OpenRouter key exists in one place: an encrypted Worker secret.

## Files

| File | Purpose |
|---|---|
Everything lives in one flat folder.

| File | Purpose |
|---|---|
| `index.html` | Mom Sindy page. Set `API_BASE` to your Worker address (not a secret). |
| `manifest.webmanifest` | PWA manifest: name, colours, icons, recipe shortcuts. |
| `sw.js` | Service worker: app shell works offline. Bump `VERSION` when you change files. |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.png` | App icons. |
| `.nojekyll` | Tells GitHub Pages to serve files as they are. |
| `worker.js` | The proxy: validation, prompt, CORS, error handling. |
| `wrangler.toml` | Non-secret config: `MODEL`, `FALLBACK_MODELS`, `ALLOWED_ORIGINS`. |
| `package.json` | Scripts: `npm test`, `npm run dev`, `npm run deploy`, `npm run live-test`. |
| `worker.test.mjs` | Offline tests (`npm test`). |
| `live-test.mjs` | Real end-to-end test of the deployed Worker. |

## Install as an app (PWA)

Host the folder over HTTPS (GitHub Pages works). On Android Chrome, tap **Install app** in the page header or use the browser menu, then **Install app**. Long-press the home-screen icon for shortcuts to each recipe. The page opens offline; Mom Sindy's AI answers need a connection and fall back to built-in answers without one.

## Deploy

1. **Create a new key** at https://openrouter.ai/keys. Revoke the key you shared earlier, since it was exposed. Make sure the account has credits.
2. `npm install && npx wrangler login`
3. Edit `wrangler.toml`: set `ALLOWED_ORIGINS` to the exact origin(s) hosting the page (for GitHub Pages: `https://<user>.github.io`, no path, no trailing slash) and pick your `MODEL`.
4. Store the key as a secret. Wrangler prompts for it, so it never goes in a file, shell history or chat:
   ```
   npx wrangler secret put OPENROUTER_API_KEY
   ```
5. `npx wrangler deploy` and note the `https://mom-sindy-api.<subdomain>.workers.dev` address.
6. In `index.html` set `const API_BASE = "https://mom-sindy-api.<subdomain>.workers.dev";` and publish the page.
7. **Prove the real connection** (needs no key on your machine):
   ```
   WORKER_URL=https://mom-sindy-api.<subdomain>.workers.dev ORIGIN=https://<your-site-origin> npm run live-test
   ```
   It must print `LIVE TEST PASSED` with a real answer from Mom Sindy.

## Changing the model

Edit `MODEL` (and optionally `FALLBACK_MODELS`) in `wrangler.toml`, then `npx wrangler deploy`. Browsers cannot choose or override the model. The default is `openai/gpt-4o`. Any id from https://openrouter.ai/models works, and `openrouter/auto` lets OpenRouter pick for you.

## Local testing

Copy `.dev.vars.example` to `.dev.vars` and paste a new key there yourself (it is git-ignored). Run `npx wrangler dev` (port 8787), serve the page with `python3 -m http.server 8080`, and set `API_BASE = "http://localhost:8787"` temporarily.

## How the conversation works

- Each question sends the recipe, current step and its safety tip, servings, kitchen setup, the scaled ingredient list and the last 10 messages. The Worker is stateless, so asking a question never changes cooking progress.
- Commands ("next", "back", "repeat") are handled in the page and never go to the AI.
- If the Worker or OpenRouter is unreachable, slow, out of credits or rate-limited, Mom Sindy answers from her built-in answers and the page says so.
- Chat history lives in page memory only. The service worker caches only the app files (page, icons, manifest), never questions or answers.

## Privacy and limits

- Because the repo is flat, `worker.js` and the tests are also served by GitHub Pages. They contain no secrets (the key is a Worker secret), so this is harmless.
- Questions and cooking context are sent through your Worker to OpenRouter and the model provider it routes to. The page says this. The Worker logs only an HTTP status code on upstream errors.
- The built-in rate limit (20 requests/minute per client) is per Worker instance and best-effort. For hard limits add a Cloudflare rate-limiting rule on `/chat`.
- AI answers can be wrong. Mom Sindy is told to prioritise food safety and say when unsure, but a cook should still follow packet instructions and local food-safety guidance.
