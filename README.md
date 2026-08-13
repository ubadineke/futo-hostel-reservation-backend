# Roost Backend

NestJS + Prisma + PostgreSQL implementation of the API described in
[`../BACKEND-API.md`](../BACKEND-API.md) and [`../BACKEND-README.md`](../BACKEND-README.md).

## Setup

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET / REMITA_WEBHOOK_SECRET

npx prisma migrate dev --name init   # creates the schema
npm run prisma:seed                  # seeds the 8 hostels + demo student + admin

npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

Demo logins (see `prisma/seed.ts`), password `Password123` for both:
- Student: reg no `20211274242` or `nwakanma.dominion.20211274242@futo.edu.ng`
- Admin: `admin@futo.edu.ng`

## Notable design decisions

- **Beds are physical rows**, not just a counter: each `Room` (a room *type*)
  owns `bedsTotal` `Bed` rows numbered `1..bedsTotal`. Availability is always
  derived from live reservation state, never stored/decremented by hand — a
  cancelled reservation frees its bed automatically.
- **Reservation creation is transactional** and takes a `SELECT ... FOR UPDATE`
  lock on the target `Room` row, so two students racing for the same room's
  last bed can't both win it.
- **Registration only collects `{identifier, password}`** per the documented
  contract, so `Student.name/dept/level` are nullable — populated when the
  identifier is a school email (which encodes `surname.firstname.regno`) and
  left null when it's a bare reg number. There's no "complete your profile"
  endpoint; add one if the product needs it.
- **Priority for 100-level/final-year students** (REQUIREMENTS.md §2) is
  exposed as `studentLevel` on `GET /admin/reservations` for the admin to act
  on, but isn't algorithmically enforced in `POST /reservations` — reserving
  is instant/self-service, so there's no queue for a priority rule to apply
  to. Flag if you want a concrete priority-queueing mechanism designed.
- **Remita is mocked**, per FR8. `RemitaService` only verifies an HMAC-SHA256
  signature (`x-remita-signature` header, shared secret
  `REMITA_WEBHOOK_SECRET`) on the inbound webhook; there's no outbound call to
  a real Remita merchant API. Since there's no real gateway page to redirect
  the app to, `POST /payments/:rrr/simulate` (student-authenticated, body
  `{ outcome?: "success" | "failed" }`, default `"success"`) stands in for it —
  this is what the app should call instead of its current
  `Future.delayed(1600ms)` fake. The HMAC webhook still exists alongside it
  for when a real Remita integration replaces the mock.
- **No reservation-hold expiry job** — neither doc specifies a hold duration,
  so a `pending` reservation blocks its bed until cancelled or paid/failed.
