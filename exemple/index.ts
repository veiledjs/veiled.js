import { BotClient, GatewayEvents, GatewayIntents } from "../src";

const token = Bun.env.VEILED_BOT_TOKEN;

if (!token) {
    throw new Error("VEILED_BOT_TOKEN is required");
}

const intents = GatewayIntents.ROOMS
    | GatewayIntents.MESSAGES
    | GatewayIntents.REACTIONS
    | GatewayIntents.INTERACTIONS;

const bot = new BotClient({
    token,
    intents,
    shard: [0, 1],
    debug: Bun.env.DEBUG_GATEWAY === "true",
});

bot.on("connected", () => {
    console.log("Connected to the Veiled gateway.");
});

bot.on("reconnected", () => {
    console.log("Reconnected to the Veiled gateway.");
});

bot.on("reconnecting", (attempt) => {
    console.log(`Reconnecting to the gateway (attempt ${attempt})...`);
});

bot.on("reconnectFailed", () => {
    console.error("Gateway reconnection failed.");
});

bot.on("replayGap", (gap) => {
    console.warn(
        "Replay gap:",
        gap.reason ?? "unknown reason",
        gap.availableSince ?? "unknown",
    );
});

bot.on("error", (error) => {
    console.error("Gateway error:", error.message);
});

bot.on(GatewayEvents.MESSAGE_CREATE, (payload, context) => {
    const laneId = String(payload.laneId ?? "unknown");
    const userId = String(payload.userId ?? "unknown");
    const content = String(payload.content ?? "");

    console.log(`[message] lane=${laneId} user=${userId} content=${content}`);

    if (context.replayed) {
        console.log("[message] replayed event");
    }
});

bot.on(GatewayEvents.MESSAGE_REACTION_ADD, (payload) => {
    console.log("[reaction]", payload);
});

bot.on(GatewayEvents.INTERACTION_CREATE, (payload) => {
    console.log("[interaction]", payload);
});

if (Bun.env.DEBUG_EVENTS === "true") {
    bot.onAny((name, payload) => {
        console.log(`[event] ${name}`, payload);
    });
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
} catch (error) {
    console.error("Failed to connect:", error instanceof Error ? error.message : error);
    process.exit(1);
}
