# Shared Bill Splitter

A small full-stack shared-home bill splitter. The API runs on Hono and Cloudflare Workers, persists data in Cloudflare D1 (SQLite), and the web client uses React, Vite, TanStack Router, and TypeScript.

## Requirements

- Node.js 20 or newer
- pnpm 10
- Cloudflare Wrangler local development (installed through the API package)

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173>. The web app starts with a local demo home setup flow. The API is available at <http://localhost:8787>; `GET /api/health` returns `{ "status": "ok" }`.

Wrangler creates and migrates the local D1 database when the API starts. To apply migrations manually:

```bash
pnpm --filter bill-splitter-api db:migrate:local
```

## Checks

```bash
pnpm test
pnpm check
pnpm typecheck
pnpm build
```

## API

- `POST /api/homes`
- `GET /api/homes/:homeId`
- `POST /api/homes/:homeId/members`
- `POST /api/homes/:homeId/bills`
- `GET /api/homes/:homeId/bills`
- `GET /api/homes/:homeId/balances`
- `POST /api/bills/:billId/shares/:shareId/pay`

All API errors use `{ "error": "message" }`. Money is represented only as integer cents.

## Decisions

1. **Store money as integer cents.** Integer arithmetic avoids floating-point rounding errors and makes the split sum exact.
2. **Use conditional database updates for payment.** A payment is accepted only when `paid_at IS NULL`; this makes concurrent attempts safe. The idempotency key is persisted on the share so a retry with the same key returns the original result.
3. **Use SQLite constraints as a second line of defence.** Foreign keys, uniqueness, and `CHECK` constraints protect relationships and valid values even if a request handler has a bug.

## Notes

This is an implementation scaffold designed to be copied into the assignment's GitHub template. If the provided template has additional starter conventions or test-specific interfaces, retain those files and reconcile the corresponding configuration before submission. Do not submit without running the assignment's original visible tests.
