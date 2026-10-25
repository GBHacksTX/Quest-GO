import { defineConfig } from "@playwright/test";
const externalServer = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: externalServer || "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: externalServer
    ? undefined
    : {
        command: "npm run dev -- --port 3000",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
