# Veiled Gateway Documentation

The gateway is a Socket.IO connection used by bots to receive real-time events and join voice channels.

---

## 1. Connecting

- **Gateway URL Endpoint**: `GET /api/v1/bots/gateway`
- **Transport**: Socket.IO over WebSocket
- **Authentication**: Pass `auth` object on connection containing `token`, `intents`, and `shard`.

```javascript
// gateway.mjs
const { url } = await fetch(`${API}/bots/gateway`, { headers }).then((r) => r.json());

const gateway = io(url, {
  auth: {
    token: `Bot ${TOKEN}`,
    intents: 4 | 8,
    shard: [0, 1], // [shardId, shardCount]
  },
  transports: ['websocket'],
});

gateway.on('MESSAGE_CREATE', (message) => {
  console.log(message.laneId, message.content);
});
```

> **Note on SDK defaults**: Raw gateway uses default intents when omitted. The `@veiled/bot-sdk` client defaults to intent mask `0`, so pass required intents explicitly.

---

## 2. Intents & Shards

### Sharding
- Format: `shard: [shardId, shardCount]`
- Shard IDs start at `0`; count ranges from `1` to `1024`.
- Bot installations are assigned to shards by room ID.
- Maintain a consistent shard count across deployments. Changing shard count can produce a replay-gap notice. Multi-shard sessions require shared Redis leases.

### Intent Bitmasks

| Intent | Bit | Description & Access | Default / Approval |
| :--- | :--- | :--- | :--- |
| `ROOMS` | `1` | Room and lane lifecycle, bot installation changes | Default in raw gateway |
| `MEMBERS` | `2` | Member join/leave, role assignments | Requires staff approval |
| `MESSAGES` | `4` | Message, typing, mention events. Content redacted without `MESSAGE_CONTENT` | Default in raw gateway |
| `MESSAGE_CONTENT` | `8` | Allows message content, embeds, attachments, components, poll data | Requires staff approval |
| `REACTIONS` | `16` | Message reaction add and remove | Default in raw gateway |
| `PRESENCE` | `32` | User presence updates in bot rooms | Requires staff approval |
| `THREADS` | `64` | Thread lifecycle and membership | Default in raw gateway |
| `INVITES` | `128` | Room invite creation, update, revocation | Default in raw gateway |
| `WEBHOOKS` | `256` | Webhook creation, update, deletion | Default in raw gateway |
| `POLLS` | `512` | Poll vote add and remove | Default in raw gateway |
| `MODERATION` | `1024` | Member bans, unbans, timeouts, join-request updates | Default in raw gateway |
| `VOICE_STATES` | `2048` | Live voice roster updates (not replayed on reconnect) | Default in raw gateway |
| `SCHEDULED_EVENTS` | `4096` | Scheduled event updates | Default in raw gateway |
| `INTERACTIONS` | `8192` | Component, slash-command, autocomplete, modal-submit interactions | Default in raw gateway |
| `ROLES` | `16384` | Room role create, update, delete, reorder | Default in raw gateway |
| `DM_REACTIONS` | `32768` | DM reaction add/remove (only DMs where bot participates) | Not included by default |
| `DM_MESSAGES` | `65536` | DM create events (only DMs where bot participates; content requires `MESSAGE_CONTENT`) | Not included by default |

---

## 3. Events

The gateway only dispatches events for installed rooms and lanes visible to the bot, matching requested intents.

- **Private threads**: Sent only if the bot is an authorized thread member.
- **Direct messages**: Opt-in via `DM_MESSAGES` / `DM_REACTIONS` where the bot is a participant. Content requires `MESSAGE_CONTENT`.

