import {
    BotAPIError,
    BotClient,
    BotREST,
    GatewayEvents,
    GatewayIntents,
    Interaction,
    Message,
} from "../src";

const token = Bun.env.VEILED_BOT_TOKEN;
const prefix = Bun.env.BOT_PREFIX ?? "!";
const debugEvents = Bun.env.DEBUG_EVENTS === "true";
const debugGateway = Bun.env.DEBUG_GATEWAY === "true";
const allIntents = Object.values(GatewayIntents).reduce((mask, intent) => mask | intent, 0);

if (!token) {
    throw new Error("VEILED_BOT_TOKEN is required");
}

const bot = new BotClient({
    token,
    intents: allIntents,
    shard: [0, 1],
    debug: debugGateway,
});

const privateMethods = new Set([
    "constructor",
    "resolveUrl",
    "containerComponents",
    "threadAction",
]);
const methodNames = Object.getOwnPropertyNames(BotREST.prototype)
    .filter((name) => !privateMethods.has(name)
        && typeof (BotREST.prototype as unknown as Record<string, unknown>)[name] === "function")
    .sort();

let botUserId = "";

type CommandContext = {
    laneId: string;
    roomId: string;
    messageId: string;
    args: string;
};

type CommandHandler = (context: CommandContext) => Promise<void>;

const helpText = [
    "veiled.js test commands",
    `${prefix}me | ${prefix}rooms | ${prefix}gateway`,
    `${prefix}room [roomId] | ${prefix}lanes [roomId] | ${prefix}lane [laneId]`,
    `${prefix}members [roomId] | ${prefix}roles [roomId]`,
    `${prefix}messages [laneId] | ${prefix}send <text> | ${prefix}reply <text>`,
    `${prefix}edit [messageId] <text> | ${prefix}delete [messageId]`,
    `${prefix}react [messageId] <emoji> | ${prefix}pin [messageId] | ${prefix}unpin [messageId]`,
    `${prefix}typing | ${prefix}poll <question> | <option> | <option>`,
    `${prefix}thread <name> | ${prefix}threads [laneId]`,
    `${prefix}invites [roomId] | ${prefix}invite [roomId]`,
    `${prefix}events [roomId] | ${prefix}webhooks [laneId] | ${prefix}voice [laneId]`,
    `${prefix}card [text] | ${prefix}files [text]`,
    `${prefix}tour [laneId] | ${prefix}methods`,
    `${prefix}call <method> [jsonArgs]`,
    "",
    `Example: ${prefix}call getMe`,
    `${prefix}call sendMessage ["laneId",{"content":"hello"}]`,
].join("\n");

