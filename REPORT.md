# Project evaluation

Notes from going through the code to work out what's actually finished and what isn't.
The todo list is in `plan.md`.

## What works

- Signup, verification email, login, logout. Password hashing and the JWT cookie are all fine.
- Auth middleware, and the frontend wrapper that redirects when you're not logged in.
- Adding and removing websites. If two users add the same domain they share one Website document,
  which is handled correctly.
- The website Overview tab.
- The crawl engine itself. If you give the Manager a website that already has `sitemap_links` and
  a queue message with a `task` field, the whole Manager to scraper flow works. That's what
  `npm run test-manager` does, and it's the only path that's actually been proven to run.

## The main problem

The pieces work but they aren't connected. Four things break the chain:

1. The API sends a scan message without the `task` field, and the Manager throws away any message
   that doesn't have one.
2. `parseSitemap()` is written but never called, so a new website has no links to crawl.
3. There's no button anywhere in the UI to start a scan.
4. Checks get saved without a `website` id, so even when results are written you can't read them back.

So adding a website and clicking around does nothing visible. Fixing these four is what turns it
into a working product.

## Things that are written but never used

- `parseSitemap()` in `utils/website/sitemap.ts`
- `getReport()` in `utils/genAI/getReport.ts` (the AI report from the README)
- `sendReport()` in `utils/mail/mail.ts`
- `schedule.ts` — the cron callback is empty and the file isn't imported anywhere
- `useDeleteWebsite` and `useGenerateVerificationFile` on the frontend
- `Website.robots_txt_url` is in the schema but never set or read

## Security issues

- Alert endpoints don't check who owns the alert. Any logged in user can edit or delete anyone
  else's alerts by guessing the id.
- `POST /api/website/test-aakri-1234` has no auth on it.
- `scraper/command.txt` and `scraper/.env.local` have real RabbitMQ and Redis credentials in them.
  They're gitignored and were never committed, but they should still be rotated.
- Login says "Invalid credentials" for a wrong email and "Wrong Email or Password" for a wrong
  password, which tells an attacker which emails are registered.

## Deployment blockers

- Frontend had `http://localhost:5000` hardcoded.
- `docker-compose.prod.yaml` was referenced in the makefile but didn't exist.
- `FRONTEND_URL` isn't in `.env.example` even though it's used for CORS and for the verification
  email link. If it's wrong, signup breaks and it's not obvious why.
- Cookie is `SameSite=Lax`. That means it won't be sent on cross-site requests, so if the frontend
  and backend end up on different domains, login will look like it works and then immediately fail.
- `isProduction` reads `NODE_ENV` but everything else in the codebase uses `MODE_NODE`, so in
  production the cookie ships without the `Secure` flag.

## Smaller things worth knowing

- `Check.checkedLinks` is an array inside the document that grows with every crawled link. On a big
  site this will eventually hit MongoDB's 16MB document limit. Worth splitting into its own
  collection at some point.
- The Manager makes a brand new Alert for every broken link on every scan, so the same broken link
  shows up three times after three scans. The schema already has `check` as an array and an index
  on `{website, link, error_code}`, which suggests the original idea was one alert per link with
  each scan appended.
- `AuthService` casts everything to `any` because `mongoose.model()` was called without type
  parameters.
- `frontend/tsconfig.app.json` has `strict: false`.
- Lots of `console.log` in the Manager and scraper, including full result payloads.
