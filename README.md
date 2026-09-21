# LinkFixer

**Find every broken link on your website — crawled by a pool of distributed headless-Chrome workers.**

🥉 **3rd place at Quasar 2.0**

Broken links hurt user experience and SEO. LinkFixer crawls a site page by page, checks every internal and external link, and records the HTTP status of each one. Crawling is split across independent Puppeteer workers coordinated through RabbitMQ and Redis, so you can add capacity by starting more scraper containers.

---

## Why the architecture looks like this

A link checker sounds like a script: loop over pages, follow `<a>` tags, print statuses. LinkFixer is built as a distributed system instead, because the moment you point it at a real site three problems show up that a single process can't solve well:

1. **Sites vary by orders of magnitude in size.** A 20-page brochure site and a 50,000-page e-commerce catalog can't share a crawl budget — give every scan the same generous time slice and you waste most of it on small sites; give every scan a small slice and big sites never finish.
2. **The same link gets discovered from many pages.** Without cheap deduplication, a site with heavy internal cross-linking gets checked exponentially more times than it has links.
3. **The network lies sometimes.** A timeout or a dropped connection isn't the same as a genuinely broken link, but treating every failure identically means either wasted retries on truly dead links or false positives on live ones.

Each of these turned into a specific, load-bearing design decision:

- **MLFQ-style tiered scan queues.** Every scan starts on a fast, low-resource `priority_low` Manager. If it doesn't finish within that tier's link budget, the *domain* (not the whole crawl) is handed off to the next tier's queue — `priority_medium`, then `priority_high` — where it gets a larger budget and, ultimately, a guarantee of running to completion. This is the same idea as multi-level feedback queue CPU scheduling — cheap jobs get done cheap, and only the jobs that need more get more — applied to crawl budgets instead of CPU time slices. The chain isn't fixed at two or three levels: it's just however many Manager processes you run, each pointed at its own tier and told which tier to escalate to next.
- **Two-level link deduplication.** Each scraper keeps an in-memory set (**L1**) of links it has personally already checked, and only falls back to a shared Redis set (**L2**) for cross-scraper de-duplication. An earlier version checked correctness by pulling the *entire* checked-link set out of Redis on every single link — correct, but O(n) network transfer per link, so O(n²) over a whole crawl. On a 10,000-page site that meant moving on the order of tens of millions of characters through Redis for no benefit. The two-level cache keeps the common case (a link this scraper already saw) local and free, and only pays the Redis round trip for the case that actually needs cross-scraper coordination.
- **Classified, capped retries.** When a fetch fails, the scraper checks the error message against a short list of known-transient signatures (navigation timeouts, connection resets, empty responses, detached frames). Only those get re-queued, with a growing timeout on each attempt, up to 3 tries. Everything else — a real 404, a real 500 — is recorded as broken immediately. This avoids both failure modes of a blanket retry policy: hammering a genuinely dead link three times before giving up, and reporting a live link as broken because of one bad network blip.
- **Redis pub/sub for health, not a central poller.** Scrapers publish a heartbeat every 7 seconds; the Manager doesn't poll anything, it just notices 30 seconds of silence on a subscription. This keeps failure detection decoupled from however many scrapers happen to be running, which is what lets scraper count scale independently of the Manager.

## Architecture

```mermaid
flowchart LR
    UI["React + Vite frontend"] -- "REST · httpOnly cookie" --> API["Express API"]
    API <--> DB[("MongoDB")]
    API -- "scan request" --> Q1{{"RabbitMQ<br/>website queue"}}

    subgraph MLFQ ["MLFQ tier chain — as many levels as you deploy"]
        direction LR
        M1["Manager<br/>priority_low<br/>(small link budget)"] -- "domain didn't finish<br/>→ escalate" --> M2["Manager<br/>priority_medium"]
        M2 -- "still didn't finish<br/>→ escalate" --> M3["Manager<br/>priority_high<br/>(must run to completion)"]
    end

    Q1 --> M1
    M1 -- "seed links" --> Q2{{"RabbitMQ<br/>per-domain links queue"}}
    M1 -. "assign domain (pub/sub)" .-> R[("Redis")]
    M2 -. "assign domain (pub/sub)" .-> R
    M3 -. "assign domain (pub/sub)" .-> R
    R --> S1["Scraper #1<br/>Puppeteer · L1 cache"]
    R --> S2["Scraper #N<br/>Puppeteer · L1 cache"]
    Q2 <--> S1
    Q2 <--> S2
    S1 -- "results · heartbeats" --> R
    S2 -- "results · heartbeats" --> R
    M1 -- "persist checks" --> DB
    M2 -- "persist checks" --> DB
    M3 -- "persist checks" --> DB
```