const commands: Record<string, CommandHandler> = {
    help: ({ laneId }) => reply(laneId, helpText),
    methods: ({ laneId }) => reply(laneId, methodNames.join(", ")),
    me: ({ laneId }) => show(laneId, () => bot.rest.getMe()),
    rooms: ({ laneId }) => show(laneId, () => bot.rest.getMyRooms()),
    gateway: ({ laneId }) => show(laneId, () => bot.rest.getGateway()),
    room: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getRoom(
        targetId(args, roomId, "room"),
    )),
    lanes: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getLanes(
        targetId(args, roomId, "room"),
    )),
    lane: ({ laneId, args }) => show(laneId, async () => {
        const id = targetId(args, laneId, "lane");
        return {
            lane: await bot.rest.getLane(id),
            capabilities: await attempt(() => bot.rest.getLaneCapabilities(id)),
        };
    }),
    members: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getMembers(
        targetId(args, roomId, "room"),
        { limit: 10 },
    )),
    roles: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getRoomRoles(
        targetId(args, roomId, "room"),
    )),
    messages: ({ laneId, args }) => show(laneId, () => bot.rest.getMessages(
        targetId(args, laneId, "lane"),
        { limit: 10 },
    )),
    send: ({ laneId, args }) => show(laneId, () => bot.rest.sendMessage(
        laneId,
        args || "test message",
    )),
    reply: ({ laneId, messageId, args }) => show(laneId, () => bot.rest.sendMessage(laneId, {
        content: args || "test reply",
        ...(messageId ? { replyToId: messageId } : {}),
    })),
    edit: ({ laneId, messageId, args }) => show(laneId, () => {
        const target = targetText(args, messageId, "message");
        if (!target.text) throw new Error("Text is required.");
        return bot.rest.editMessage(target.id, { content: target.text });
    }),
    delete: ({ laneId, messageId, args }) => show(laneId, () => bot.rest.deleteMessage(
        targetId(args, messageId, "message"),
    )),
    react: ({ laneId, messageId, args }) => show(laneId, () => {
        const target = targetText(args, messageId, "message");
        if (!target.text) throw new Error("An emoji is required.");
        return bot.rest.addReaction(target.id, target.text);
    }),
    pin: ({ laneId, messageId, args }) => show(laneId, () => bot.rest.pinMessage(
        targetId(args, messageId, "message"),
    )),
    unpin: ({ laneId, messageId, args }) => show(laneId, () => bot.rest.unpinMessage(
        targetId(args, messageId, "message"),
    )),
    typing: ({ laneId }) => show(laneId, () => bot.rest.sendTyping(laneId)),
    poll: async ({ laneId, args }) => {
        const [question, ...options] = args.split("|").map((part) => part.trim()).filter(Boolean);

        if (!question || options.length < 2) {
            await reply(laneId, `Use ${prefix}poll question | option | option`);
            return;
        }

        await show(laneId, () => bot.rest.createPoll(laneId, { question, options }));
    },
    thread: ({ laneId, args }) => show(laneId, () => bot.rest.createThread(laneId, {
        name: args || "test thread",
    })),
    threads: ({ laneId, args }) => show(laneId, () => bot.rest.getLaneThreads(
        targetId(args, laneId, "lane"),
        { limit: 10 },
    )),
    invites: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getRoomInvites(
        targetId(args, roomId, "room"),
    )),
    invite: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.createInvite(
        targetId(args, roomId, "room"),
        {},
    )),
    events: ({ laneId, roomId, args }) => show(laneId, () => bot.rest.getScheduledEvents(
        targetId(args, roomId, "room"),
        { limit: 10 },
    )),
    webhooks: ({ laneId, args }) => show(laneId, () => bot.rest.getLaneWebhooks(
        targetId(args, laneId, "lane"),
    )),
    voice: ({ laneId, args }) => show(laneId, async () => {
        const id = targetId(args, laneId, "lane");
        return {
            states: await attempt(() => bot.rest.getVoiceStates(id)),
            iceServers: await attempt(() => bot.rest.getVoiceIceServers(id)),
            turnCredentials: await attempt(() => bot.rest.getVoiceTurnCredentials(id)),
        };
    }),
    card: ({ laneId, args }) => card(laneId, args),
    files: ({ laneId, args }) => files(laneId, args),
    tour: ({ laneId, roomId, args }) => tour(laneId, roomId, args),
    call: ({ laneId, args }) => callMethod(laneId, args),
};

bot.on("connected", () => {
    console.log("Connected to the Veiled gateway.");
});

bot.on("reconnected", () => {
    console.log("Reconnected to the Veiled gateway.");
    void identify();
});

bot.on("reconnecting", (attempt) => {
    console.log(`Reconnecting to the gateway (attempt ${attempt})...`);
});

bot.on("reconnectFailed", () => {
    console.error("Gateway reconnection failed.");
});

bot.on("disconnected", (info) => {
    console.log("Disconnected from the gateway:", info.reason);
});

bot.on("replayGap", (gap) => {
    console.warn("Replay gap:", gap.reason ?? "unknown reason", gap.availableSince ?? "unknown");
});

bot.on("error", (error) => {
    console.error("Gateway error:", error.message);
});

bot.onAny((name, payload) => {
    if (debugEvents) {
        console.log(`[event] ${name}`, payload);
    } else {
        console.log(`[event] ${name}`);
    }
});

