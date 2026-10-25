import { z } from "zod";
import webpush from "web-push";

// An anonymous test endpoint must not let callers turn the worker into an HTTP proxy.
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" ||
        url.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export const subscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(allowedPushEndpoint),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export type ProximityEvent = {
  event_id: string;
  device_id: number;
  peer_id: number;
  event_type: string;
  state: string | null;
  received_at: Date | string;
  detected_by?: string | null;
  other_person?: string | null;
};
// Names come from the ESP server's devices table; fall back to device numbers.
export function eventNotification(event: ProximityEvent) {
  const me = (event.detected_by || `Device ${event.device_id}`).slice(0, 40);
  const peer = (event.other_person || `Device ${event.peer_id}`).slice(0, 40);
  const messages: Record<string, string> = {
    peer_near: `${me} and ${peer} are near each other`,
    peer_far: `${me} and ${peer} moved apart`,
    peer_detected: `${me} detected ${peer}`,
    peer_missing: `${me} and ${peer} are out of range`,
    hotspot_connected: `${me}'s device came online`,
    test: `Test event from ${me}`,
  };
  return {
    title: "QuestGo",
    body:
      messages[event.event_type] ??
      `${me} → ${peer}: ${event.event_type.replaceAll("_", " ").slice(0, 40)}`,
    tag: `questgo-event-${event.event_id}`,
    url: "/explore",
  };
}
export const notificationsEnabled = () =>
  process.env.QUESTGO_NOTIFICATION_BROADCAST === "true";
export const pushConfigured = () =>
  notificationsEnabled() &&
  !!(
    process.env.PROXIMITY_API_URL &&
    process.env.PROXIMITY_API_TOKEN &&
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
export async function sendPush(subscription: Subscription, payload: object) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: {
      subject: process.env.VAPID_SUBJECT!,
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
    },
    TTL: 3600,
    timeout: 8000,
  });
}
export function deliveryResult(error: unknown, attempt: number) {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 404 || status === 410) return "expired";
  return attempt >= 5 ? "failed" : "retry";
}
