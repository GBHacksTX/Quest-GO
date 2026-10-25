# Integration readiness

Checked October 24, 2026 during step 1. The initial application runs independently of external services. Availability below describes the local workspace check, not the existence of accounts elsewhere.

| Integration | Evidence / current state | Needed to verify |
| --- | --- | --- |
| Tiger Data / PostgreSQL | `psql` is installed. No `DATABASE_URL` in the process environment; no local environment files existed at the initial check. No connection attempted without credentials. | Development connection URL, schema and migrations in step 2; verify write/read. |
| Auth.js / Google | No `AUTH_SECRET`, `AUTH_GOOGLE_ID`, or `AUTH_GOOGLE_SECRET` configured. Auth.js is not installed yet. | Register OAuth application, configure callbacks and credentials, verify real sign-in/sign-out in step 3. |
| Meta / Facebook | No `AUTH_FACEBOOK_ID` or `AUTH_FACEBOOK_SECRET` configured. | Provider application access, callback setup, and real sign-in verification in step 3. |
| Gemini | No `GEMINI_API_KEY` configured. No generation request made. | Server-side key, model selection, validated response and fallback in step 9. |
| NorthMark Compute & Cloud | No deployment configuration or hosting credentials in this repository/process. No deployment attempted. | Hosting access, deployment target, TLS, environment settings and hosted smoke check in step 11. |
| ESP32 | No ESP32 serial port identified under `/dev/cu.*`; Arduino CLI and PlatformIO not found. Bluetooth/debug serial entries do not establish ESP32 access. | Two devices, firmware/tooling and authenticated reporting contract; real proximity verification in steps 5 and 11. |

No external integration is claimed as working. These blockers do not prevent running the step 1 UI. Credentials belong in ignored local environment files or the hosting secret store; never commit them. `.env.example` contains blank assignments only. Hosting variable names and the hardware contract remain undecided rather than inventing unsupported configuration.

## Environment setup

A local `.env` has been created for the planning handoff. Provider credentials are blank; `AUTH_SECRET` was generated locally. The file is ignored by Git. `.env.example` remains the shareable template and contains no secrets. These entries reserve names for planned integrations; adding values does not implement the integrations.

Enter credentials directly in `.env` on this computer rather than pasting them into chat. Do not overwrite the file if it already contains values. No external credentials are needed for the existing preview or a future clearly labeled UI walkthrough.

| Variable | What belongs here | When it is needed |
| --- | --- | --- |
| `DATABASE_URL` | The development PostgreSQL connection string supplied by Tiger Data, including its required connection settings. | Connecting and testing real storage. |
| `AUTH_SECRET` | A locally generated random secret used by the authentication system. Already populated locally; no provider account is needed for this value. | Implementing real login. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | The client ID and secret for the project's Google OAuth application. | Verifying Google login and its callback URLs. |
| `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` | The application ID and secret for the project's Meta/Facebook login application. | Verifying Facebook login and its callback URLs. Both login providers are required at launch. |
| `GEMINI_API_KEY` | A server-side key for the project's Gemini access. | Verifying actual quest generation and the selected venue-grounding approach. |

Collect values one integration at a time after the user-flow review. Public callback URLs and hosting settings depend on the eventual deployment target; the software will document exact values when that setup is implemented. Credentials for the web server's database and AI services do not belong in ESP32 firmware.

### Nearby venue data

Real nearby venues and potentially paid activities are confirmed requirements. The provider has not been selected. Google's official [Gemini Maps grounding documentation](https://ai.google.dev/gemini-api/docs/maps-grounding) describes location-aware responses based on Maps data; evaluate this option before asking the user to configure another service. Model support, access, billing, response handling, and required attribution still need verification for the chosen integration. This research does not establish that the project can call it successfully.

No separate Maps or Places key has been invented in `.env`. Add any additional credential only if the selected approach actually requires it. Location permission and manual area entry are user-flow decisions, not API secrets.

### Hardware and hosting handoff

The user confirmed that a teammate supplies ESP32 firmware and the devices report over Wi-Fi. Agree on the report format, reporting destination, device claim method, and sender authentication with that teammate before adding hardware configuration. Firmware implementation is outside the application's current ownership.

NorthMark hosting access is needed for the connected hosted demo, not for reviewing the UI. Define deployment variables once the actual hosting environment is known.

## Step 1 application verification

- `npm run typecheck` passed.
- `npm run build` passed using Webpack; `/`, `/_not-found`, and `/icon.svg` prerendered successfully.
- The local development server started on `127.0.0.1:3001`.
- Browser navigation was denied by the browser approval gate. Desktop/mobile visual layout and live keyboard/click checks remain unverified; responsive styles and native button keyboard behavior are implemented.
- Turbopack failed to bind its worker port in the execution environment, including on an escalated attempt. The project uses the supported `--webpack` option for development and builds.