### How a scan works

1. **Queue** — `POST /api/website/scanWebsite` verifies the user owns the site, sets `queued:<domain>` in Redis, and pushes `{ id, attempt }` onto the tier's `<QUEUE>_domain` RabbitMQ queue (starting at `priority_low` by default).
2. **Seed** — the Manager for that tier picks up the job, loads the site from MongoDB, and pushes its sitemap links (depth 0) onto the `<domain>_links` queue.
3. **Assign** — idle scrapers register themselves on the `available_browsers` queue. The Manager claims up to `INSTANCES` of them and sends each the job over Redis pub/sub (`<scraperId>_domain`).
4. **Crawl** — each scraper opens its 3-tab browser and consumes links. For every link it first checks its own in-memory L1 set, then the shared Redis L2 set, and only actually fetches the page if both miss. Internal pages are scanned for more `<a href>` links, enqueued at `depth + 1`; external links are only checked, never crawled further. A failed fetch is checked against the retryable-error list before being requeued with backoff or recorded as broken.
5. **Heartbeat** — scrapers publish a status every 7 s on `<scraperId>_status` (`1` working, `0` done, `-1` failed). The Manager treats 30 s of silence as a failure and requeues the site once.
6. **Escalate or persist** — when every scraper has gone idle: if the link queue is empty, the crawl is done and the Manager writes a new entry to the site's `checks` array in MongoDB. If links remain and this tier isn't `priority_high`, the domain is handed to the tier named in `NEXT_QUEUE` instead of being abandoned or forced to finish on an under-provisioned tier.

### The life of one link

The dedup cache and the retry classifier both live on this path — it's worth looking at on its own:

```mermaid
flowchart TD
    A["Link popped from<br/>&lt;domain&gt;_links queue"] --> B{"In this scraper's<br/>L1 cache?<br/>(in-memory Set)"}
    B -- yes --> Z1["Skip — ack<br/>(no I/O at all)"]
    B -- no --> C{"In the shared<br/>L2 cache?<br/>(Redis SISMEMBER)"}
    C -- yes --> Z2["Add to L1 · Skip — ack"]
    C -- no --> D["Fetch with Puppeteer<br/>(or a plain GET for<br/>pdf/zip/docx/media)"]
    D --> E{"Fetch failed?"}
    E -- no --> F["Record status ·<br/>add URL to L1 + L2 ·<br/>queue newly discovered links"]
    E -- yes --> G{"Retryable error?<br/>(timeout, connection reset,<br/>empty response, …)<br/>and under 3 attempts?"}
    G -- yes --> H["Re-queue with a<br/>longer timeout next try"]
    G -- no --> I["Record as a<br/>genuine broken link"]
```

<details>
<summary><b>Queue &amp; Redis reference</b></summary>

| Name | Where | Purpose |
|---|---|---|
| `<QUEUE>_domain` (e.g. `priority_high_domain`) | RabbitMQ | Scan jobs: `{ id, attempt }` |
| `<domain>_links` | RabbitMQ | URLs to visit: `{ link, depth }` |
| `available_browsers` | RabbitMQ | Idle scrapers waiting for work |
| `queued:<domain>` | Redis | `1` = scan queued/running; deleting it cancels the scan |
| `<scraperId>_domain` | Redis pub/sub | Manager → scraper job assignment |
| `<scraperId>_status` | Redis pub/sub | Scraper heartbeat (`1` / `0` / `-1`) |
| `<domain>_checkedLinks` | Redis set | The L2 cache: cross-scraper de-duplication (each scraper also keeps its own L1 set in memory) |
| `<domain>_results` | Redis list | Per-link results before they're persisted |
| `<domain>_pause_status` | Redis counter | Semaphore for when all scrapers on a domain are finished |
| `SERVICES:DOWN` | Redis | Kill switch for scan requests |

</details>

## Features

