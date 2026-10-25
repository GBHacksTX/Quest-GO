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

## Step 1 application verification

- `npm run typecheck` passed.
- `npm run build` passed using Webpack; `/`, `/_not-found`, and `/icon.svg` prerendered successfully.
- The local development server started on `127.0.0.1:3001`.
- Browser navigation was denied by the browser approval gate. Desktop/mobile visual layout and live keyboard/click checks remain unverified; responsive styles and native button keyboard behavior are implemented.
- Turbopack failed to bind its worker port in the execution environment, including on an escalated attempt. The project uses the supported `--webpack` option for development and builds.
