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

### Cloud / Compute
- NorthMark Compute & Cloud

### AI
- Gemini API

### Hardware
- ESP32

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
Encounter data
      ↓
Tiger Data
      ↓
QuestGo application
      ↓
Quest generation / selection
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