- **Full-site link checking** — seeds from `sitemap.xml` (falls back to the URL you enter), follows internal links, and checks external links without crawling them.
- **Rich results per link** — final status code, status text, and redirect target.
- **File-aware** — `pdf`, images, `zip`, `docx`, `mp3`/`mp4` links are verified with a direct HTTP GET instead of a page load.
- **Distributed scrapers** — any number of scraper containers, on any machine, pull work from RabbitMQ. Each runs a headless Chromium with a pool of 3 tabs.
- **Two-level link deduplication** — an in-memory set per scraper plus a shared Redis set, so a heavily cross-linked site doesn't get re-checked exponentially (see [Architecture](#architecture)).
- **Classified retries** — transient failures (timeouts, connection resets) are retried with backoff up to 3 times; everything else is recorded as broken immediately.
- **MLFQ-style scan tiers** — a scan escalates through as many priority tiers as you deploy Managers for, so small sites finish cheaply and large sites still get guaranteed completion.
- **Fault tolerant** — scraper heartbeats, 30 s silence detection, automatic browser recycling on navigation failure.
- **Scan de-duplication** — a domain that is already queued or running isn't queued twice.
- **Accounts** — email + password signup with emailed verification (Brevo), JWT in an `httpOnly` cookie, Zod request validation.
- **Site ownership verification** — prove you own a domain by hosting a signed token file.
- **Kill switch** — set `SERVICES:DOWN` in Redis and scan requests return `503`.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7, Axios |
| API | Node.js, Express, TypeScript, Mongoose, Zod, JWT, bcrypt |
| Workers | Manager (Node/TypeScript) + Scraper (Puppeteer 24) |
| Messaging & state | RabbitMQ (`amqplib`), Redis (`ioredis`) |
| Database | MongoDB |
| Email | Brevo transactional API |
| Infra | Docker, Docker Compose, Oracle Cloud Always Free VMs |

## Repository layout

```
.
├── backend/              Express API + Manager worker
│   └── src/
│       ├── modules/      auth · user · website  (routes → controller → service → repository)
│       ├── workers/managers/   Manager + StatusSubscriber
│       ├── middleware/   auth, request validation, services kill switch
│       ├── models/       Mongoose User + Website schemas
│       └── utils/        mail, sitemap parsing, Gemini report helper, enqueue
├── scraper/              Puppeteer scraper worker
│   └── src/init/         Scraper, PageUtilities, shared types
├── frontend/             React + Vite app (current)
├── legacy-frontend/      v1 dashboard (React + shadcn/ui) — kept for reference
└── scraper-legacy/       v1 JavaScript scraper — kept for reference
```

## Getting started

### Prerequisites

