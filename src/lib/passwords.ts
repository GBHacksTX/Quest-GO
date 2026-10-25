import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$3$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  const parts = encoded?.split("$");
  const valid =
    parts?.length === 6 &&
    parts.slice(0, 4).join("$") === "scrypt$32768$8$3" &&
    /^[a-f0-9]{32}$/.test(parts[4]) &&
    /^[a-f0-9]{128}$/.test(parts[5]);
  // Unknown accounts do the same expensive calculation and return the same error.
  const actual = await derive(password, valid ? parts[4] : "0".repeat(32));
  const expected = Buffer.from(valid ? parts[5] : "0".repeat(128), "hex");
  return timingSafeEqual(actual, expected) && !!valid;
}