bot.on(GatewayEvents.MESSAGE_CREATE, (message) => {
    void handleMessage(message);
});

bot.on(GatewayEvents.INTERACTION_CREATE, (interaction) => {
    void handleInteraction(interaction);
});

async function identify(): Promise<void> {
    try {
        const identity = await bot.rest.getMe();
        botUserId = identity?.user?.id ?? "";
        console.log(`Signed in as ${identity?.user?.username ?? (botUserId || "unknown")}.`);
    } catch (error) {
        console.error("Could not load the bot identity:", errorMessage(error));
    }
}

async function handleMessage(message: Message): Promise<void> {
    const raw = message.raw as unknown as Record<string, unknown>;
    const lane = plain(raw.lane);
    const laneId = message.laneId;
    const roomId = message.roomId
        || stringOf(raw.roomId)
        || stringOf(raw.guildId)
        || stringOf(raw.guild_id)
        || stringOf(lane.roomId)
        || Bun.env.ROOM_ID
        || "";
    const messageId = message.id;
    const content = message.content.trim();
    const author = message.author;

    if (!laneId || !content.startsWith(prefix)) return;
    if (author.id && author.id === botUserId) return;
    if (author.bot || author.isWebhook || message.webhookId) return;

    const text = content.slice(prefix.length).trim();
    const match = text.match(/^(\S+)(?:\s+([\s\S]*))?$/);

    if (!match) return;

    const command = (match[1] ?? "").toLowerCase();
    const handler = commands[command];

    if (!handler) return;

    try {
        await handler({
            laneId,
            roomId,
            messageId,
            args: (match[2] ?? "").trim(),
        });
    } catch (error) {
        console.error(`[${command}]`, errorMessage(error));
        await reply(laneId, `Error: ${errorMessage(error)}`).catch(() => {});
    }
}

async function callMethod(laneId: string, rawArgs: string): Promise<void> {
    const match = rawArgs.match(/^(\S+)(?:\s+([\s\S]*))?$/);

    if (!match) {
        await reply(laneId, `Use ${prefix}call <method> [jsonArgs]. Try ${prefix}methods.`);
        return;
    }

    const name = match[1] ?? "";
    const json = match[2] ?? "";
    const method = (bot.rest as unknown as Record<string, (...args: unknown[]) => unknown>)[name];

    if (!methodNames.includes(name) || typeof method !== "function") {
        await reply(laneId, `Unknown method: ${name}`);
        return;
    }

    const args = json ? JSON.parse(json) as unknown : [];

    if (!Array.isArray(args)) {
        throw new TypeError("Arguments must be a JSON array.");
    }

    const result = await method.apply(bot.rest, args);
    await sendJson(laneId, result ?? "ok");
}