- Node.js 24 (matches the Docker images) and npm
- Docker + Docker Compose
- A **MongoDB** connection string (Atlas or local)
- A **Redis** instance the backend and scrapers can both reach
- A [Brevo](https://www.brevo.com/) API key for verification emails

### 1. Clone

```bash
git clone https://github.com/Aakri1134/Quasar2.0-LinkFixer.git
cd Quasar2.0-LinkFixer
```

### 2. Backend (API + RabbitMQ + Manager)

```bash
cd backend
cp .env.example .env      # then fill in the values below
make run-dev              # docker compose up --build -d
```

This starts:

| Service | Port | Notes |
|---|---|---|
| `backend` | `5000` | REST API (`GET /health` for a liveness check) |
| `rabbitmq` | `5672`, `15672` | Broker + management UI |
| `manager` | — | Runs the `priority_high` tier with 2 scraper slots |

MongoDB and Redis are **not** part of the compose file — point `MONGO_URI` and `REDIS_URL` at your own instances.

<details>
<summary><b>Backend environment variables</b></summary>

| Variable | Required | Description |
|---|---|---|
| `PORT` | | API port (default `5000`) |
| `MODE_NODE` | | `dev` for local logging |
| `BACKEND_URL` | ✅ | Public base URL of the API, used in verification-email links |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `RABBITMQ_URL` | ✅ | e.g. `amqp://user:pass@rabbitmq:5672` |
| `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` | ✅ | Credentials for the bundled RabbitMQ container |
| `JWT_SECRET` | ✅ | Signs the session cookie |
| `EMAIL_SECRET` | ✅ | Signs email-verification tokens |
| `JWT_VERIFICATION_SECRET` | ✅ | Signs/verifies site-ownership tokens |
| `BREVO_KEY` | ✅ | Brevo API key |
| `AI_API_KEY` | | Gemini API key (used by the report helper) |
| `QUEUE` | | Manager: this tier's own queue name (default `priority_low`) |
| `NEXT_QUEUE` | | Manager: tier to escalate an unfinished domain to (default `priority_medium`) |
| `INSTANCES` | | Manager: scrapers a single scan may claim (default `1`) |
| `LINK_LIMIT` | | Manager: max links checked per scan on this tier, `0` = unlimited (default `1`) |

> **Heads-up:** the bundled `manager` runs the `priority_high` tier, which only saves a scan once the crawl fully completes — it's the terminal tier in the chain, so it's not allowed to escalate further. With the default `LINK_LIMIT=1` a scan stops after the first few links, so add `LINK_LIMIT=0` to `backend/.env` to crawl a whole site. To run the full three-tier chain yourself, start additional Manager processes with `QUEUE=priority_low NEXT_QUEUE=priority_medium` and `QUEUE=priority_medium NEXT_QUEUE=priority_high`, each with a smaller `LINK_LIMIT` than the tier after it.

</details>

### 3. Scraper

Create `scraper/.env.local`:

```env
RABBITMQ_URL=amqp://<user>:<pass>@rabbitmq:5672
REDIS_PUBLIC_URL=redis://<host>:6379
```

Then:

```bash
cd scraper
make run-dev-local        # builds the image and joins the backend_default Docker network
```

Every scraper needs a **unique `INSTANCE_ID`** (the makefile passes `scraper-1`). To add capacity, start more containers with `scraper-2`, `scraper-3`, … — they can run on other machines as long as they can reach RabbitMQ and Redis. Raise the Manager's `INSTANCES` to let a scan use them.

<details>
<summary><b>Running without Docker</b></summary>

```bash
# API
cd backend && npm install && npm run dev

# Manager (separate terminal)
cd backend && npm run build
QUEUE=priority_high NEXT_QUEUE=none INSTANCES=1 LINK_LIMIT=0 node dist/workers/managers/index.js

# Scraper (separate terminal, with a .env containing the variables above)
cd scraper && npm install
INSTANCE_ID=scraper-1 npm run dev
```

`puppeteer` downloads Chromium during `npm install`. The Manager waits 15 s on boot to give RabbitMQ time to come up.

</details>

### 4. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

The API base URL is set in `frontend/src/api/instance.ts` (`http://localhost:5000/api/`), and the backend's CORS allow-list in `backend/src/server.ts` expects `http://localhost:5173`. Update both when deploying.

### 5. Try it

Register → click the link in the verification email → log in → add a site → trigger a scan.

## API

All routes are prefixed with `/api`. 🔒 = requires a verified session (the `token` cookie set by `/auth/login`).

| Method | Route | Body / Query | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{ username, email, password }` | Create an account and send a verification email |
| `GET` | `/auth/verify-email` | `?token=` | Confirm the email address |
| `POST` | `/auth/resend-verification` | `{ email }` | Resend the verification email |
| `POST` | `/auth/login` | `{ email, password }` | Log in and set the session cookie |
| `POST` | `/auth/logout` | — | Clear the session cookie |
| `GET` | `/auth/verifyAuth` 🔒 | — | Check the current session |
| `GET` | `/auth/user` 🔒 | — | Current user profile |
| `GET` | `/user/websites` 🔒 | — | Websites belonging to the current user |
| `POST` | `/website/addWebsite` 🔒 | `{ link }` | Add a site and discover its sitemap |
| `POST` | `/website/removeWebsite` 🔒 | `{ websiteID }` | Remove a site from the current user |
| `POST` | `/website/scanWebsite` 🔒 | `{ websiteID, force? }` | Queue a scan; returns the queue position |
| `POST` | `/website/verifyWebsite` 🔒 | `{ link, replace? }` | Verify domain ownership (see below) |

`GET /health` (unprefixed) returns `OK`.

### Ownership verification

The site owner hosts a plain-text file containing an HS256 JWT signed with `JWT_VERIFICATION_SECRET`, with claims `{ domain, websiteID, owner }`. Calling `verifyWebsite` with that file's URL makes the backend fetch it, confirm the token's domain matches the host serving it (ignoring `www.`), confirm the `websiteID` exists and the `owner` claim is the requesting user, and then record that user as the site's owner. Passing `replace: true` transfers ownership, but only to a user who was previously verified by the current owner.

## Data model

- **User** — `username`, `email` (unique), bcrypt-hashed `password`, `emailVerified`, `websites[]`
- **Website** — `domain`, `sitemapLinks[]`, `ownerID`, `verifiedUsers[]`, `checks[]` (`{ checkedLinks, aiReport, duration, checkedAt }`), per-tier `estimatedTime`, `options.authentication`

## Roadmap

Groundwork exists for these, but they aren't wired end-to-end yet:

- [ ] AI analysis and 1–10 rating of broken links (Gemini helper in `utils/genAI`)
- [ ] Emailed scan reports (`sendReport` in `utils/mail`)
- [ ] Scheduled recurring scans (`node-cron` stub in `utils/scheduler`)
- [ ] Extra scraper utilities: `eval_metadata`, `eval_schema`, `response_time`
- [ ] Crawling behind authentication (cookies / bearer token)
- [ ] Ownership-token issuance endpoint and frontend flow
- [ ] Dashboard: add-site flow and per-site results view
- [ ] Production compose file (`make run-deploy` expects `docker-compose.prod.yaml`)

## Deployment

The API, Manager, and scrapers are separate Docker images and only need to share RabbitMQ and Redis, so they can be spread across hosts. The reference deployment runs on Oracle Cloud Always Free VMs.