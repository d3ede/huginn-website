# Huginn Website

Web portal and public REST API for Huginn: a bilingual landing page, user accounts,
API keys, task history, and prepaid billing. Built with Next.js 16, React 19,
Fastify 5, Prisma, and PostgreSQL.

![Huginn landing page](docs/screenshots/landing.png)

The solver engine and payment processor are external integrations. Both are
disabled by default: new accounts start with zero balance, and unavailable
operations return `503`. This repository does not include a solver.

## Development

Requires Node.js 22.21+ and PostgreSQL.

```sh
npm ci
cp .env.example .env
npm run db:generate
npm run db:local
```

On Windows, use `Copy-Item .env.example .env`. Keep the local database running;
in another terminal, run:

```sh
npm run db:migrate
npm run dev
```

Open [localhost:3000](http://localhost:3000). For an existing database, set
`DATABASE_URL` and skip `db:local`. `APP_ORIGIN` must match the browser URL.

## API and integrations

The public API uses `/api/v1` and Bearer API keys: `GET /balance`, `POST /tasks`,
and `GET /tasks/:id`. Task creation supports `Idempotency-Key`; the full contract
and Python/JavaScript examples are available at `/docs`.

Billing uses integer microdollars: reserve on creation, charge on success, refund
on failure. Configure solver and payment adapters through [.env.example](.env.example).
Integration contracts and deployment details: [operations guide](docs/operations.md).

## Production and checks

Set `API_INTERNAL_URL` before building; Next.js forwards `/api/*` to that backend.
Production requires HTTPS, production secrets, and `DEMO_MODE=false`.

```sh
npm run db:migrate
npm run build
npm start
```

Checks: `npm test`, `npm run typecheck`, `npm run build`, and
`npm run test:integration` (requires PostgreSQL; uses an isolated temporary schema).

Asset attribution: [brand sources](public/images/brands/SOURCES.md).