async function tour(laneId: string, roomIdHint: string, rawArgs: string): Promise<void> {
    const requestedLaneId = rawArgs.split(/\s+/)[0] || Bun.env.LANE_ID || laneId;
    const me = await bot.rest.getMe();
    const rooms = list(await bot.rest.getMyRooms(), "rooms");
    const roomId = Bun.env.ROOM_ID || roomIdHint || idOf(rooms[0]);

    if (!roomId) {
        throw new Error("The bot is not installed in a room.");
    }

    const lanes = list(await bot.rest.getLanes(roomId), "lanes");
    const targetLaneId = requestedLaneId || idOf(lanes[0]);

    if (!targetLaneId) {
        throw new Error("No lane was found.");
    }

    const members = list(await attempt(() => bot.rest.getMembers(roomId, { limit: 5 })), "members");
    const roles = list(await attempt(() => bot.rest.getRoomRoles(roomId)), "roles");
    const messages = list(await attempt(() => bot.rest.getMessages(targetLaneId, { limit: 5 })), "messages");
    const threads = list(await attempt(() => bot.rest.getLaneThreads(targetLaneId, { limit: 5 })), "threads");
    const invites = list(await attempt(() => bot.rest.getRoomInvites(roomId)), "invites");
    const events = list(await attempt(() => bot.rest.getScheduledEvents(roomId, { limit: 5 })), "events");
    const webhooks = list(await attempt(() => bot.rest.getLaneWebhooks(targetLaneId)), "webhooks");
    const memberId = idOf(members[0]);
    const roleId = idOf(roles[0]);
    const messageId = idOf(messages[0]);
    const threadId = idOf(threads[0]);
    const inviteCode = stringOf(invites[0]?.code);
    const eventId = idOf(events[0]);
    const webhookId = idOf(webhooks[0]);

    const result = {
        me,
        rooms: await attempt(() => bot.rest.getMyRooms()),
        room: await attempt(() => bot.rest.getRoom(roomId)),
        lanes: await attempt(() => bot.rest.getLanes(roomId)),
        members: await attempt(() => bot.rest.getMembers(roomId, { limit: 5 })),
        roles: await attempt(() => bot.rest.getRoomRoles(roomId)),
        roleMembers: roleId
            ? await attempt(() => bot.rest.getRoleMembers(roomId, roleId))
            : "skipped: no role",
        memberRoles: memberId
            ? await attempt(() => bot.rest.getMemberRoles(roomId, memberId))
            : "skipped: no member",
        memberPermissions: memberId
            ? await attempt(() => bot.rest.getMemberPermissions(roomId, memberId))
            : "skipped: no member",
        roomInvites: await attempt(() => bot.rest.getRoomInvites(roomId)),
        invite: inviteCode
            ? await attempt(() => bot.rest.getInvite(inviteCode))
            : "skipped: no invite",
        scheduledEvents: await attempt(() => bot.rest.getScheduledEvents(roomId, { limit: 5 })),
        scheduledEvent: eventId
            ? await attempt(() => bot.rest.getScheduledEvent(eventId))
            : "skipped: no event",
        lane: await attempt(() => bot.rest.getLane(targetLaneId)),
        capabilities: await attempt(() => bot.rest.getLaneCapabilities(targetLaneId)),
        messages: await attempt(() => bot.rest.getMessages(targetLaneId, { limit: 5 })),
        pins: await attempt(() => bot.rest.getPins(targetLaneId)),
        reactions: messageId
            ? await attempt(() => bot.rest.getReactions(messageId, "👍", { limit: 5 }))
            : "skipped: no message",
        threads: await attempt(() => bot.rest.getLaneThreads(targetLaneId, { limit: 5 })),
        joinedThreads: await attempt(() => bot.rest.getJoinedThreads(roomId)),
        thread: threadId
            ? await attempt(() => bot.rest.getThread(threadId))
            : "skipped: no thread",
        threadMessages: threadId
            ? await attempt(() => bot.rest.getThreadMessages(threadId, { limit: 5 }))
            : "skipped: no thread",
        threadMembers: threadId
            ? await attempt(() => bot.rest.getThreadMembers(threadId))
            : "skipped: no thread",
        webhooks: await attempt(() => bot.rest.getLaneWebhooks(targetLaneId)),
        webhook: webhookId
            ? await attempt(() => bot.rest.getWebhook(webhookId))
            : "skipped: no webhook",
        voiceStates: await attempt(() => bot.rest.getVoiceStates(targetLaneId)),
        iceServers: await attempt(() => bot.rest.getVoiceIceServers(targetLaneId)),
        turnCredentials: await attempt(() => bot.rest.getVoiceTurnCredentials(targetLaneId)),
    };

    await sendJson(laneId, result);
}

async function card(laneId: string, text: string): Promise<void> {
    await bot.rest.sendContainer(laneId, {
        title: "veiled.js container",
        description: text || "This message uses Components V2.",
        sections: [
            { divider: true, content: `Gateway state: **${bot.state}**` },
            { content: "Sections, dividers, footer, accent color, and link buttons all work." },
        ],
        footer: "exemple/index.ts",
        accentColor: 0x5865f2,
        linkButtons: [{ label: "Veiled", url: "https://veiled.lol" }],
    });
}

