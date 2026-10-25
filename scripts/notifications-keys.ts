import { appendFileSync, existsSync, readFileSync } from "node:fs";
import webpush from "web-push";
const existing = existsSync(".env") ? readFileSync(".env", "utf8") : "";
if (/^VAPID_(PUBLIC|PRIVATE)_KEY=/m.test(existing)) {
  console.log("Existing VAPID settings preserved.");
} else {
  const keys = webpush.generateVAPIDKeys();
  appendFileSync(
    ".env",
    `\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://questgo.example.com\n`,
    { mode: 0o600 },
  );
  console.log(
    "VAPID keys saved privately to .env. Set VAPID_SUBJECT to your public HTTPS origin before hosting.",
  );
}