| Event | Intent | Delivery | Description |
| :--- | :--- | :--- | :--- |
| `ROOM_CREATE` | `ROOMS` | Live only | Room created |
| `ROOM_UPDATE` | `ROOMS` | Replayable | Room settings changed |
| `ROOM_DELETE` | `ROOMS` | Replayable | Room deleted |
| `ROOM_EXPRESSIONS_UPDATE` | `ROOMS` | Live only | Room emoji, sticker, or soundboard changed |
| `BOT_ROOM_ADD` | `ROOMS` | Live only | Bot installed in a room |
| `BOT_ROOM_REMOVE` | `ROOMS` | Live only | Bot removed from a room |
| `LANE_CREATE` | `ROOMS` | Replayable | Lane created |
| `LANE_UPDATE` | `ROOMS` | Replayable | Lane settings changed |
| `LANE_DELETE` | `ROOMS` | Replayable | Lane deleted |
| `LANE_REORDER` | `ROOMS` | Replayable | Room lanes reordered |
| `ROLE_CREATE` | `ROLES` | Replayable | Role created |
| `ROLE_UPDATE` | `ROLES` | Replayable | Role changed |
| `ROLE_DELETE` | `ROLES` | Replayable | Role deleted |
| `ROLE_POSITIONS_UPDATE` | `ROLES` | Replayable | Role positions changed |
| `MEMBER_JOIN` | `MEMBERS` | Replayable | Member joined room |
| `MEMBER_LEAVE` | `MEMBERS` | Replayable | Member left room |
| `MEMBER_ROLE_ADD` | `MEMBERS` | Replayable | Role assigned to member |
| `MEMBER_ROLE_REMOVE` | `MEMBERS` | Replayable | Role removed from member |
| `MEMBER_BAN` | `MODERATION` | Replayable | Member banned |
| `MEMBER_UNBAN` | `MODERATION` | Replayable | Member unbanned |
| `MEMBER_TIMEOUT` | `MODERATION` | Replayable | Member timeout changed |
| `ROOM_JOIN_REQUEST_UPDATE` | `MODERATION` | Live only | Room join request changed |
| `PRESENCE_UPDATE` | `PRESENCE` | Live only | Member presence changed |
| `MESSAGE_CREATE` | `MESSAGES` | Replayable | Message sent in visible lane |
| `MESSAGE_UPDATE` | `MESSAGES` | Replayable | Message edited |
| `MESSAGE_DELETE` | `MESSAGES` | Replayable | Message deleted |
| `DM_MESSAGE_CREATE` | `DM_MESSAGES` | Live only | DM created where bot participates (content redacted without `MESSAGE_CONTENT`) |
| `MENTION_NOTIFY` | `MESSAGES` | Live only | Visible message mentioned bot or configured recipient |
| `MESSAGE_REACTION_ADD` | `REACTIONS` | Live only | Reaction added to message |
| `MESSAGE_REACTION_REMOVE` | `REACTIONS` | Live only | Reaction removed from message |
| `DM_MESSAGE_REACTION_ADD` | `DM_REACTIONS` | Live only | Reaction added to DM (includes `channelId`, `messageId`, `userId`, `emoji`) |
| `DM_MESSAGE_REACTION_REMOVE` | `DM_REACTIONS` | Live only | Reaction removed from DM |
| `TYPING_START` | `MESSAGES` | Live only | Member started typing |
| `THREAD_CREATE` | `THREADS` | Replayable | Public thread created |
| `THREAD_UPDATE` | `THREADS` | Replayable | Public thread changed |
| `THREAD_DELETE` | `THREADS` | Replayable | Public thread deleted |
| `THREAD_MEMBER_ADD` | `THREADS` | Replayable | Member joined thread |
| `THREAD_MEMBER_REMOVE` | `THREADS` | Replayable | Member left thread |
| `INVITE_CREATE` | `INVITES` | Replayable | Invite created |
| `INVITE_UPDATE` | `INVITES` | Replayable | Invite updated |
| `INVITE_DELETE` | `INVITES` | Replayable | Invite revoked |
| `WEBHOOK_CREATE` | `WEBHOOKS` | Replayable | Webhook created (secret tokens omitted in replay) |
| `WEBHOOK_UPDATE` | `WEBHOOKS` | Replayable | Webhook updated (secret tokens omitted in replay) |
| `WEBHOOK_DELETE` | `WEBHOOKS` | Replayable | Webhook deleted |
| `POLL_VOTE_ADD` | `POLLS` | Replayable | Poll vote added |
| `POLL_VOTE_REMOVE` | `POLLS` | Replayable | Poll vote removed |
| `VOICE_ROSTER_UPDATE` | `VOICE_STATES` | Live only | Live voice roster changed |
| `SCHEDULED_EVENT_UPDATE` | `SCHEDULED_EVENTS` | Replayable | Scheduled event changed |
| `INTERACTION_CREATE` | `INTERACTIONS` | Live only | Interaction received (slash command, modal, button, autocomplete) |

---

## 4. Reconnects & Replay

