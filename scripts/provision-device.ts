import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { transact } from "../src/lib/store";
import { hash } from "../src/lib/domain";

loadEnvConfig(process.cwd());
async function main() {
  const id = process.argv[2];
  if (!id || !/^[a-zA-Z0-9_-]{3,80}$/.test(id)) throw new Error("Use: npm run device:provision -- questgo-001 (letters, numbers, hyphen or underscore).");
  const claimCode = randomBytes(18).toString("base64url"); const hardwareKey = randomBytes(32).toString("base64url");
  const directory = path.join(process.cwd(), ".questgo"); mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `device-${id}.json`);
  // Reserve a private output file before adding a device, so a duplicate command cannot overwrite credentials.
  writeFileSync(file, JSON.stringify({ deviceId: id, claimCode, hardwareKey }, null, 2), { flag: "wx", mode: 0o600 });
  try {
    await transact(false, (state) => {
      if (state.devices.some((device) => device.id === id)) throw new Error("Device already registered; existing credentials were not changed.");
      state.devices.push({ id, claimHash: hash(claimCode), keyHash: hash(hardwareKey) });
    });
  } catch { unlinkSync(file); throw new Error("Provisioning failed. Check database access and whether this device already exists. No existing device credentials were changed."); }
  console.log(`Device registered. Private pairing code and firmware key saved to ${file}. Do not commit or publicly share this file.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Device provisioning failed."); process.exitCode = 1; });