async function files(laneId: string, text: string): Promise<void> {
    const body = text || `Uploaded by the veiled.js example at ${new Date().toISOString()}.`;
    const data = new TextEncoder().encode(body);

    await bot.rest.sendContainerWithFiles(laneId, {
        title: "Staged upload",
        description: "This file was uploaded first, then sent with `stagedUploadIds`.",
    }, [
        {
            data,
            filename: "example.txt",
            contentType: "text/plain",
        },
    ]);
}

async function handleInteraction(interaction: Interaction): Promise<void> {
    const interactionId = interaction.id;

    if (!interactionId) return;

    const response = {
        type: "reply",
        content: "Interaction received by the veiled.js example bot.",
        ephemeral: true,
    };

    try {
        await bot.rest.respondToInteraction(interactionId, response);
    } catch {
        await bot.rest.respondToCommandInteraction(interactionId, response).catch((error) => {
            console.error("Could not answer interaction:", errorMessage(error));
        });
    }
}

async function show<T>(laneId: string, run: () => Promise<T>): Promise<void> {
    await sendJson(laneId, await run());
}

function targetId(args: string, fallback: string, label: string): string {
    const id = args.trim().split(/\s+/)[0] || fallback;

    if (!id) throw new Error(`A ${label} ID is required.`);

    return id;
}

function targetText(args: string, fallback: string, label: string): { id: string; text: string } {
    const text = args.trim();
    const words = text.split(/\s+/).filter(Boolean);
    const first = words[0] ?? "";

    if (words.length === 0) {
        if (fallback) return { id: fallback, text: "" };
        throw new Error(`A ${label} ID is required.`);
    }

    if (words.length >= 2 && looksLikeId(first)) {
        return { id: first, text: text.slice(first.length).trim() };
    }

    if (!fallback) {
        if (words.length < 2) throw new Error(`A ${label} ID is required.`);
        return { id: first, text: text.slice(first.length).trim() };
    }

    return { id: fallback, text };
}

function looksLikeId(value: string): boolean {
    return /^\d{10,}$/.test(value)
        || /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(value)
        || /^[A-Za-z0-9_-]{24,}$/.test(value);
}

async function reply(laneId: string, content: string): Promise<void> {
    await bot.rest.sendMessage(laneId, { content });
}

async function sendJson(laneId: string, value: unknown): Promise<void> {
    const text = stringify(value);
    const limit = 12_000;
    const output = text.length > limit ? `${text.slice(0, limit)}\n... truncated` : text;

    for (let index = 0; index < output.length; index += 3_900) {
        await reply(laneId, output.slice(index, index + 3_900));
    }
}

async function attempt<T>(run: () => Promise<T>): Promise<T | { error: string }> {
    try {
        return await run();
    } catch (error) {
        return { error: errorMessage(error) };
    }
}

function stringify(value: unknown): string {
    if (typeof value === "string") return value;

    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

function plain(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function list(value: unknown, key: string): Array<Record<string, unknown>> {
    if (Array.isArray(value)) return value.map(plain);

    const root = plain(value);
    const data = plain(root.data);

    for (const source of [root[key], data[key], root.data]) {
        if (Array.isArray(source)) return source.map(plain);
    }

    return [];
}

function idOf(value: unknown): string {
    const item = plain(value);

    for (const key of ["id", "userId", "roleId", "messageId", "threadId", "eventId", "webhookId"]) {
        const id = stringOf(item[key]);
        if (id) return id;
    }

    return "";
}

function stringOf(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
    if (error instanceof BotAPIError) {
        return `Bot API ${error.status}: ${error.message}`;
    }

    return error instanceof Error ? error.message : String(error);
}

async function shutdown(): Promise<void> {
    console.log("Disconnecting from the gateway...");
    await bot.disconnect();
    process.exit(0);
}

process.on("SIGINT", () => {
    void shutdown();
});

process.on("SIGTERM", () => {
    void shutdown();
});

try {
    await bot.connect();
    await identify();
} catch (error) {
    console.error("Failed to start:", errorMessage(error));
    process.exit(1);
}
