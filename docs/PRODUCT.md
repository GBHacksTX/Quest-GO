# QuestGo product

## Current implementation

The landing page leads to `/explore`, the working application. It includes Google/Facebook sign-in entry points, preferences and location entry, private device pairing, opt-in availability, a shared quest offer, independent acceptance, active activity, mutual completion, cancellation, expiry, history and UTC streaks. Live sign-in is shown as unavailable until provider and database configuration are present.

An explicit demo creates a separate persistent room with a sample partner and device. Users can run the complete journey, simulate the partner's choices, or share a second-identity link with another browser profile. Demo devices, encounters and venue suggestions are labeled. Reloading preserves saved progress. No real hardware or OAuth integration is claimed verified by a successful demo.

The experience has loading, request-error, disconnected, empty-history and neutral ended-quest states, plus keyboard-accessible controls and reduced-motion support. Desktop and 390px-wide browser tests complete the journey and reload a waiting session. A separate passing-on-an-offer scenario verifies that no history credit is awarded.

## Confirmed product decisions

Confirmed with the user on October 24, 2026:

- The first version connects both friends and strangers.
- People may be required to keep the website open while available for a new quest. Background notifications are outside this MVP.
- ESP32 devices report encounters directly over Wi-Fi. A teammate supplies the firmware; the software and hardware sides must agree on the reporting format.
- Both Google and Facebook sign-in are required at launch.
- Quests must include actual nearby venues and potentially paid activities, as well as simple activities. A fixed collection of free prompts alone is insufficient.

## User journey and MVP defaults

The user authorized full MVP implementation on October 24, 2026. Implement this journey with the defaults below. The existing landing page does not dictate application behavior. Distinguish implemented features from integrations awaiting credentials or hardware verification. Paid activity payments and bookings happen externally; use browser location with manual area fallback and directions links. Availability is explicit, and one shared offer is proposed automatically to an eligible pair. Display names identify participants; precise location is not shared. Offers expire after five minutes, active sessions after 24 hours, and the pair cooldown is ten minutes. Use UTC calendar days for streaks.

### 1. Arrive and sign in

Visitors see a short explanation and a clear sign-in action. After Google or Facebook sign-in, they enter the application rather than returning to a marketing page. Returning users resume an unfinished quest or reach their home screen.

### 2. Set up once

Ask for a display name and the preferences needed to suggest an activity: Normal or Work mode, available time, interests, and maximum spending per person. Ask for location when nearby suggestions need it, explaining why. Offer manual area entry if browser location is denied; do not request location repeatedly.

The proposed MVP does not publish precise locations to other users. Device proximity identifies an encounter; location helps find activities and does not replace device detection.

### 3. Connect a device

The user sees a dedicated Connect device screen with instructions matching the actual hardware setup. The claim method must prove access to the device, such as a supplied private pairing code; it cannot rely only on a public device ID. Agree on the method with the firmware teammate before building it.

Show clear unlinked, linked, and last-report information. A linked record alone must not be presented as proof that the device is currently online. A missing device should explain the next action rather than leave the user on an endless scanning animation.

### 4. Choose to be available

The home screen shows device readiness, current preferences, and an Available / Paused control. Proposed default: paused until the user chooses to participate. Only people who are available and have no unresolved quest receive new offers.

Explain that the website must remain open while waiting. If the browser loses contact, the server must stop treating the person as available after a defined freshness period. Reopening the website restores saved session progress; it does not automatically create another quest.

### 5. Receive one shared offer

When two eligible devices meet, both people see the same quest offer, the other person's limited display information, and clear Accept and Skip actions. Do not add a second encounter-acceptance screen before quest acceptance.

The offer explains what to do, expected duration, estimated spending per person, and any venue involved. Show a real venue's name, address or area, and a link to details or directions when available. Label estimates honestly; suggestions do not guarantee a venue is open, available, or bookable.

Use a verified place-data source for real venue information. Gemini may help select or describe an activity, but invented businesses, exact prices, and opening hours must not be presented as facts. Decide the provider and location requirements before implementing venue suggestions.

Generate one offer for the shared session. While preparing it, show a bounded loading state; if venue lookup fails, offer a clearly described retry or suitable fallback rather than displaying fabricated results. If several people are nearby, choose one eligible pair at a time; the pairing rule still needs definition.

