# Roost Backend

NestJS + Prisma + PostgreSQL implementation of the API behind the Roost FUTO
hostel reservation app. The full endpoint/field contract lives in
[`../BACKEND-API.md`](../BACKEND-API.md) and
[`../BACKEND-README.md`](../BACKEND-README.md) — those are the source of
truth; this doc covers how the backend itself is built, run, and deployed.

## Architecture

Five feature modules, each `controller` + `service` + `dto/`, wired together
in `app.module.ts`:

| Module | Owns |
|---|---|
| `auth` | Student register/login/me/logout, admin login, JWT issuing + guards |
| `hostels` | Browse/detail, with `bedsAvailable`/`status` computed live from reservations — never stored |
| `reservations` | Create (transactional bed assignment), list, detail, cancel |
| `payments` | Initiate, poll status, Remita webhook, mock-gateway simulate |
| `admin` | Occupancy stats, reservation listing + manual allocate, hostel/room CRUD |

Core flow: **register/login → browse hostels → reserve (holds a bed inside a
locked transaction) → pay (webhook or `/simulate`) → reservation flips to
`paid`**, at which point the allocation is final. `common/` holds the JWT
guards, the domain-exception → `{ error: { code, message } }` filter, and
shared utils (status thresholds, reference/RRR generation).

## Tech stack

- **NestJS** — module boundaries map cleanly onto the five feature areas above; Guards fit the student/admin role split.
- **Prisma + PostgreSQL** — the schema file doubles as living documentation of the data model; row-level locking (`SELECT ... FOR UPDATE`) handles the concurrent-bed-reservation race condition.
- **class-validator / class-transformer** — DTOs double as both request validation and Swagger schema source.
- **@nestjs/swagger** — served at `/api/docs`, generated from the same DTOs.
- **Deployed on Render**, database on **Supabase** Postgres.

## Quick start

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL / JWT_SECRET / REMITA_WEBHOOK_SECRET

npx prisma migrate dev --name init   # creates the schema
npm run prisma:seed                  # dev seed — see "Seeding" below

npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

Demo logins created by `prisma/seed.ts`:

| Account | Email / identifier | Password |
|---|---|---|
| Admin | `hosteladmin@futo.com` | `hosteladmin01` |

These credentials are for the local/demo seed. Production admin credentials
come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when `prisma:seed:prod` is run.

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `PORT` | no (default 3000) | HTTP port — Render sets this itself |
| `JWT_SECRET` | yes | Signs all student/admin tokens |
| `JWT_EXPIRES_IN` | no (default `7d`) | Token lifetime |
| `REMITA_WEBHOOK_SECRET` | yes | HMAC-SHA256 key for verifying `POST /payments/webhook/remita` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | only for `prisma:seed:prod` | Not read by the running app — one-off seed-script input |

## Data model

`Student`, `Admin`, `Hostel`, `Room` (a room *type*, not a physical room),
`Bed`, `Reservation`, `Payment`. The one non-obvious call: **beds are real
rows**, not a counter — each `Room` owns `bedsTotal` `Bed` rows numbered
`1..bedsTotal`. `bedsAvailable`/`status` are always derived live from active
reservations, never stored or manually decremented, so cancelling a
reservation frees its bed for free with no separate "restore" step.

## Business rules enforced

- **One active reservation per student** (`pending`/`reserved`/`paid`) — `409 ALREADY_HAS_ACTIVE` otherwise.
- **FCFS bed assignment inside a locked transaction** — `POST /reservations` takes a row lock on the target `Room`, so two students can't both win the last bed. The client's requested bed number is a preference; the server assigns the lowest free bed if it's taken.
- **Allocation confirmed only after payment** — a bed is *held* on reserve, *allocated* only when `Payment` flips to `paid` (via the Remita webhook or `POST /payments/:rrr/simulate`, see below).
- **Own-data-only access** — students get `403` on any reservation/payment that isn't theirs.
- 100-level/final-year priority (REQUIREMENTS.md §2) is surfaced as `studentLevel` on `GET /admin/reservations` for manual admin decisions, but isn't algorithmically enforced — reserving is instant/self-service, so there's no queue for a priority rule to act on.
- No reservation-hold expiry job — neither spec doc gives a hold duration, so a `pending` reservation blocks its bed until cancelled or paid/failed.
- Remita is fully mocked (FR8) — `RemitaService` only verifies the webhook's HMAC signature, there's no outbound call to a real Remita API. `POST /payments/:rrr/simulate` (student-authenticated) stands in for a real gateway page, since there isn't one to redirect to.

## Seeding: dev vs. production

Two separate scripts — **don't mix them up**:

- **`npm run prisma:seed`** (`prisma/seed.ts`) — **destructive**, wipes every table before reseeding. Demo/local use only: 8 hostels, filler reservations to match the demo's occupancy numbers, a demo student, an admin. Never run this against a database with real students in it.
- **`npm run prisma:seed:prod`** (`prisma/seed.production.ts`) — safe to rerun, never deletes anything. Seeds only the 8 hostels/rooms/beds (skipped if hostels already exist) and upserts one admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`. Never touches `Student`/`Reservation`/`Payment`.

## Deployment (Render + Supabase)

- **Supabase connection string**: use the *direct* connection or the pooler's session mode (port `5432`), not the transaction-mode pooler (`6543`) — Prisma's prepared statements don't work with PgBouncer transaction mode without extra config.
- **Build command**: `npm install && npx prisma generate && npm run build`
- **Start command**: `npx prisma migrate deploy && node dist/main` — safe to run on every boot, only applies pending migrations.
- Set the env vars from the table above in Render's dashboard (`ADMIN_EMAIL`/`ADMIN_PASSWORD` aren't needed by the running service, only for the one-off `prisma:seed:prod` run).
- There's no `/health` route yet — if Render's health check needs one, add it before relying on it.

## Project structure

```
prisma/
  schema.prisma
  seed.ts              # dev/demo seed — destructive
  seed.production.ts   # prod seed — safe to rerun
src/
  main.ts              # bootstrap, global prefix, Swagger, validation pipe
  app.module.ts
  prisma/               # PrismaService, global module
  common/                # guards, decorators, exceptions, filters, utils
  auth/
  hostels/
  reservations/
  payments/
  admin/
```
