# BookEase

A full-stack appointment booking platform: customers pick a service and a time, pay online with Stripe, and receive email confirmations; the business manages everything from a role-protected admin dashboard.

**Stack:** .NET 8 Web API (Clean Architecture) · EF Core + SQLite (PostgreSQL-ready) · JWT + refresh tokens · Stripe.net · MailKit · React 18 + TypeScript + Vite · Tailwind + shadcn-style components · TanStack Query · React Hook Form + Zod · Recharts · Docker · GitHub Actions.

## Features

- **Availability engine** - working hours, time off, buffers, minimum notice, maximum advance and slot step. All times are stored in UTC and shown in the business time zone, with DST handled.
- **Double-booking prevention in three layers** - a per-staff in-process lock, a transactional re-check, and a filtered unique index in the database. A losing request gets a clean `409 Conflict`. A concurrency test fires 12 parallel requests and asserts exactly one wins.
- **10-minute pending hold** - a booking is `Pending` until payment succeeds; a background worker releases expired holds.
- **Stripe payments** - PaymentIntents, a webhook with signature verification and idempotency (processed event ids are stored), booking confirmed only after payment, automatic refund on eligible cancellations, and automatic refund if a payment lands after the hold expired.
- **Emails** - confirmation, cancellation, 24 h reminder, admin notification. HTML templates, an outbox table, and a retry worker with backoff.
- **Customer app** - landing, services, booking wizard (service > specialist or "any" > date/time > details > pay > confirmation), register/login, my bookings, cancel and reschedule with a configurable free-cancellation window.
- **Admin dashboard** - overview cards, day/week calendar, bookings table (search, filter, sort, paging, CSV export), CRUD for services, staff, weekly working hours and time off, booking actions (confirm, cancel, complete, no-show), charts (revenue, top services, busiest hours), audit log, business settings.
- **Roles** - `Admin` (everything), `Staff` (own bookings and calendar only), `Customer`.
- **Non-functional** - ProblemDetails errors, FluentValidation on every endpoint, rate limiting on auth endpoints, CORS, PBKDF2-SHA512 password hashing (210k iterations), refresh-token rotation with reuse detection, Serilog without sensitive data, security headers, `/health`.

## Quick start (Docker)

```bash
cp .env.example .env          # then set JWT_KEY to a long random string
docker compose up --build
```

| What | URL |
|---|---|
| Web app | http://localhost:8080 |
| API + Swagger | http://localhost:5080/swagger |
| Mailpit (all outgoing email) | http://localhost:8025 |

The database is seeded on first start. With no Stripe keys set, the app uses **simulated payments**, so the whole flow works offline.

## Run locally (no Docker)

Requires .NET 8 SDK and Node 20+.

```bash
# API  -> http://localhost:5080   (Development profile: seed data, Swagger, dev JWT key, simulated payments)
dotnet run --project backend/src/BookEase.Api

# Web  -> http://localhost:5173   (proxies /api to the API)
cd frontend && npm install && npm run dev
```

For emails locally, run Mailpit (`docker run -p 8025:8025 -p 1025:1025 axllent/mailpit`) - the Development SMTP default is `localhost:1025`.

### Tests and build

```bash
dotnet test backend/BookEase.sln # unit + integration (WebApplicationFactory)
cd frontend && npm run build     # type-check + production build
```

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `Admin123!` |
| Customer | `customer@demo.com` | `Customer123!` |
| Staff (Emma Collins) | `staff@demo.com` | `Staff123!` |

Seed data: "Serenity Wellness Studio" (America/New_York, USD), 5 services, 3 staff with weekly hours, ~60 sample bookings between -28 and +14 days with payments, and one time-off day.

## Payments

**Simulated (default for the demo).** With `Stripe__SecretKey` empty and `Payments__AllowDemo=true`, the pay step shows a "Simulate payment" button that triggers the same code path as a real webhook.

**Real Stripe test mode.**

1. Put your test keys in `.env` (`STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_PUBLISHABLE_KEY=pk_test_...`). The embedded Stripe Elements form then appears.
2. Forward webhooks to the API:
   ```bash
   stripe listen --forward-to localhost:5080/api/payments/webhook
   ```
   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the API.
3. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC. (`4000 0000 0000 9995` simulates a decline.)

Simulated payments are refused when a Stripe secret key is configured, and refused entirely unless `Payments:AllowDemo` is true, so they cannot leak into production.

## Configuration

All settings are standard ASP.NET configuration and can be overridden by environment variables using `__` (e.g. `Jwt__Key`). See `backend/src/BookEase.Api/appsettings.json`.

| Key | Purpose |
|---|---|
| `Jwt:Key` | **Required** outside Development, at least 32 chars |
| `ConnectionStrings:Default`, `Database:Provider` | `Sqlite` (default) or `Postgres` |
| `Seed:Enabled` | Insert demo data on startup |
| `Stripe:*`, `Payments:AllowDemo` | Payments |
| `Smtp:*` | Email server |
| `Booking:HoldMinutes`, `Booking:ReminderHoursBefore` | Hold and reminder timing |
| `Cors:AllowedOrigins`, `App:FrontendUrl` | Browser access and links in emails |
| `BackgroundJobs:Enabled` | Turn the workers off (tests do) |

Business rules edited at runtime in **Admin > Settings**: time zone, currency, free-cancellation window, minimum notice, maximum advance, slot interval.

### Switching to PostgreSQL

```
Database__Provider=Postgres
ConnectionStrings__Default=Host=...;Database=bookease;Username=...;Password=...
```

The committed EF migration targets SQLite. For other providers the app creates the schema with `EnsureCreated` on first start; to use migrations with PostgreSQL, generate a provider-specific migration set (`dotnet ef migrations add Initial_Pg ...`).

## Architecture

```
backend/
  BookEase.sln
  src/
    BookEase.Domain          entities, enums, booking state machine (no dependencies)
    BookEase.Application     use cases, DTOs, validators, availability engine, abstractions
    BookEase.Infrastructure  EF Core, security, Stripe, MailKit, background workers
    BookEase.Api             controllers, middleware, DI composition
  tests/BookEase.Tests       unit + integration tests
frontend/                    React SPA
```

Dependencies point inwards. The Application layer defines interfaces (`IPaymentGateway`, `IEmailSender`, `IClock`, ...) that Infrastructure implements. It uses EF Core directly through `IAppDbContext` instead of a repository layer (see assumptions).

## Assumptions

- **One business per deployment** (single tenant). Multi-tenancy would add a `BusinessId` to every entity.
- **Business time zone is authoritative.** Working hours are interpreted in it; customers see times in it (shown to them as such) rather than their browser zone.
- **A specialist can hold one booking at a time** (buffer included); different specialists run in parallel, and a customer may book several of them at the same time.
- **Cancellation policy:** customers may cancel any time before the start, but are refunded, and may reschedule, only when more than the configured window (default 24 h) remains. Admin/staff cancellations can choose to refund regardless.
- **Free services** (price 0) skip payment and are confirmed immediately.
- **Payments are in one currency** (the business currency); amounts are stored as integer cents.
- **"Any specialist"** assigns the first free eligible specialist for the chosen slot.
- **Staff users** are linked to a staff record (`Staff.UserId`) and see only their own calendar and bookings.
- **SQLite is the default** so the project runs with zero setup. It is fine for a single instance; use PostgreSQL for several.
- **No SMS, no multi-location, no recurring appointments, no customer-facing time-zone switch** - out of scope.

## Trade-offs worth knowing

- The access token lives in memory and the refresh token in `localStorage`. This survives page reloads and is simple, but is exposed to XSS; a production hardening step is an `HttpOnly` cookie for the refresh token.
- The per-staff lock is in-process. It removes contention on a single instance; correctness across instances relies on the database unique index (the loser gets a 409). Background workers assume a single API instance, so scale them out only with a distributed lock.
- Stripe events are deduplicated by event id, and a payment arriving after expiry is refunded rather than silently accepted.

## CI

`.github/workflows/ci.yml` builds and tests the API and builds the web app on every push and pull request.
