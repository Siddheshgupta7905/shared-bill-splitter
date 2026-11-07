# Shared Bill Splitter

A full-stack application for managing shared household expenses. Users can create homes, add members, split bills equally and track individual payments.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, TanStack Router
- **Backend:** Hono, Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Testing:** Vitest
- **Code Quality:** Biome
- **Package Manager:** pnpm

## Features

- Create homes and add members.
- Create bills and automatically split them among members.
- Distribute remainder cents in member insertion order.
- Record individual payments.
- Prevent duplicate payments using idempotency keys.
- Calculate outstanding balances.
- Handle API errors and loading states.

## Getting Started

**Prerequisites:** Node.js 20+ and pnpm.

Install dependencies:

```bash
pnpm install
```

Start the application:

```bash
pnpm dev
```

Frontend: http://localhost:5173

Backend: http://localhost:8787

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/homes` | Create a home |
| POST | `/api/homes/:homeId/members` | Add a member |
| POST | `/api/homes/:homeId/bills` | Create and split a bill |
| POST | `/api/bills/:billId/shares/:shareId/pay` | Pay a share |
| GET | `/api/homes/:homeId/balances` | Get outstanding balances |

## Design Decisions

1. **Integer-based money handling:** Store amounts in cents to avoid floating-point precision errors.
2. **Idempotent payments:** Use conditional database updates and idempotency keys to prevent duplicate payments and handle concurrent requests.
3. **Database constraints:** Use foreign keys, CHECK constraints and UNIQUE constraints to maintain data integrity.


Author
Siddhesh Gupta