### 6. Accept or skip without pressure

Accepting records only that person's choice. Show a waiting state until the other person accepts. Both acceptances activate the shared activity. Proposed behavior: either person may skip before activation, or withdraw an acceptance while waiting, without losing streak progress.

A skipped or expired offer closes for both people with a neutral explanation. Do not immediately offer the same pair another quest. The response window and cooldown remain decisions to settle; do not bury permanent numbers in the code.

### 7. Do the activity

Both people see the active quest, venue details where applicable, and their own completion action. They can put the phone away and return to the same saved quest. The MVP's open-website requirement applies to receiving new offers, not watching the screen throughout an activity.

Paid activities mean an external venue may charge money. Proposed boundary: QuestGo recommends the activity and links out for details; bookings, payments, and purchases happen outside QuestGo. A timer is informational, not evidence of completion.

Provide a way to leave an activity. Proposed behavior: leaving ends it without completion credit and informs the other person. Agree on cancellation and abandonment rules before implementing them.

### 8. Confirm completion together

Each person confirms their own completion. The first sees that confirmation is waiting for the partner. Only both confirmations produce a successful completion. Do not claim the activity is physically verified beyond these mutual confirmations.

If someone never confirms, do not award completion automatically or lock the other person out indefinitely. Define an expiry and return-to-home path before implementation.

### 9. See the result and return home

Show the completed activity in history and the result under the agreed streak rule. Apply credit once, even after retries or reloads. The person explicitly chooses whether to become available again rather than being placed into another encounter immediately.

## States every screen needs

Provide clear loading, empty, connection-lost, and recoverable-error states where relevant. Only show an acceptance or completion as saved after the server confirms it. A refresh must recover the current shared state. Users who are not participants cannot access a private session by guessing its address.

## Remaining decisions before feature implementation

| Topic | What needs to be settled |
| --- | --- |
| Consent and identity | Agree to the proposed availability and skip flow; decide how friends or strangers identify each other in person and what name/profile information is visible. |
| Nearby activities | Choose how location is supplied, what “nearby” means, and a trustworthy place-data provider. Decide whether directions links are enough or an embedded map is required. |
| Paid activities | Confirm that payment and booking happen outside QuestGo; define how estimates and unknown prices are displayed. |
| Pairing | Decide which pair receives an offer when several eligible devices are near each other. |
| Device handoff | Agree with the hardware teammate on device claims, report fields, sender authentication, retries, and what demonstrates real connectivity. |
| Session boundaries | Set offer timeout, duplicate cooldown, leaving/abandonment behavior, and when participants may receive another offer. |
| Preference conflicts | Agree on combining modes, time, travel distance, and spending limits without exceeding either person's limits. |
| Streaks | Choose calendar-day/timezone behavior and how repeated completions in a day count. |

Normal mode supports everyday exploration; Work mode supports brief activities appropriate to work or school. No sign-in, device, location, venue lookup, or shared session behavior described above is implemented yet.

## Review and implementation sequence

1. Agree on this journey and update the domain, architecture, and tasks to match the final decisions.
2. When the user asks to proceed, build a complete interactive UI walkthrough: onboarding, device setup, home, offer, waiting, active quest, completion, history, and the relevant error/skip paths. Label sample data and simulated interactions. Review it on phone and desktop before treating the design as settled.
3. Connect and verify the real features one at a time, using the agreed flow and documented feature branches. Request credentials only as each service is needed.
4. Demonstrate the connected product with two real users and two devices, including a real venue suggestion and both acceptance and completion. Report any unverified integration explicitly.

## Visual direction

Forest green, parchment, muted sage, and warm gold support an illustrated storybook direction. System serif headings pair with system sans-serif text. A CSS landscape avoids external image dependencies. Motion is limited to background clouds, fireflies, hover feedback, and the sample card reveal.

Research references consulted on October 24, 2026:

- [Figma: web design trends](https://www.figma.com/resource-library/web-design-trends/) — expressive typography and purposeful motion.
- [Awwwards: storytelling websites](https://www.awwwards.com/websites/storytelling/) — illustration and visual narrative as inspiration; no source artwork copied.

See [INTEGRATIONS.md](INTEGRATIONS.md) for readiness and verification boundaries.
