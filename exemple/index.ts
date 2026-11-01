import {
    BotAPIError,
    EmbedBuilder,
    GatewayEvents,
    Interaction,
    Message,
} from "../src";
import { bot, runtime } from "./client";
import {
    debugEvents,
    defaultLaneId,
    defaultRoomId,
    prefix,
} from "./config";
import { resolveCommand } from "./commands";
import { reply } from "./lib/respond";
import { colors, plain, stringOf } from "./lib/format";

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

bot.on(GatewayEvents.MEMBER_JOIN, (member) => {
    console.log(`Member joined: ${member.nickname ?? member.user?.displayName ?? member.userId}`);
});

bot.on(GatewayEvents.THREAD_CREATE, (thread) => {
    console.log(`Thread created: ${thread.name ?? thread.id}`);
});

async function identify(): Promise<void> {
    try {
        const identity = await bot.rest.getMe();
        runtime.botUserId = identity?.user?.id ?? "";
        console.log(`Signed in as ${identity?.user?.username ?? (runtime.botUserId || "unknown")}.`);
    } catch (error) {
        console.error("Could not load the bot identity:", errorMessage(error));
    }
}

async function handleMessage(message: Message): Promise<void> {
    const raw = message.raw as unknown as Record<string, unknown>;
    const lane = plain(raw.lane);
    const laneId = message.laneId || defaultLaneId;
    const roomId = message.roomId
        || stringOf(raw.roomId)
        || stringOf(raw.guildId)
        || stringOf(raw.guild_id)
        || stringOf(lane.roomId)
        || defaultRoomId;
    const content = message.content.trim();
    const author = message.author;

    if (!laneId || !content.startsWith(prefix)) return;
    if (author.id && author.id === runtime.botUserId) return;
    if (author.bot || author.isWebhook || message.webhookId) return;

    const text = content.slice(prefix.length).trim();
    const match = text.match(/^(\S+)(?:\s+([\s\S]*))?$/);

    if (!match) return;

    const commandName = (match[1] ?? "").toLowerCase();
    const command = resolveCommand(commandName);

    if (!command) return;

    try {
        await command.run({
            client: bot,
            prefix,
            laneId,
            roomId,
            messageId: message.id,
            botUserId: runtime.botUserId,
            startedAt: runtime.startedAt,
            args: (match[2] ?? "").trim(),
        });
    } catch (error) {
        console.error(`[${command.name}]`, errorMessage(error));
        await reply(bot, laneId, "", [new EmbedBuilder()
            .setTitle(`Command failed: ${command.name}`)
            .setDescription(errorMessage(error))
            .setColor(colors.danger)
            .setFooter(`Use ${prefix}help for usage`)
            .setTimestamp()]).catch(() => {});
    }
}

async function handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.id) return;

    const embed = new EmbedBuilder()
        .setTitle("Interaction received")
        .setDescription("The veiled.js example bot parsed this interaction into a typed structure.")
        .setColor(colors.brand)
        .addField("Interaction ID", interaction.id, true)
        .addField("Type", String(interaction.type ?? "unknown"), true)
        .addField("User", interaction.user?.username ?? interaction.user?.id ?? "unknown", true)
        .addField("Command", interaction.commandName ?? "—", true)
        .addField("Component", interaction.customId ?? "—", true)
        .setFooter("interaction reply")
        .setTimestamp();

    const response = {
        type: "reply",
        embeds: [embed.toJSON()],
        ephemeral: true,
    };

    try {
        await bot.rest.respondToInteraction(interaction.id, response);
    } catch {
        await bot.rest.respondToCommandInteraction(interaction.id, response).catch((error) => {
            console.error("Could not answer interaction:", errorMessage(error));
        });
    }
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
