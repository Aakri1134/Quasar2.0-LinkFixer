# Plan

What's left to do. Checked items are actually done and verified, not just planned.

## Backend

The pipeline bugs are fixed, so a scan now runs end to end. What's missing is the stuff built
on top of it.

- [x] Scan message carries `task` so the Manager stops dropping it
- [x] New websites get seeded from robots.txt / sitemap.xml
- [x] `eval_sitemap` chains into the next task
- [x] `Check` saves the `website` id and duration
- [x] Alerts save `details` (was `detail`, silently dropped)
- [x] Verification endpoint works (schema + missing save + backwards date check)
- [x] Shared Redis client instead of one per request
- [x] `eval_seo` and `eval_metadata` are reachable now
- [x] `ResultRecords` matches the scraper's `LinkRecord`
- [x] Alerts list API + ownership checks
- [x] Checks / history API
- [x] User module (`/me`, password change)

Remaining:

- [ ] **Websockets for live scan status.** Deliberately left — you said you'd handle this.
      The UI is ready: `useScanStatus` polls the REST endpoint today and is the only seam,
      so swapping in a socket is a one-hook change. The scraper already publishes to
      `scan:progress:<domain>` and the Manager sets `scan:meta:<domain>`.
- [x] **Reporter worker.** Consumes `report_generation`, calls the AI, saves `check.aiReport`.
- [x] **Email reports.** The reporter resolves `mail_subscribers` to emails and sends the summary.
- [x] **Scheduled scans.** Real cron in its own worker, with a Redis lock so two processes can't
      double-enqueue.
- [ ] **SEO score.** The scraper collects metadata and schema, but nothing grades it yet.

## Frontend

Done. Every tab reads real data and every hook has a real importer.

- [x] API base url reads `VITE_API_URL` instead of hardcoded localhost
- [x] 404 page and error boundary
- [x] `WebsiteService` has `scanWebsite`, `verifyWebsite` and `getScanStatus`
- [x] **Query/mutation hooks** for alerts, checks and user.
- [x] **Alerts tab** — filterable table, paging, resolve toggle.
- [x] **Settings tab** — scan frequency and mail toggle save via `PATCH /website/:id/settings`;
      verification card and delete-website danger zone.
- [x] **History tab** — expandable scans, per-link vitals, AI report.
- [x] **Run scan button** — task picker plus progress on the Overview tab.
- [x] **Domain verification UI**.
- [x] **Account page** — profile, password change, logout.
- [x] `WebsiteInfo/ui.tsx` shared components are now used by every tab.

## Scraper

- [x] Fixed the stuck `isActive` flag, the Chromium leak, and the Redis read on every link
- [x] Handles SIGTERM properly
- [x] Publishes progress for the live status feature
- [x] `verifyMetadata()` and `verifySchema()` implemented
- [ ] Respect robots.txt (there's a `robots_txt_url` field on the model already)
- [ ] `.env.dev` is entirely commented out so `make run-dev-1` fails

## Before deploying

- [ ] Rotate the RabbitMQ password and Redis url in `scraper/command.txt` and `.env.local`,
      then delete `command.txt`
- [ ] Set `FRONTEND_URL` in prod — used for CORS *and* the verification email link, so if it's
      wrong signup breaks and it isn't obvious why
- [ ] Cookie is `SameSite=Lax`, so it won't be sent if the frontend and API are on different
      domains. Simplest fix is putting both behind one domain.
- [ ] Serve the frontend so `/dashboard` doesn't 404 on refresh (needs an index.html fallback)

## Notes

- Tests are skipped for now.
- `npm run test-manager` (backend) and `scraper/src/test/` are the manual way to test a crawl.
