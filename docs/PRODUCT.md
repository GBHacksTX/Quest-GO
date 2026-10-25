# QuestGo product

## Current implementation

The landing page leads to `/explore`, the working application. It includes Google/Facebook sign-in entry points, preferences and location entry, private device pairing, opt-in availability, a shared quest offer, independent acceptance, active activity, separate achievement photos, mutual completion, cancellation, expiry, photo achievements and UTC streaks. Live sign-in is shown as unavailable until provider and database configuration are present.

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

### 8. Save photos and confirm completion together

Each participant takes a photo or selects a JPEG, PNG or WebP image, previews it, and explicitly saves it. A photo of the activity, place or result is enough; faces are optional. Uploads are limited to 10 MB and 40 megapixels, then resized to at most 1600 pixels and saved as JPEG with metadata removed.

Each person must save their own photo before confirming their part. A failed upload retains the selected image for retry and does not unlock confirmation. Before confirming, they can replace their own photo. After confirming, that photo is locked. Only participants can view either photo; there are no public image links.

The first confirmation waits for the other person. The session completes and earns streak credit only after both photos and both confirmations are saved. Photos are a shared record plus mutual confirmation, not automated proof that an activity physically happened. If someone never finishes, the existing expiration/leave paths apply without completion credit.

### 9. See the result and return home

Show the completed achievement, both photos, activity title and completion date in Your stories, together with the result under the agreed streak rule. Apply credit once, even after retries or reloads. The person explicitly chooses whether to become available again rather than being placed into another encounter immediately.

## States every screen needs

Provide clear loading, empty, connection-lost, and recoverable-error states where relevant. Only show an acceptance or completion as saved after the server confirms it. A refresh must recover the current shared state. Users who are not participants cannot access a private session by guessing its address.

## Implemented MVP rules

Availability is explicit and expires after 45 seconds without a foreground browser poll. Real devices must have reported within 90 seconds before their owners can become available. The first eligible reported pair receives one offer; there is no nearby-person directory. Only display names and participant progress are shared. A person can have one unresolved quest at a time.

Use the lower time and budget limits. If either person chooses Work mode, the shared activity uses Work mode and lasts at most 15 minutes. Combine interests as suggestion context. Place radius is bounded by available time and capped at 1.2 km; walking time is an estimate, not a routing guarantee. Unknown venue prices remain variable, with both people told to check the venue and respect their agreed spending limit.

Offers expire after five minutes; active quests after 24 hours. Before activation, either person can pass or withdraw acceptance. After activation, either can leave without completion credit. An ended quest can be dismissed; the person remains paused until choosing availability again. The same pair has a ten-minute encounter cooldown. A completed achievement requires a photo and confirmation from every participant. Completed sessions count once toward history and once per distinct UTC calendar day toward streaks.

Nearby places come from OpenStreetMap with source and directions links. Gemini optionally writes the activity text. A missing provider, invalid response or timeout uses a free activity with a visible fallback explanation. A live offer can retry nearby lookup only before either person accepts.

The remaining external work is provider credentials/callback verification, NorthMark hosting access and actual ESP32 firmware integration. Device ownership transfer, embedded maps, in-app payments and group matching remain outside this MVP.

## Delivery and verification sequence

1. Record the journey and defaults in the product, domain and architecture documentation.
2. Implement and review the complete responsive application: onboarding, device setup, home, offer, waiting, active quest, completion, history, and the relevant error/skip paths. Label sample data and simulated interactions. Review it on phone and desktop before treating the design as settled.
3. Connect and verify the real features one at a time, using the agreed flow and documented feature branches. Collect external credentials only as each service is needed.
4. Demonstrate the connected product with two real users and two devices, including a real venue suggestion and both acceptance and completion. Report any unverified integration explicitly.

## Visual direction

Forest green, parchment, muted sage, and warm gold support an illustrated storybook direction. System serif headings pair with system sans-serif text. A CSS landscape avoids external image dependencies. Motion is limited to background clouds, fireflies, hover feedback, and the sample card reveal.

Research references consulted on October 24, 2026:

- [Figma: web design trends](https://www.figma.com/resource-library/web-design-trends/) — expressive typography and purposeful motion.
- [Awwwards: storytelling websites](https://www.awwwards.com/websites/storytelling/) — illustration and visual narrative as inspiration; no source artwork copied.

See [INTEGRATIONS.md](INTEGRATIONS.md) for readiness and verification boundaries.
