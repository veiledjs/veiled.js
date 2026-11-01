# Example bot

A minimal bot that connects to the Veiled gateway and logs events. It does not send messages yet because the REST client is not implemented.

## Run

From the repository root:

```bash
cp exemple/.env.example .env
```

Edit `.env` and set `VEILED_BOT_TOKEN` to your bot token. Then:

```bash
bun run example:bot
```

Or run the file directly:

```bash
bun run exemple/index.ts
```

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `VEILED_BOT_TOKEN` | Yes | Bot token in `applicationId.secret` form. |
| `DEBUG_EVENTS` | No | Set to `true` to log every gateway event through `onAny`. |
| `DEBUG_GATEWAY` | No | Set to `true` to log connection lifecycle details. |

## Intents

The example requests `ROOMS`, `MESSAGES`, `REACTIONS`, and `INTERACTIONS`. `MESSAGE_CONTENT` is intentionally omitted because it requires staff approval. After approval, add it:

```ts
const intents = GatewayIntents.MESSAGES | GatewayIntents.MESSAGE_CONTENT;
```

## What happens on shutdown

`SIGINT` and `SIGTERM` call `bot.disconnect()`, which closes the socket and disables reconnection.

## Current limitations

- Incoming event payloads are raw objects.
- Sending, editing, and deleting messages will be added with the REST client.
- Slash command registration requires a user session and is not part of the bot client.