- **Replay Mechanism**: On reconnect, the gateway scans durable room events starting after the last acknowledged cursor, dispatching one durable event at a time.
- Replayed events contain `gateway_event_id` and `gateway_event_replayed: true`.
- **Acknowledge**: Emit `gateway:ack` with `{ eventId }` only **after** your bot has safely processed and stored the work.
- **Retention**: Replay is retained for 30 days.
- **Replay Gap**: If the cursor is older than 30 days or the shard count changes, `BOT_GATEWAY_REPLAY_GAP` is emitted with `availableSince` and `reason`. The bot must re-sync state via the REST API.
- **Live-Only Events**: Typing, presence, voice roster, interactions, and DM events are live-only and never replayed.

```javascript
// replay.mjs
gateway.onAny((eventName, payload) => {
  if (typeof payload?.gateway_event_id !== 'string') return;

  // Persist work before acknowledging
  void handleEvent(eventName, payload).then(() => {
    gateway.emit('gateway:ack', { eventId: payload.gateway_event_id }, (result) => {
      if (!result?.success) console.error('Replay acknowledgement failed:', result?.error);
    });
  });
});

gateway.on('BOT_GATEWAY_REPLAY_GAP', ({ availableSince, reason }) => {
  console.warn('Some events are no longer available:', reason, availableSince);
  // Re-sync current state from REST API
});
```

---

## 5. Commands & Interactions

- **Registration**: Bot tokens **cannot** register commands; command definitions must be registered using the application owner's user session.
- **Types**: Slash commands (`type: 2`), user commands, message commands, autocomplete, and modal submissions arrive via `INTERACTION_CREATE`.
- **Deadlines**: Interactions have strict deadlines (autocomplete has a shorter window). Expired interactions cannot be recovered through replay.

```javascript
// command.mjs
import { BOT_GATEWAY_INTENTS, VeiledBotClient } from '@veiled/bot-sdk';

const client = new VeiledBotClient({
  token: process.env.VEILED_BOT_TOKEN,
  intents: BOT_GATEWAY_INTENTS.INTERACTIONS,
  shard: [0, 1],
});

client.on('INTERACTION_CREATE', async (interaction) => {
  if (interaction.type !== 2 || interaction.data?.name !== 'hello') return;
  await client.respondToCommandInteraction(interaction.interaction_id, {
    type: 'reply',
    content: 'Hello!',
    ephemeral: true,
  });
});

await client.connect();
```

---

## 6. Voice

- **Permissions**: Requires `View Channel` and `Connect` in the target lane.
- **Scope**: Bots can only join voice and stage channels in rooms. Bots **cannot** join DM or group calls (end-to-end encrypted).
- **Audio Specs**: Send Opus audio at 48 kHz with 20 ms packets.
- **Separate Connection**: Open a dedicated Socket.IO connection per voice channel using the same bot token.
- **WebRTC SFU Flow**:
  1. Register bot in voice lane: `POST /api/v1/voice/join` with `{ laneId, sessionId: voiceSocket.id }`.
  2. Send SDP offer via `voice:join-sfu` socket event; apply answer SDP returned by the SFU.
  3. Publish audio track via `voice:produce` socket event (retry if `"MID is not available"` error is returned).
  4. Disconnect by emitting `voice:leave-sfu` and calling `POST /api/v1/voice/leave`.

```javascript
// voice.mjs
// 1. Register the bot in the voice channel
await fetch(`${API}/voice/join`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ laneId, sessionId: voiceSocket.id }),
});

// 2. Send SDP offer, receive SFU answer SDP
const { answerSdp } = await ack('voice:join-sfu', {
  callId: laneId,
  userId: botUserId,
  offerSdp: peerConnection.localDescription.sdp,
  callType: 'ROOM', // 'STAGE' for stage channels
  sessionId: crypto.randomUUID(),
});
await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });

// 3. Publish audio track
await ack('voice:produce', {
  callId: laneId,
  callType: 'ROOM',
  trackId: track.id,
  kind: 'audio',
  mid: transceiver.mid,
  source: 'audio',
});

// 4. Leave channel
voiceSocket.emit('voice:leave-sfu', { callId: laneId, callType: 'ROOM' });
await fetch(`${API}/voice/leave`, { method: 'POST', headers, body: JSON.stringify({ laneId }) });
```
