# QuestGo Domain Model

## 1. Purpose

This document describes QuestGo's current domain model: the important concepts in the product, what they mean, how they relate, and how their state may change.

This is a **living document**.

It represents the current best understanding of the product and should evolve as QuestGo evolves.

The domain model must not prevent legitimate product changes.

When a new requirement exposes a weakness in the current model, improve the model and update this document alongside the implementation.

Do not add speculative complexity for features that do not currently exist.

---

## 2. Domain Principles

The domain model should:

- represent product concepts rather than implementation details
- avoid unnecessary coupling to a specific database
- avoid unnecessary coupling to a specific framework
- make current behavior clear
- allow reasonable future extensions without major rewrites
- remain simple enough for the hackathon team to understand

Objects described here do not necessarily correspond one-to-one with database tables.

---

## 3. Current Core Model

```text
User
  │
  ├── owns / uses
  ↓
Device

Device
  │
  └── participates in proximity detection
              ↓
          Encounter
              ↓
        QuestSession
         /       \
        ↓         ↓
Participant   Participant
        \         /
         \       /
           Quest
              ↓
        Completion
              ↓
      Engagement / Streak
```

This diagram represents the current conceptual model and may evolve.

---

# 4. User

A `User` represents a person participating in QuestGo.

A user is the human identity within the QuestGo product.

Potential properties include:

```text
id
displayName
email
profile information
preferences
createdAt
```

Authentication provider details are implementation concerns and should not define the user's identity within the domain.

A user may authenticate through different providers while remaining the same conceptual QuestGo user.

### Relationships

A user may have:

```text
User
├── Devices[]
├── Preferences
├── QuestParticipations[]
├── EncounterHistory[]
└── Engagement / Streak data
```

Do not assume permanently that one user has exactly one device.

---

# 5. Device

A `Device` represents a physical or software endpoint associated with a QuestGo user that can participate in proximity or interaction detection.

Current examples may include an ESP32.

Future implementations could use other device types.

Potential properties:

```text
id
owner
type
externalIdentifier
status
createdAt
```

### Important Rule

The user and device are separate concepts.

Avoid:

```text
User
└── esp32Id
```

Prefer conceptually:

```text
User
└── Devices[]
      └── Device
```

This allows device behavior to evolve without redefining a user.

---

# 6. Encounter

An `Encounter` represents the system recognizing that relevant QuestGo devices or participants have come into proximity.

An encounter is not itself a quest.

It represents the event that may cause a social interaction to begin.

Potential properties:

```text
id
detectedAt
participants/devices involved
proximity information
status
```

Possible future states may include:

```text
detected
processed
ignored
expired
```

Exact states should only be introduced when implementation requires them.

### Encounter Rules

- repeated hardware signals should not automatically create unlimited duplicate encounters
- one encounter may lead to a QuestSession
- an encounter does not necessarily guarantee that a quest must be started
- encounter processing rules may evolve

Do not encode the assumption that an encounter always contains exactly two people if doing so would make planned multi-user support unnecessarily difficult.

---

# 7. Quest

A `Quest` represents the activity itself.

Examples:

```text
Take a 10-minute walk together.

Find something nearby neither of you has noticed before.

Take a five-minute work break and discuss one thing you are currently building.
```

A quest describes **what participants are being asked to do**.

Potential properties:

```text
id
title
description
mode
estimatedDuration
cost information
generation metadata
```

A `Quest` should not contain participant-specific acceptance or completion state.

Those belong to the session in which the quest is being performed.

---

# 8. QuestSession

A `QuestSession` represents a specific instance of people attempting a quest together.

This separates:

```text
Quest = activity definition

QuestSession = actual shared experience
```

For example, the quest:

```text
Take a 10-minute walk together
```

could be performed thousands of times by different groups.

Each group gets its own `QuestSession`.

Potential properties:

```text
id
quest
encounter
status
createdAt
startedAt
completedAt
```

Possible conceptual lifecycle:

```text
created
   ↓
waiting_for_acceptance
   ↓
active
   ↓
completed
```

Other states such as:

```text
declined
cancelled
expired
```

should be added only when product behavior requires them.

---

# 9. Participant

A `Participant` represents a user's involvement in a particular `QuestSession`.

This object prevents the session from being designed around fixed fields such as:

```text
user1
user2
```

Instead:

```text
QuestSession
└── Participants[]
```

Potential participant state:

```text
user
accepted
acceptedAt
completed
completedAt
```

Current example:

```text
QuestSession
├── Participant A
└── Participant B
```

Possible future example:

```text
QuestSession
├── Participant A
├── Participant B
├── Participant C
└── Participant D
```

This does not mean group quests need to be implemented now.

It simply avoids making two-person participation an unnecessary structural limitation.

---

# 10. Acceptance

Acceptance represents a participant agreeing to begin the proposed shared activity.

Acceptance belongs to the participant's relationship with a `QuestSession`.

Current product rule:

```text
QuestSession starts
only when all required participants accept
```

Example:

```text
Participant A: accepted
Participant B: waiting

Session: waiting_for_acceptance
```

Then:

```text
Participant A: accepted
Participant B: accepted

Session: active
```

