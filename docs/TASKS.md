# QuestGo Implementation Plan

## Goal and current status

Build a reliable demo in which two people meet, receive one shared quest, both accept it, and both confirm completion. The completed activity then updates their history and streaks.

The user authorized implementation and local commits on October 24, 2026; never push to origin. Step 1 is the original landing-page preview. The transactional session and persistence foundation is implemented on `feat/session-foundation`, with six passing domain/storage tests. Live PostgreSQL still requires credentials and migration verification. The full application UI and integrations are the next milestones.

Follow the steps in order. Each step explains the work and gives a concrete completion check. Update its status as work progresses and record any blocker beside the affected step.

## What the plan follows

- [ARCHITECTURE.md](ARCHITECTURE.md) defines the technology choices: Next.js, TypeScript, Tailwind, Auth.js, Tiger Data/PostgreSQL, Gemini, ESP32, and NorthMark hosting.
- [DOMAIN.md](DOMAIN.md) defines the concepts and rules. A user is separate from a device; a quest describes an activity; a session holds the participants and their progress.
- [AGENTS.md](AGENTS.md) defines the development workflow, validation, and commit rules.

The MVP serves two people, while using a participant list rather than fixed `user1` and `user2` fields. Group activities, rewards, social connections, and native apps remain outside this plan.

## 1. Set up the application

**Branch:** `feat/app-foundation`

**Status:** Implemented — TypeScript and production build pass; local development server starts. Browser access was denied, so visual desktop/mobile and browser interaction checks remain unverified. Steps 2–12 have not started. See [INTEGRATIONS.md](INTEGRATIONS.md) for external access blockers.

Work: Create the Next.js application using TypeScript and Tailwind CSS. Add the basic project structure, development commands, and an .env.example file containing only environment variable names—never real credentials or secrets.

Create an initial polished, mobile-friendly QuestGo interface with a fairy-tale/adventure theme. Research current web design references for inspiration, then build a visually appealing UI with a cohesive color palette, strong typography, an animated background, subtle motion, and responsive hover/interaction effects. Use 3D card-flip effects only where they make sense for the interaction; do not apply them indiscriminately to every button or card.

Add clear local setup instructions to README.md and create PRODUCT.md describing the current MVP flow from the user's perspective.

Check access to the planned database, OAuth providers, Gemini, hosting/cloud infrastructure, and hardware integration early. Clearly document anything that is unavailable or not yet configured, and do not claim an integration is working until it has been verified.

Done when: The application runs locally, the initial UI is polished and responsive, setup instructions are complete, TypeScript checks pass, and the production build succeeds.

## 2. Create the database foundation

**Branch:** `feat/database-foundation`

