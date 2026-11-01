# veiled.js

A small TypeScript library for Veiled's API. It handles webhooks, bot gateway connections, and the bot REST API without mixing those concerns.

> **Heads up:** veiled.js only runs on Bun. Node and Deno are not supported.

## Install

```bash
bun add veiled.js
```

## Sending a webhook

```ts
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    WebhookClient,
    WebhookMessageBuilder,
} from "veiled.js";

const client = new WebhookClient(Bun.env.WEBHOOK_URL!);

const message = await client.send(
    new WebhookMessageBuilder()
        .setUsername("Deploy bot")
        .setAvatarUrl("https://example.com/avatar.png")
        .setContent("Deployment finished.")
        .addEmbed(
            new EmbedBuilder()
                .setTitle("Production deploy succeeded")
                .setDescription("Version `1.2.3` is live.")
                .setUrl("https://example.com/releases/1.2.3")
                .setColor(0x949ba4)
                .setAuthor("CI", "https://example.com", "https://example.com/icon.png")
                .addField("Environment", "Production", true)
                .addField("Branch", "main", true)
                .setFooter("Deployments")
                .setTimestamp()
        )
        .addActionRow(
            new ActionRowBuilder()
                .addLinkButton("View release", "https://example.com/releases/1.2.3")
                .addButton(ButtonBuilder.primary("Redeploy", "redeploy"))
        )
);

console.log(message.id);
```

If you just want plain text, `send` takes a string too:

```ts
await client.send("Hello from veiled.js");
```

`send` returns a parsed `Message`. It throws `WebhookAPIError` for non-2xx responses, so you don't have to check `response.ok` yourself. Every structure keeps its raw payload in `.raw` in case you need something that isn't typed yet.

## Connecting a bot

```ts
import { BotClient, GatewayEvents, GatewayIntents } from "veiled.js";

const bot = new BotClient({
    token: Bun.env.VEILED_BOT_TOKEN!,
    intents: GatewayIntents.MESSAGES | GatewayIntents.MESSAGE_CONTENT,
    shard: [0, 1],
});

bot.on(GatewayEvents.MESSAGE_CREATE, (payload, context) => {
    console.log(payload);
    // Listeners are awaited and durable events are acknowledged automatically.
});

bot.on("replayGap", (gap) => {
    console.warn("Replay gap:", gap.reason, gap.availableSince);
});

await bot.connect();
```

`BotClient` fetches the gateway URL from `GET /api/v1/bots/gateway` by default. Pass `gatewayUrl` or `urlResolver` to override that, and `apiBaseUrl` to point at a different API host. Auth tokens are normalized to `Bot <token>`.

- `autoAck` defaults to `true`. Durable events are acked only after every listener finishes successfully. Set it to `false` to call `context.ack()` yourself.
- `onAny` receives every gateway event. `replayGap` is emitted separately and is never acked.
- `disconnect()` closes intentionally and disables reconnection. Socket.IO reconnects are surfaced through `reconnecting`, `reconnected`, and `reconnectFailed`.
- The initial `connect()` rejects on failure. Errors after a successful connection, such as failed reconnect attempts, are emitted as `error`.
- Gateway event payloads are currently raw objects. Typed payload structures will be added when their schemas are available.

A runnable example lives in [`exemple/`](./exemple). Set `VEILED_BOT_TOKEN` in `.env` and run `bun run example:bot`.

## Bot REST API

`BotClient` exposes a `BotREST` instance as `bot.rest`, with `bot.api` as an alias:

```ts
const me = await bot.rest.getMe();
const rooms = await bot.rest.getMyRooms();
const lanes = await bot.rest.getLanes(roomId);

await bot.rest.sendMessage(laneId, {
    content: "Hello from veiled.js",
});

await bot.rest.sendContainer(laneId, {
    title: "Build finished",
    description: "The deploy is live.",
    linkButtons: [{ label: "Open site", url: "https://example.com" }],
});

const messages = await bot.rest.getMessages(laneId, { limit: 10 });
```

`sendContainerWithFiles()` stages uploads and sends them with a CV2 container. `createContainer()` and `isValidContainerPayload()` are exported for building or validating the raw component payload yourself.

The bot client covers the bot, room, lane, member, role, moderation, message, reaction, pin, thread, invite, scheduled-event, voice, upload, webhook, and interaction routes. Methods accept the same IDs and payload field names as the Veiled API. IDs and emoji values are URL-encoded automatically, and query objects are supported alongside raw query strings.

Failed requests throw `BotAPIError`. Its `status`, `body`, `details`, and `retryAfter` fields make it possible to distinguish rate limits, permission failures, and other API errors.

For an endpoint without a typed wrapper, use the scoped request helper:

```ts
const data = await bot.rest.request<{ ok: boolean }>("/bots/@me", {
    method: "GET",
});
```

Owner-session endpoints such as application-command management, interaction submissions from browser users, and OAuth are intentionally not part of `BotREST`; they require a Veiled user session rather than a bot token.

## Builders

- `WebhookMessageBuilder` handles `username`, `avatar_url`, `content`, `embeds`, and `components`.
- `EmbedBuilder` covers title, description, URL, color, author, thumbnail, image, fields, footer, and timestamp.
- `ActionRowBuilder` holds up to five buttons.
- `ButtonBuilder` has `link`, `primary`, `secondary`, `success`, `danger`, and `custom` helpers. `setDisabled()` works on all of them.
- `MessageBuilder` is the shared base, so channels can reuse it later.
- `createContainer` builds a Components V2 container with text sections, dividers, footers, accent color, and link buttons.

## Validation

Payloads are checked in `toJSON()` before anything is sent. Length and count limits live in `LIMITS` and match the API. Invalid URLs, missing link button URLs, empty custom IDs, and similar mistakes throw early instead of coming back as a failed request.

## Tests

```bash
bun run test             # unit tests, no network
bun run test:integration # sends a real webhook
bun run typecheck
```

The integration test needs `WEBHOOK_URL` in your environment or `.env`. Without it, the test is skipped.

## Project layout

```txt
src/
  builders/    outgoing payload builders
  structures/  parsed API responses
  types/       request, response, and gateway DTOs
  rest/        bot, webhook, and gateway HTTP transport
  gateway/     Socket.IO connection and gateway primitives
  client/      public clients
```

The split is intentional: builders never parse responses, structures never build requests, `WebhookREST` only knows how to POST a webhook payload, and `GatewayConnection` only knows how to maintain the Socket.IO connection.

## Status

Webhooks, bot gateway connections, and the bot REST API are implemented. Gateway event payloads are still raw, and typed response structures for rooms, lanes, roles, threads, and scheduled events currently preserve the API's raw shape. Webhook response structures remain fully parsed.

## License

MIT
