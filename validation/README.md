# Quest Generator

A Next.js app that generates a real-world quest from the user's instructions and settings, then checks an uploaded photo to decide whether the quest was completed. Both steps use the Muse API.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in your Muse details
npm run dev
```

Open http://localhost:3000.

To try the UI without a Muse key, set `MUSE_MOCK=true` in `.env.local`. Quests are canned and every photo passes.

## How it works

| File | Purpose |
| --- | --- |
| `src/components/QuestGenerator.tsx` | The UI component (instructions, settings, quest card, photo upload, result) |
| `src/app/api/quest/generate/route.ts` | `POST` JSON `{ instructions, preferences, avoidTitles? }` → `{ quest }`. Empty instructions are randomized |
| `src/app/api/quest/validate/route.ts` | `POST` form data `image` + `quest` → `{ result }` |
| `src/lib/quest.ts` | Prompts sent to Muse and cleanup of its replies |
| `src/lib/muse.ts` | The only file that talks to Muse. Change this if Muse's request format differs |
| `src/lib/questgo-data.ts` | Preferences, venue types, example quests and ideas from [QuestGo](https://github.com/GBHacksTX/Quest-GO), used to roll random instructions |
| `src/lib/types.ts` | The `Quest` / `ValidationResult` types |

The Muse API key is only used on the server and never reaches the browser.

`src/lib/muse.ts` assumes an OpenAI-style `POST {MUSE_API_BASE_URL}/chat/completions` endpoint with a Bearer token, and sends images as base64 `image_url` parts.
