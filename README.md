# Huginn Website

Bilingual web portal and public REST API: accounts, API keys, task history,
and a prepaid wallet. Built with Next.js 16, React 19, Fastify 5, Prisma, and
PostgreSQL. The solver runs in a separate private service.

## Run as part of Huggin

This repository is the `website/` submodule of [Huggin](https://github.com/moreveal/huggin).
Run its Compose stack from the parent checkout. The same built images work locally
and behind Cloudflare; configure the external address with `APP_ORIGIN`.
The gateway routes `/api/*` at runtime, so the web image has no compiled backend URL.
API and task workers run as separate processes.

## Standalone development

Requires Node.js 22.21+ and PostgreSQL:

```sh
npm ci
cp .env.example .env
npm run db:generate
npm run db:local
```

On Windows use `Copy-Item .env.example .env`. Leave PostgreSQL running, then
in another terminal:

```sh
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000). For an existing database set
`DATABASE_URL` and skip `db:local`. `APP_ORIGIN` must match the browser URL.
For a direct built Next.js server, set `API_INTERNAL_URL` before `npm run build`,
then use `npm start` to run web, API, and worker.

## API and billing

The solver contract is 2Captcha-compatible JSON: `POST /api/createTask`,
`POST /api/getTaskResult`, and `POST /api/getBalance`, with `clientKey`, nested `task`, `errorId`, `taskId`,
`processing` / `ready`, and `solution.gRecaptchaResponse`. See `/docs` for the
contract and matching Python/JavaScript examples, including hCaptcha proxy and
Enterprise fields.

Create API keys in the account workspace. Keys have no expiry and stay valid until
manually revoked. Their secrets appear once and are stored only as hashes.
Every solver method validates `clientKey`; tasks and billing belong to its account.
The private solver uses a separate service-to-service secret.

The prepaid wallet uses integer microdollars: reserve on creation, settle
on token delivery, refund on failure. New accounts start at zero.
Parent Compose connects the private
Mimic adapter; standalone defaults disable integrations. Crypto checkout still
requires a real payment adapter. Only a signed payment confirmation credits funds.

Edit task types and their rates, top-up limits, and payment credentials in `/app/admin`, without a
restart. Access is granted only in PostgreSQL: set `User.isAdmin=true` for an
existing account. Payment secrets are encrypted, write-only, and versioned for
pending invoices. `TASK_PRICE_MICRO_USD` / `PAYMENT_*` seed the DB once;
subsequent configuration is stored in the DB. See the operations guide for setup.

Administration includes overall and per-user analytics, task filters, and
interactive solve reports with rounds, images, action evidence, timing, and model
usage. Evidence follows the private solver's retention period; older tasks without
telemetry remain unclassified. Reports and images require a current admin session.

Configuration, integration contracts, retention, and deployment:
[operations guide](docs/operations.md) and [.env.example](.env.example).

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run test:integration
```

Integration tests require PostgreSQL and use a temporary schema with synthetic
providers. Brand attribution: [sources](public/images/brands/SOURCES.md).
The Huginn logo in `public/images/brand/huginn-logo-v1.png` was supplied by the project owner.
