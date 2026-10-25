import { timingSafeEqual } from "node:crypto";
import { AppError, hash } from "./domain";
import type { State } from "./model";

export function bearerHeader(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer [A-Za-z0-9_-]{32,256}$/.test(authorization)) throw new AppError("Device authentication failed.", 401);
  return authorization;
}

export function authenticateDevice(state: State, id: string, authorization: string | null) {
  const device = state.devices.find((entry) => entry.id === id);
  const key = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!device || key.length < 32 || key.length > 256) throw new AppError("Device authentication failed.", 401);
  const actual = Buffer.from(hash(key), "hex"); const expected = Buffer.from(device.keyHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError("Device authentication failed.", 401);
  return device;
}
