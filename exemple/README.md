# Example bot

A small test bot that connects to the Veiled gateway and exercises the public bot API.

It uses every gateway intent, `BotClient.rest` / `BotClient.api`, `BotAPIError`, gateway lifecycle events, `onAny`, Components V2, staged uploads, interaction replies, and every public `BotREST` method through `!call`.

## Run

From the repository root:

```bash
cp exemple/.env.example .env
```

Edit `.env` and set `VEILED_BOT_TOKEN`. Then:

```bash
bun run example:bot
```

Or run the file directly:

```bash
bun run exemple/index.ts
```

## Commands

Lane-scoped commands use the lane they were sent in. Room-scoped commands use the current room, `ROOM_ID`, or the first joined room.

| Command | What it tests |
| --- | --- |
| `!help` | Command list. |
| `!me` | `getMe` |
| `!rooms` | `getMyRooms` |
| `!gateway` | `getGateway` |
| `!room [roomId]` | `getRoom` |
| `!lanes [roomId]` | `getLanes` |
| `!lane [laneId]` | `getLane`, `getLaneCapabilities` |
| `!members [roomId]` | `getMembers` |
| `!roles [roomId]` | `getRoomRoles` |
| `!messages [laneId]` | `getMessages` |
| `!send <text>` | `sendMessage` |
| `!reply <text>` | `sendMessage` with `replyToId` |
| `!edit [messageId] <text>` | `editMessage`; edits the command message when no ID is given. |
| `!delete [messageId]` | `deleteMessage`; deletes the command message when no ID is given. |
| `!react [messageId] <emoji>` | `addReaction`; reacts to the command message when no ID is given. |
| `!pin [messageId]`, `!unpin [messageId]` | Pin/unpin. |
| `!typing` | `sendTyping` |
| `!poll <question> \| <option> \| <option>` | `createPoll` |
| `!thread <name>` | `createThread` |
| `!threads [laneId]` | `getLaneThreads` |
| `!invites [roomId]`, `!invite [roomId]` | List/create invites. |
| `!events [roomId]` | `getScheduledEvents` |
| `!webhooks [laneId]` | `getLaneWebhooks` |
| `!voice [laneId]` | Voice states, ICE servers, and TURN credentials. |
| `!card [text]` | `sendContainer` with sections, divider, footer, accent, and link button. |
| `!files [text]` | `stageUpload` through `sendContainerWithFiles`. |
| `!tour [laneId]` | Read-only sweep across room, lane, member, role, message, thread, invite, event, webhook, and voice routes. |
| `!methods` | List every public `BotREST` method. |
| `!call <method> [jsonArgs]` | Call any public `BotREST` method. |

Examples:

```text
!call getMe
!call getMyRooms
!call sendMessage ["laneId",{"content":"hello"}]
!call createThread ["laneId",{"name":"example"}]
!call updateRole ["roleId",{"name":"test"}]
!call deleteMessage ["messageId"]
```

`!call` can invoke destructive moderation methods. Use it in a test room with a token you control.

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `VEILED_BOT_TOKEN` | Yes | Bot token in `applicationId.secret` form. |
| `BOT_PREFIX` | No | Command prefix. Defaults to `!`. |
| `ROOM_ID` | No | Default room for room-scoped commands and `!tour`. |
| `LANE_ID` | No | Default lane for `!tour`. |
| `DEBUG_EVENTS` | No | Set to `true` to log every parsed gateway event structure. |
| `DEBUG_GATEWAY` | No | Set to `true` to log connection lifecycle details. |

## Intents

The example requests every intent in `GatewayIntents`, including `MESSAGE_CONTENT`, `MEMBERS`, and `PRESENCE`. These must be approved for your application.

## Shutdown

`SIGINT` and `SIGTERM` call `bot.disconnect()`, which closes the socket and disables reconnection.

## Notes

- Gateway events and REST responses are parsed structures; use `.raw` for the original payload.
- Owner-session/OAuth endpoints are not available to bot tokens and are not part of `BotREST`.
- Slash command registration requires a user session.
