# ESP32 handoff

The firmware teammate owns proximity detection and Wi-Fi connectivity. The web application owns user identity, availability, quest creation and participant progress. ESP32s send reports to the application over HTTPS; they never connect directly to PostgreSQL or receive account passwords, browser session tokens or Meta AI credentials.

## Register each device once

With `DATABASE_URL` set in the ignored `.env`, run:

```sh
npm run db:migrate
npm run device:provision -- questgo-001
```

This creates an unclaimed device and writes `.questgo/device-questgo-001.json` with owner-only file permissions. The file contains the device ID, private pairing code and firmware key. It is ignored by Git. Give the pairing code to the device's user and the firmware key to the firmware teammate through a private channel. The database stores hashes of both secrets. Repeating provisioning does not overwrite an existing device's credentials.

The user signs in and enters the pairing code under **Your device**. A public device ID alone cannot claim the device. Transfer/recovery is outside the current MVP.

## Report connectivity

Send a heartbeat about every 20 seconds while connected:

```http
POST /api/hardware/heartbeat
Authorization: Bearer <firmware-key>
Content-Type: application/json

{"deviceId":"questgo-001"}
```

A successful response is `{"accepted":true}`. Heartbeats are accepted before device claiming, so a newly linked device can already have a recent report. A real user can become available only after their linked device has reported within 90 seconds. The website's foreground polling separately maintains the user's availability; a device heartbeat alone does not opt someone in.

## Report an encounter

When device 001 observes device 002 nearby, send:

```http
POST /api/hardware/encounters
Authorization: Bearer <device-001-firmware-key>
Content-Type: application/json

{
  "eventId": "a-stable-unique-id-for-this-event",
  "deviceId": "questgo-001",
  "nearbyDeviceId": "questgo-002",
  "detectedAt": "2026-10-25T02:00:00.000Z"
}
```

Use the actual UTC detection time, not the example timestamp. Synchronize device clocks. The server accepts reports up to five minutes old and one minute into the future. Retry a network failure using the same `eventId`. Choose a new event ID for a new physical encounter.

The bearer key must belong to `deviceId`, which is the sender. The other device does not need to expose its secret during proximity detection. The firmware must be able to discover the other device's registered public ID; the team still needs to agree on its BLE/radio advertisement format and proximity threshold.

Both devices must belong to different users who have opted into availability and have no open quest. The first eligible pair is handled transactionally. Reversed reports and reports within the ten-minute pair cooldown return the existing session without creating another quest. Venue preparation is bounded; a failed lookup produces a free fallback instead of blocking participation. Allow roughly 30 seconds for the initial encounter response while suggestions are prepared. A duplicate retry may acknowledge the session earlier.

## Response handling

| Status | Firmware behavior |
| --- | --- |
| 200 | Report accepted; inspect `duplicate` and `sessionId` if needed. Do not create another event merely because the report was a duplicate. |
| 400 | Correct malformed IDs, JSON or timestamp before retrying. |
| 401 | Check the device ID and provisioned firmware key. |
| 409 | Users are not eligible now, or an event ID was reused for another pair. Keep normal heartbeats; avoid a tight retry loop. |
| 429 | Back off for at least a minute. |
| 503/network error | Back off and retry the same event ID while its timestamp remains valid. |

The application limits each device to 120 reports per minute. Physical proximity, firmware behavior and hosted HTTPS connectivity still require verification with the actual devices; the automated demo is not evidence of those connections.
