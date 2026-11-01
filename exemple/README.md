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

Lane-scoped commands use the lane they were sent in. Room-scoped commands use the current room, `ROOM_ID`, or the supplied ID. Command output is rendered with embeds; panels use Components V2 containers. `!help` uses an interactive CV2 category menu with select and page buttons.

`!help`, `!help <command>`, `!methods`, `!call <method> [jsonArgs]`, `!tour [laneId]`

| Area | Commands |
| --- | --- |
| Core | `!ping`, `!status`, `!uptime`, `!me`, `!gateway`, `!info [roomId]`, `!card [text]`, `!sendEmbed <title> \| <description>` |
| Rooms | `!rooms`, `!room [roomId]`, `!lanes [roomId]`, `!lane [laneId]`, `!members [roomId]`, `!roles [roomId]` |
| Members and roles | `!roleMembers <roleId> [roomId]`, `!memberRoles <userId> [roomId]`, `!permissions <userId> [roomId]`, `!createRole`, `!updateRole`, `!deleteRole`, `!assignRole`, `!unassignRole`, `!roleColor` |
| Messages | `!messages [laneId]`, `!send`, `!echo`, `!reply`, `!edit`, `!delete`, `!react`, `!unreact`, `!reactions`, `!pin`, `!unpin`, `!pins`, `!typing`, `!poll`, `!whoami` |
| Moderation | `!kick`, `!ban`, `!unban`, `!timeout`, `!untimeout` |
| Threads | `!thread`, `!threads`, `!joinedThreads`, `!threadInfo`, `!threadMessages`, `!threadMembers`, `!threadSend`, `!threadUpdate`, `!threadArchive`, `!threadUnarchive`, `!threadLock`, `!threadUnlock`, `!threadPin`, `!threadPublish`, `!threadDelete`, `!threadAddMember`, `!threadRemoveMember` |
| Invites | `!invites`, `!invite`, `!inviteInfo`, `!inviteUpdate`, `!inviteDelete` |
| Events | `!events`, `!event`, `!eventCreate`, `!eventUpdate`, `!eventDelete`, `!rsvp`, `!unrsvp` |
| Webhooks | `!webhooks`, `!webhook`, `!webhookCreate`, `!webhookUpdate`, `!webhookReset`, `!webhookDelete` |
| Voice | `!voice [laneId]`, `!voiceJoin`, `!voiceLeave`, `!ice`, `!turn` |
| Uploads | `!files [text]`, `!upload <filename> [text]`, `!jsonFile [text]` |

Examples:

```text
!help
!help threadSend
!call getMe
!call sendMessage ["laneId",{"content":"hello"}]
!call createThread ["laneId",{"name":"example"}]
!call updateRole ["roleId",{"name":"test"}]
```

`!call` can invoke destructive moderation methods. Use it in a test room with a token you control.

## Layout

```txt
exemple/
  index.ts           gateway events, command dispatch, interaction replies
  config.ts          environment and intent configuration
  client.ts          BotClient instance, method registry, runtime state
  commands/          command modules grouped by API area
  lib/               embeds, containers, replies, argument parsing, formatting
```

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
