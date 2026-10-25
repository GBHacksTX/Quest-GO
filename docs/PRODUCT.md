# QuestGo product

## Current implementation: step 1

QuestGo opens on a mobile-friendly adventure-themed introduction. Visitors can read how encounters become shared activities, jump to a quest preview, and flip a sample quest card to reveal its instructions. The preview needs no account and does not save data, detect devices, create encounters, or start a session. Reloading resets the card.

The sample is a free, ten-minute walk for two people. It illustrates an activity definition, not a shared session or participant progress. There are no invented streaks, live users, device detections, or acceptance states on the page.

Navigation works with section links. The quest card supports keyboard activation, visible focus, and screen-reader expanded state. Layout adapts to phone-sized screens. Decorative animation respects reduced-motion settings.

## Intended MVP flow (later steps)

1. Sign in through Google or Facebook and associate a device with your account.
2. Meet someone with a nearby QuestGo device. Eligible proximity creates an encounter.
3. Both people receive the same quest through one shared session.
4. Each person accepts independently. The activity begins only when all required participants accept.
5. Do the activity together. Each person confirms completion independently.
6. The session completes after all required confirmations. Verified completion can update history and streaks.

Normal mode supports everyday exploration; Work mode supports brief activities appropriate to work or school. Preferences, generation, and streak rules will be defined in their planned implementation steps. No account, device, or session behavior is implemented in step 1.

## Visual direction

Forest green, parchment, muted sage, and warm gold support an illustrated storybook direction. System serif headings pair with system sans-serif text. A CSS landscape avoids external image dependencies. Motion is limited to background clouds, fireflies, hover feedback, and the sample card reveal.

Research references consulted on October 24, 2026:

- [Figma: web design trends](https://www.figma.com/resource-library/web-design-trends/) — expressive typography and purposeful motion.
- [Awwwards: storytelling websites](https://www.awwwards.com/websites/storytelling/) — illustration and visual narrative as inspiration; no source artwork copied.

See [INTEGRATIONS.md](INTEGRATIONS.md) for readiness and verification boundaries.
