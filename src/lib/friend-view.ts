import type { AppView, State } from "./model";
import { pairProximity } from "./notifications/store";
import { friendOf } from "./players";
import { metaConfigured } from "../../shared/meta-ai";

// Adds the two-player details to a view: who you are, whether your friend's
// board is near yours, and whether photo checks use Meta AI.
export function withFriend(state: State, data: AppView): AppView {
  const pair = friendOf(state, data.user.id);
  if (!pair) return data;
  let proximity = { near: false, watcherOnline: false } as ReturnType<
    typeof pairProximity
  >;
  try {
    proximity = pairProximity(pair.me.espId, pair.other.espId);
  } catch {
    // The notification database is unavailable; treat proximity as unknown.
  }
  return {
    ...data,
    player: { code: pair.me.code, name: data.user.displayName },
    friend: {
      code: pair.other.code,
      name: pair.friend.displayName,
      near: proximity.near,
      since: proximity.since,
      watcherOnline: proximity.watcherOnline,
    },
    photoCheck: metaConfigured() ? "meta" : "simulated",
  };
}
