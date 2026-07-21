# Real-Time Property Rental, Maintenance & Amenity Management Platform

A full-stack web platform for centralizing rental, maintenance, and amenity
management with real-time updates. Built with **React + Vite + Tailwind CSS**
on the frontend and **Node.js + Express + MongoDB + Socket.io** on the backend.

## Features

- **Authentication** — register/login as Tenant, Owner, or Maintenance Staff (JWT-based)
- **Property Setup** — owners create a property at registration and can edit its details anytime from the "Property Settings" page
- **Maintenance Management** — create requests, track status (Pending / In Progress / Completed) in real time, owners/admins can assign staff. Tenants must have at least one amenity booking before they can submit a request.
- **Amenity Management** — view amenities, book time slots, automatic conflict prevention, check-in/check-out tracking; owners manage amenities via a dedicated "Manage Amenities" page. Only tenants/staff can book — owners/admins manage bookings only.
- **Private Messaging** — direct 1:1 chat strictly between the property owner and each individual tenant/staff member; no tenant/staff can see another's conversation
- **Dashboards** — live KPI overview (resolution time, completion rate, booking counts) updated via WebSockets
- **Role-based access** — tenants see their own requests/bookings; owners/staff can manage and update statuses; only owners/admins see Manage Amenities & Property Settings

## Tech Stack

| Layer      | Technology                              |
|------------|------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router, Axios, Socket.io-client |
| Backend    | Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, bcrypt |

## Project Structure

```
property-platform/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Route logic (auth, maintenance, amenities, bookings, dashboard)
│   ├── middleware/       # Auth guard, error handling
│   ├── models/           # Mongoose schemas
│   ├── routes/            # Express routers
│   ├── utils/             # JWT helper + seed script
│   ├── server.js          # App entry point (Express + Socket.io)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance + socket client
    │   ├── components/     # Reusable UI components
    │   ├── context/         # Auth context/provider
    │   ├── pages/            # Login, Register, Dashboard, Maintenance, Amenities
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env if needed (MONGO_URI, JWT_SECRET, etc.)
npm install
npm run seed     # optional: populates sample property, users, amenities, requests
npm run dev       # starts the API on http://localhost:5000
```

Seeded demo accounts (password: `password123`):

- `owner@example.com` — Property Owner
- `staff@example.com` — Maintenance Staff
- `tenant@example.com` — Tenant

### 2. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open `http://localhost:5173` in your browser. Log in with a seeded account,
or register a new one (owners create a new property; tenants/staff select an
existing property).

## How real-time updates work

The backend emits Socket.io events (`maintenance:created`, `maintenance:updated`,
`booking:created`, `booking:updated`) whenever data changes. The frontend
listens for these events on the Dashboard, Maintenance, and Amenities pages
and updates the UI immediately — no page refresh needed.

## Booking conflict prevention

When a booking is submitted, the backend:

1. Validates the requested time slot falls within the amenity's operating hours.
2. Counts existing (non-cancelled) bookings for that amenity/date that overlap
   the requested time range.
3. Rejects the booking with a `409 Conflict` if the overlap count would exceed
   the amenity's capacity.

This guarantees zero double-bookings, matching the KPI target of **0 amenity
booking conflicts**.

## Private messaging

Direct messages are only allowed between the property owner/admin and one of
their own tenants or staff — never between two tenants, two staff members, or
across properties. This is enforced twice:

1. **REST API** — `sendMessage`/`getConversation` reject any pairing that
   isn't (owner ↔ tenant) or (owner ↔ staff) on the same property, with a
   `403`.
2. **Real-time delivery** — each client "identifies" its socket connection
   with its user ID on login, joining a private Socket.io room named after
   that ID. New messages are emitted only `.to(senderId).to(receiverId)`, so
   no other connected user's browser ever receives the event — not just
   hidden in the UI, but never sent to them at all.

## Booking-gated maintenance requests

Tenants must have booked at least one amenity before they're allowed to
submit a maintenance request (`AmenityBooking.exists({ bookedBy: tenantId })`
is checked server-side). The frontend mirrors this by disabling the "+ New
request" button and showing a hint until the tenant has a booking on record.
Owners are exempt from this rule.

## Maintenance request workflow (owner-first routing)

Every new request goes to the **owner first** — staff never see it until the
owner explicitly assigns it:

1. Tenant raises a request → it's created **unassigned**.
2. Only the **owner/admin** (and the tenant who raised it) can see it. A
   staff member's `GET /api/maintenance` is filtered to
   `assignedTo: myUserId`, so an unassigned request simply isn't in their
   list — and the real-time `maintenance:created` event is only emitted to
   the owner's and requester's private socket rooms, so it's not just
   hidden in the UI, staff never receive the event at all.
3. Owner assigns it to a staff member → **now** that staff member can see
   and update it, and gets a real-time `maintenance:assigned` notification.