**Status:** Domain lifecycle, SQL migration, PostgreSQL adapter and isolated SQLite demo storage implemented on `feat/session-foundation`. Six automated checks pass; real Tiger Data verification awaits `DATABASE_URL`. User-flow defaults are recorded in [PRODUCT.md](PRODUCT.md#user-journey-and-mvp-defaults).

**Work:** Connect the server to Tiger Data/PostgreSQL. Create versioned schema changes, called migrations, for users, authentication records as needed, devices, encounters, quests, sessions, and participants. Add preference and engagement storage when their behavior is defined in later steps.

Preserve the domain relationships: a session references one quest, and each participant has their own acceptance and completion state. Describe the schema and migration commands in `DATABASE.md`.

**Done when:** Migrations work on an empty development database, records can be saved and read, and database constraints prevent broken relationships or duplicate participation in one session.

## 3. Add sign-in and user identity

**Branch:** `feat/authentication`

**Work:** Configure Auth.js with Google and Facebook. Persist each user's application identity and provide sign-in and sign-out. Require authentication for personal pages and server operations. Define safe handling of multiple login providers before linking accounts.

**Done when:** Two people can sign in independently, return to their existing accounts, and sign out. An unauthenticated visitor cannot access their private information or actions. Verify each provider with real credentials before marking its integration complete.

## 4. Associate devices with users

**Branch:** `feat/device-association`

**Work:** Add a minimal way to associate an ESP32 identifier with a signed-in user and display the association. Define how a user proves they may claim a device; knowing its public identifier alone should not transfer ownership. Keep device records separate from user records.

**Done when:** Two test devices belong to two different users, the application can resolve each device to its owner, and one user cannot claim or modify another user's device through an unauthorized request.

## 5. Record proximity encounters

**Branch:** `feat/proximity-encounters`

**Work:** Define how hardware reports reach persistent storage and how the application discovers them. Document the report format, sender authentication, device identifiers, timestamp, and optional proximity information. Reconcile this concrete integration with the data flow in `ARCHITECTURE.md` before implementing it.

Validate incoming reports and define a simple cooldown rule so repeated signals from the same pair do not continuously create encounters. Add a development-only way to submit sample reports through the same processing logic while hardware is being prepared.

**Done when:** A valid report creates an encounter for the correct users. Unknown devices and invalid reports are handled clearly. Duplicate, reversed-pair, and simultaneous reports do not create duplicate experiences within the documented cooldown.

## 6. Create one shared quest session

**Branch:** `feat/shared-quest-session`

**Work:** Process an eligible encounter into one session with its participants. Start with a fixed activity, such as a short walk, so the shared flow can be verified before AI generation is added. Persist the quest and session once, and have both users read that same state.

Build the initial quest screen and choose a simple way to refresh it when shared state changes. Make encounter processing safe to retry without creating another session.

**Done when:** Two signed-in browser sessions show the same quest and session identifier. Reloading either browser or retrying processing preserves the shared session.

## 7. Require mutual acceptance

**Branch:** `feat/mutual-acceptance`

**Work:** Add an Accept action and show who has accepted. Record only the signed-in participant's acceptance. Keep the session waiting until all required participants accept, then mark it active on the server.

**Done when:** The first acceptance leaves the session waiting; the second activates it for both users. Repeated clicks and simultaneous requests are safe, and a nonparticipant cannot accept or inspect the private session.

## 8. Require mutual completion

**Branch:** `feat/mutual-completion`

**Work:** Let participants confirm completion of an active activity. Show when one person has confirmed and the other is still pending. Mark the shared session completed only after all required confirmations arrive.

**Done when:** One confirmation leaves the session active; both confirmations complete it. Completion before activation is rejected, users cannot confirm for someone else, and retries or simultaneous requests cannot complete the session twice.

## 9. Add preferences and Gemini generation

**Branch:** `feat/quest-generation`

**Work:** Add the preferences needed for the MVP: Normal or Work mode, interests, available time, and budget. Define how both users' preferences combine, including conflicting limits, and document that rule in `PRODUCT.md`.

Replace the fixed quest selection with server-side Gemini generation. Validate the result, save one selected activity for the shared session, and use a suitable predefined activity if generation fails. Keep the same session lifecycle already verified in steps 6–8.

**Done when:** Both users receive the same saved activity, the activity respects the agreed preference rules, and slow, invalid, or failed AI responses do not leave the encounter stuck or create competing quests.

## 10. Add history and streak updates

**Branch:** `feat/history-and-streaks`

**Work:** Show each user's completed activities. Define a minimal streak rule, including which calendar day and timezone apply and how multiple completions on one day behave. Document the rule before implementing it; the existing docs intentionally leave it open.

Update engagement only after verified session completion. Keep the streak calculation separate from acceptance and completion logic, and make updates safe to retry.

**Done when:** Both users see the completed activity and the expected streak. Partial completion earns no update, and repeated processing never awards the same completion twice.

## 11. Connect real devices and prepare hosting

**Branch:** `feat/hardware-and-hosting`

**Work:** Connect two ESP32 devices to the reporting contract from step 5 and verify actual proximity produces an encounter. Test continued proximity so repeated hardware signals exercise duplicate prevention.

Prepare the NorthMark deployment configuration, database migrations, server environment variables, and OAuth callback settings. Run a hosted smoke check when deployment access and authorization are available. Document the deployment and demo commands.

**Done when:** Real device proximity reaches the application, and the hosted application can access its required services. A sample report alone does not count as verified hardware integration; a successful local run alone does not count as verified hosting.

## 12. Verify the full demo and handoff

**Branch:** `feat/demo-verification`

**Work:** Run the complete flow with two real devices and two authenticated users: meet, receive the same quest, accept, complete, and inspect history and streaks. Check page reloads, waiting states, clear error messages, and usability on a phone-sized screen.

Run the applicable tests, type checks, and production build. Write a short demo guide covering setup, the exact demonstration sequence, and any remaining limitations.

**Done when:** The documented demo can be repeated successfully, the important failure cases from earlier steps still pass, and a teammate can run it without needing undocumented instructions.

## Decisions to make during implementation

The user-flow decisions in [PRODUCT.md](PRODUCT.md#remaining-decisions-before-feature-implementation) now take priority over the earlier schedule below. Current planning branch: `feat/user-flow-planning`. The subsequent user instruction authorizes full MVP implementation and local commits, with no remote push.

Confirmed scope includes friends and strangers, both OAuth providers, open-website encounter discovery, real nearby venues and potentially paid activities, and Wi-Fi reporting by teammate-owned ESP32 firmware. Add the venue data integration, location experience, and complete interactive UI walkthrough to the revised task sequence once the flow is agreed.

These earlier technical decisions remain open:

| Decision | Resolve by |
| --- | --- |
| How devices are claimed and ownership is checked | Step 4 |
| Hardware transport, sender authentication, and encounter discovery | Step 5 |
| Encounter cooldown and when the same pair may receive another session | Step 5 |
| How shared state reaches both screens | Step 6 |
| Whether decline or expiration behavior is needed for the MVP | Step 7 |
| How participant preferences combine | Step 9 |
| Streak calculation and timezone | Step 10 |

Record decisions in the relevant product, domain, database, or architecture document alongside the code. Introduce only the behavior required to make the current step work.

## How each step is completed

Before changing code, inspect the current branch and preserve other contributors' work. Create the listed feature branch from the current `main`. At each coherent milestone, verify the behavior, run the relevant checks, review the diff, and update affected docs. Create focused local commits. Do not push to any remote.

After committing the feature locally, create an `integration/<feature-name>` copy, rebase that copy onto the latest `main`, and squash merge it into `main` with a local commit. Preserve the original feature branch and its commits unchanged, including after integration. Start the next feature from the updated `main`. See [the branch workflow](AGENTS.md#feature-branch-and-integration-workflow) for the complete rules.

Mark a step complete only when its completion check has passed. If credentials, equipment, or access prevent verification, record exactly what remains unverified and continue any independent work that is available.
