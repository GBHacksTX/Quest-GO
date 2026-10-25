# QuestGo Architecture

## 1. System Overview

QuestGo turns physical proximity into shared real-world activities.

Core flow:

```text
Nearby QuestGo devices
        ↓
Proximity encounter detected
        ↓
Encounter recorded
        ↓
QuestGo application receives encounter
        ↓
Shared quest created
        ↓
Both users receive the same quest
        ↓
Both accept
        ↓
Activity completed
        ↓
Both verify completion
        ↓
Streak / engagement updated
```

---

## 2. Current Technology Stack

This section represents the **current implementation**, not permanent architectural requirements.

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

Step 1 implements a Next.js App Router application in `src/app`, with strict
TypeScript and Tailwind via PostCSS. Development and builds use the bundled
Webpack option because Turbopack worker port binding failed in the local execution
environment. The landing page is rendered on the server;
only the sample quest-card reveal is a client component. Illustrations and motion
use CSS, and typography uses system fonts. The preview has no persistence or
external service calls. See `PRODUCT.md` for current behavior and
`INTEGRATIONS.md` for access and verification status. The remaining stack below
is planned and is not yet integrated.

### Authentication
- Auth.js
- Google OAuth
- Meta / Facebook OAuth

### Database
- Tiger Data
- PostgreSQL

The MVP repository uses normalized entity identities and relationships with typed JSON payloads, through `pg` and versioned SQL migrations. A separate built-in SQLite store supports the explicitly labeled demo without live credentials. It does not replace production PostgreSQL. All domain transitions are transactional. See `DATABASE.md` for the schema and concurrency limits.

### Cloud / Compute
- NorthMark Compute & Cloud

### AI
- Gemini API

Gemini optionally writes activity text from validated preference and place context. OpenStreetMap Overpass supplies venue identities and locations; Nominatim resolves manually entered areas. No extra places API key is required. Venue lookup and AI calls have timeouts and a deterministic free fallback. Unknown prices remain unknown, and payments/bookings stay outside QuestGo. See `INTEGRATIONS.md` for public-service limits and verification status.

### Hardware
- ESP32

### Integration decisions

- ESP32 firmware is supplied by a teammate and reports over Wi-Fi to authenticated Next.js hardware routes. Each provisioned device has its own firmware key and separate user pairing code. `HARDWARE.md` defines the software contract; the teammate must connect and verify the actual firmware.
- Encounter discovery may require the website to remain open while a user is available. Background notifications are outside the MVP.
- Real nearby venues and potentially paid activities use OpenStreetMap data, browser coordinates or manual area entry, and optional Gemini activity text. Prices and access must be checked with venues. Provider failures are visible and fall back to a free activity.
- Both Google and Facebook remain required login providers. See `PRODUCT.md` for the confirmed scope and proposed journey awaiting review.

> The stack may change during development. Update this file whenever a major technology or architectural decision changes.

---

## 3. System Components

### Hardware Layer

Responsible for detecting nearby QuestGo devices and producing proximity/encounter information.

The hardware layer should expose only the information required by the software system.

Typical encounter information:

```text
device_a
device_b
timestamp
optional proximity data
```

Hardware-specific implementation details should remain isolated from the application whenever possible.

### Application Layer

The QuestGo application is responsible for:

- user accounts
- device-to-user association
- user preferences
- encounter processing
- quest creation
- quest acceptance
- activity completion
- mutual verification
- streaks
- activity history

### Database Layer

Tiger Data is the current persistent data store.

Expected data domains include:

- Users
- Devices
- Encounters
- Quests
- Quest participants
- Preferences
- Completion state
- Streaks

Detailed schema belongs in `DATABASE.md`.

### Authentication Layer

Users authenticate through external OAuth providers.

Current providers:

- Google
- Meta / Facebook

QuestGo does not store user passwords.

Authentication establishes the user's identity; QuestGo-specific profile information is stored separately in the application database.

### AI Layer

Gemini is currently used for quest generation.

AI should generate activities from available context such as:

- activity mode
- interests
- available time
- budget
- relevant encounter context

AI should not be used where simple deterministic application logic is sufficient.

---

## 4. Core Data Flow

```text
ESP32 devices
      ↓
Authenticated Next.js hardware endpoint
      ↓
Tiger Data / PostgreSQL encounter transaction
      ↓
OpenStreetMap venue lookup + optional Gemini activity text
      ↓
One persisted quest and shared session
      ↓
Shared quest state
   ↙             ↘
User A          User B
   ↘             ↙
Accept / Complete
      ↓
Tiger Data
      ↓
Streak / history update
```

---

## 5. Product Invariants

Regardless of implementation:

1. A physical proximity event can create a QuestGo encounter.
2. Both participants in an encounter must reference the same quest.
3. A quest does not begin until the required participants accept it.
4. Completion requires confirmation from both participants.
5. A verified completion may update streaks and engagement data.
6. Duplicate proximity events should not repeatedly create identical encounters.

---

## 6. Architecture Principles

- Prefer the simplest implementation that supports the hackathon demo.
- Avoid unnecessary services and infrastructure.
- Keep hardware concerns separate from application concerns.
- Keep application state in a clear source of truth.
- Do not duplicate business logic across multiple layers.
- Avoid premature optimization.
- Avoid architecture designed for hypothetical future scale.
- Major architectural changes must be documented here.

---

## 7. Current MVP Boundary

The MVP must demonstrate:

```text
Two devices become nearby
        ↓
Encounter is detected
        ↓
Both users receive one shared quest
        ↓
Both accept
        ↓
Both complete and verify
        ↓
Streak updates
```

Anything beyond this flow is secondary until the core experience works reliably.

---

## 8. Future Architecture

Potential future capabilities may include:

- multi-device encounters
- group quests
- richer location context
- push notifications
- native mobile applications
- recommendation history
- social connections
- rewards and achievements

These should not influence the MVP architecture unless explicitly required.

## MVP verification and deployment

The complete application is at `/explore`. A Node production build and local production runtime are verified. `DEPLOYMENT.md` covers Node hosting and an optional Docker image; NorthMark access and physical hardware verification remain external. `next-env.d.ts` is generated by Next.js and is intentionally ignored/untracked, as required by the installed Next.js guide, so development and production type generation do not dirty feature branches. Application source added during the MVP is formatted for readable handoff.
