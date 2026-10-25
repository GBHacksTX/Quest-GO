import { randomUUID } from "node:crypto";
import { AppError, hash, makeUser } from "./domain";
import type { State, User } from "./model";

// The two-player test setup: each person has one ESP board. Their username is
// that board's pairing code, so signing in also links the board.
// QUESTGO_PLAYERS="code:Name:espId,code:Name:espId" (espId = ESP server device_id).
export type Player = { code: string; name: string; espId: number };

const DEFAULT_PLAYERS = "prabesh:Prabesh:1,ramu:Ramu:2";
export const playersEnabled = () =>
  process.env.QUESTGO_PLAYERS_ENABLED !== "false";
export function players(): Player[] {
  const list = (process.env.QUESTGO_PLAYERS || DEFAULT_PLAYERS)
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter((parts) => parts.length === 3)
    .map(([code, name, espId]) => ({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      espId: Number(espId),
    }))
    .filter(
      (player) =>
        /^[a-z0-9_-]{3,40}$/.test(player.code) &&
        player.name.length >= 2 &&
        Number.isInteger(player.espId),
    );
  if (list.length !== 2)
    throw new Error("QUESTGO_PLAYERS must list exactly two players.");
  return list;
}
const providerKey = (player: Player) => `player:${player.code}`;
export const deviceId = (player: Player) => `esp-${player.espId}`;
export const isPlayer = (user: Pick<User, "providerKey">) =>
  user.providerKey.startsWith("player:");

// Creates both players and their linked boards once; later calls change nothing.
export function ensurePlayers(state: State) {
  for (const player of players()) {
    let user = state.users.find(
      (entry) => entry.providerKey === providerKey(player),
    );
    if (!user) {
      user = makeUser(providerKey(player), player.name);
      user.onboarded = true;
      user.preferences.area = "Austin, TX";
      state.users.push(user);
    }
    const device = state.devices.find((entry) => entry.id === deviceId(player));
    if (!device)
      state.devices.push({
        id: deviceId(player),
        ownerId: user.id,
        claimHash: hash(player.code),
        // ESP reports reach QuestGo through the ESP server, never this key.
        keyHash: hash(randomUUID()),
      });
    else device.ownerId ??= user.id;
  }
}
export function playerByCode(state: State, code: string) {
  ensurePlayers(state);
  const player = players().find(
    (entry) => entry.code === code.trim().toLowerCase(),
  );
  if (!player)
    throw new AppError(
      "That username wasn’t found. Use your board’s pairing code.",
      401,
    );
  return state.users.find((user) => user.providerKey === providerKey(player))!;
}
export function playerOf(user: Pick<User, "providerKey">) {
  return players().find((player) => providerKey(player) === user.providerKey);
}
// The other player for a signed-in player, with their board numbers.
export function friendOf(state: State, userId: string) {
  const user = state.users.find((entry) => entry.id === userId);
  const me = user && playerOf(user);
  if (!me) return undefined;
  const other = players().find((player) => player.code !== me.code)!;
  const friend = state.users.find(
    (entry) => entry.providerKey === providerKey(other),
  );
  return friend ? { me, other, friend } : undefined;
}