4. If reassigned or unassigned again, the previous staff member's list
   updates in real time to remove it.

This mirrors the same "no third party sees it" approach used for private
messaging, applied to the maintenance queue.

## Role-specific dashboards

Each role sees a genuinely different dashboard, not the same widgets with
different data:

- **Tenant** — their own request status breakdown, their own booking counts,
  and quick actions to raise a request or book an amenity.
- **Staff** — only their *assigned* task counts and average resolution time
  for their own completed tasks, plus a quick link into their task list.
- **Owner/Admin** — the full property-wide picture, plus a highlighted
  "N requests waiting to be assigned" banner that links straight into the
  Maintenance page — this is the one dashboard that surfaces the
  assignment queue.

## Performance: response time ≤ 2 seconds (KPI)

Two things make this measurable rather than just assumed:

1. **`middleware/responseTime.js`** wraps every request, adds an
   `X-Response-Time` response header, and logs a `[SLOW >2000ms]` warning to
   the console if any request exceeds the target — so regressions are
   visible immediately during development, not just guessed at.
2. **`npm run benchmark`** (in `backend/`) hits key endpoints several times
   and reports pass/fail against the 2000ms target:
   ```bash
   cd backend
   npm run dev          # in one terminal
   npm run benchmark     # in another
   ```
   By default it only benchmarks public endpoints (`/`, `/api/properties`).
   To also benchmark protected ones, log in via the API/UI, copy the JWT,
   and run:
   ```bash
   BENCHMARK_TOKEN=your_jwt_here npm run benchmark
   ```
   Sample output:
   ```
   PASS  GET  /                            avg=7.5ms   max=18.6ms
   PASS  GET  /api/properties              avg=1.6ms   max=2.1ms
   Overall: All endpoints within target ✅
   ```

Supporting this, MongoDB indexes were added on the fields queries filter by
most often (`property`+`status` and `requestedBy`/`assignedTo` on
maintenance requests; `bookedBy`/`bookingDate` on bookings; `property` on
amenities), so lookups stay fast as data grows rather than degrading into
full collection scans.

## Amenity "Availability Status"

Amenities now carry a real `availabilityStatus` field (`Available` /
`Unavailable`), separate from the dynamic per-slot conflict check:

- **Per-slot availability** (already existed) — computed dynamically by
  checking existing bookings against the requested date/time, so it changes
  slot-by-slot.
- **Overall availability status** (new) — a manual switch the owner
  controls from the Manage Amenities page, e.g. to mark an amenity "closed
  for maintenance." While `Unavailable`, **all** new bookings are rejected
  server-side (`400`), regardless of whether a specific slot would
  otherwise be free, with an optional reason shown to tenants/staff.

`PUT /api/amenities/:id/availability` (owner/admin only) toggles it, and the
change broadcasts in real time (`amenity:updated`) so the Amenities page
updates for everyone immediately.

## API Overview

| Method | Endpoint                         | Description                          |
|--------|-----------------------------------|---------------------------------------|
| POST   | `/api/auth/register`              | Register a new user                   |
| POST   | `/api/auth/login`                 | Log in                                |
| GET    | `/api/auth/me`                    | Get current user                      |
| GET    | `/api/properties`                 | List properties                       |
| POST   | `/api/properties`                 | Create a property (owner/admin)       |
| PUT    | `/api/properties/:id`              | Update property details (its owner/admin) |
| GET    | `/api/maintenance`                 | List maintenance requests             |
| POST   | `/api/maintenance`                 | Create a maintenance request          |
| PUT    | `/api/maintenance/:id/status`      | Update request status (staff/owner)   |
| PUT    | `/api/maintenance/:id/assign`      | Assign staff to a request             |
| GET    | `/api/amenities`                   | List amenities                        |
| POST   | `/api/amenities`                   | Create an amenity (owner/admin)       |
| GET    | `/api/amenities/:id`               | Amenity details + bookings for a date |
| PUT    | `/api/amenities/:id/availability`  | Toggle overall availability (owner/admin) |
| GET    | `/api/bookings`                    | List bookings                         |
| POST   | `/api/bookings`                    | Create a booking (conflict-checked)   |
| PUT    | `/api/bookings/:id/status`         | Update booking status                 |
| GET    | `/api/dashboard/overview`          | KPI overview for dashboards           |
| GET    | `/api/users`                       | List users by role/property (owner/admin) |
| GET    | `/api/messages/conversations`      | List people you're allowed to message |
| GET    | `/api/messages/:partnerId`         | Get message history with one person   |
| POST   | `/api/messages`                    | Send a private direct message         |

## Out of Scope (Phase 1)

- Native mobile apps
- Online rental payments
- AI-based predictive maintenance
- IoT-based smart property integrations

These are captured under **Future Enhancements** for later phases.

## License

Built for educational/demo purposes as part of a learning project brief.