The exact handling of declines, timeouts, or partial acceptance may evolve.

---

# 11. Completion

Completion represents a participant claiming that they completed the shared activity.

Current product rule:

```text
Participant A complete
+
Participant B complete
=
QuestSession verified as completed
```

A participant's completion state should be distinct from the session's final completion state.

Example:

```text
Participant A: complete
Participant B: waiting

QuestSession: active
```

Then:

```text
Participant A: complete
Participant B: complete

QuestSession: completed
```

Future verification methods could include additional signals, but they are not required by the current domain model.

---

# 12. Preferences

`Preferences` represent information used to shape a user's QuestGo experience.

Current examples may include:

```text
activity mode
interests
available duration
budget preference
```

Current modes include:

```text
Normal Mode
Work Mode
```

Preferences may influence quest generation or selection.

Preferences should not be treated as permanently fixed fields. They may evolve with the product.

---

# 13. Activity Mode

An `ActivityMode` represents the context in which a user wants QuestGo activities.

## Normal Mode

Designed for general real-world activities.

Examples may include:

- walking
- exploring
- visiting nearby locations
- free activities
- paid activities
- small shared challenges

## Work Mode

Designed for shorter and less disruptive activities appropriate for work, school, or similar environments.

Examples may include:

- short walk
- stretch break
- brief discussion prompt
- quick brainstorming exercise

Additional modes may be introduced later if there is a clear product need.

---

# 14. Streak / Engagement

A `Streak` represents continued participation in QuestGo.

The MVP counts consecutive distinct UTC days with mutually completed sessions. Multiple completions on one day count as one streak day; yesterday keeps a streak current until today ends.

Conceptually:

```text
verified QuestSession completion
        ↓
engagement event
        ↓
streak may update
```

Do not tightly couple the core quest-completion model to a specific streak algorithm.

This allows engagement rules to change without changing what it means to complete a quest.

---

# 15. Current Core Flow

The current domain flow is:

```text
User authenticated
        ↓
Device associated with User
        ↓
Devices become nearby
        ↓
Encounter created
        ↓
Encounter processed
        ↓
Quest selected or generated
        ↓
QuestSession created
        ↓
Participants attached
        ↓
Quest shown to participants
        ↓
Participants accept
        ↓
QuestSession becomes active
        ↓
Participants perform activity
        ↓
Each participant confirms completion
        ↓
QuestSession becomes completed
        ↓
Engagement / streak updated
```

---

# 16. Important Distinctions

These concepts should remain separate unless there is a strong reason to change the model.

### User vs Device

```text
User = person
Device = hardware/software endpoint
```

### Encounter vs QuestSession

```text
Encounter = people/devices came near each other
QuestSession = they are attempting an activity together
```

### Quest vs QuestSession

```text
Quest = what to do
QuestSession = this group's instance of doing it
```

### Participant vs User

```text
User = person globally
Participant = that user's role/state inside one QuestSession
```

### Participant Completion vs Session Completion

```text
Participant completion = one person confirms
Session completion = required verification conditions are satisfied
```

These separations make behavior easier to extend without adding unnecessary implementation complexity.

---

# 17. Current Product Invariants

Unless product requirements change:

1. proximity can produce an Encounter
2. an Encounter may produce a QuestSession
3. all participants in one QuestSession share the same Quest
4. required participants must accept before the session becomes active
5. each participant tracks their own completion state
6. the session completes only after required verification conditions are satisfied
7. completed sessions may update engagement or streak data
8. duplicate proximity signals should not continuously generate duplicate experiences

---

# 18. Evolution Rules

This model is expected to change.

When implementing a feature:

### Extend the current model when

the existing concepts still represent the product correctly.

### Refactor the model when

new requirements reveal that an existing concept is misleading or structurally restrictive.

### Introduce a new object when

it represents a distinct product concept with meaningful behavior or state.

### Do not introduce a new object when

it exists only to prepare for a hypothetical feature that is not currently required.

When the domain changes:

```text
product requirement
      ↓
domain decision
      ↓
implementation change
      ↓
DOMAIN.md updated
```

The implementation and documentation should evolve together.

---

# 19. MVP decisions and remaining boundaries

The implemented rules are described in `PRODUCT.md`. Availability is opt-in, a five-minute offer needs every participant's acceptance, active sessions expire after 24 hours, and the same device pair has a ten-minute cooldown. Skipping, leaving and expiration receive no completion credit. History is the source of truth for UTC-day streaks; retrying a completed session cannot award extra credit.

Use the smaller participant time and spending limits, and Work mode if either person requests it. One unresolved session per person prevents competing encounters. Venue identities come from OpenStreetMap; Gemini writes optional activity instructions, with a free fallback when lookup fails. All participants refer to the same saved quest.

Device ownership transfer, group quest rules, additional verification and rewards/XP remain undecided and are not implemented. Hardware advertisements and proximity thresholds belong to the teammate-owned firmware and still require coordination.

---

# 20. Future Considerations

Possible future product directions include:

- multi-participant encounters
- group quests
- multiple devices per user
- richer activity recommendations
- location-aware quests
- social relationships
- achievements
- organization or event-specific experiences

These are considerations, not current requirements.

Do not implement them unless requested.