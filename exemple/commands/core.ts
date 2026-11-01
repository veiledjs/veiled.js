import { methodNames } from "../client";
import { defineCommands } from "./types";
import type { CommandContext } from "./types";
import { infoEmbed, reply, sendContainer, sendEmbed, sendJson, successEmbed } from "../lib/respond";
import { code, colors, listLines, shortDate, truncate } from "../lib/format";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { wordsOf } from "../lib/args";
import { EmbedBuilder } from "../../src";

function uptime(startedAt: number): string {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${seconds}s`]
        .filter(Boolean)
        .join(" ");
}

export const coreCommands = defineCommands(
    {
        name: "ping",
        description: "Measure REST latency and show gateway state.",
        usage: "ping",
        run: async ({ client, laneId, startedAt }) => {
            const before = performance.now();
            const me = await client.rest.getMe();
            const latency = Math.round(performance.now() - before);

            await sendEmbed(client, laneId, fieldsEmbed("Pong", [
                { name: "REST latency", value: `${latency} ms`, inline: true },
                { name: "Gateway", value: client.state, inline: true },
                { name: "Socket", value: client.connected ? "connected" : "disconnected", inline: true },
                { name: "Uptime", value: uptime(startedAt), inline: true },
                { name: "Identity", value: me?.user?.username ?? "unknown", inline: true },
            ], colors.success));
        },
    },
    {
        name: "me",
        description: "Show the bot identity and application.",
        usage: "me",
        run: async ({ client, laneId }) => {
            const identity = await client.rest.getMe();
            const user = identity?.user;
            const app = identity?.application;
            const embed = fieldsEmbed("Bot identity", [
                { name: "User", value: user ? `${user.displayName} (@${user.username})` : "unknown", inline: false },
                { name: "User ID", value: user?.id || "unknown", inline: true },
                { name: "Bot", value: user?.bot ? "yes" : "no", inline: true },
                { name: "Application", value: app?.name ?? app?.id ?? "unknown", inline: true },
                { name: "Application ID", value: app?.id ?? "unknown", inline: true },
                { name: "Description", value: app?.description ?? "—", inline: false },
            ], colors.brand);

            if (user?.avatarUrl) embed.setThumbnail(user.avatarUrl);

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "gateway",
        description: "Fetch the websocket gateway URL.",
        usage: "gateway",
        run: async ({ client, laneId }) => {
            const gateway = await client.rest.getGateway();

            await sendEmbed(client, laneId, fieldsEmbed("Gateway", [
                { name: "REST URL", value: code(gateway?.url ?? "not returned"), inline: false },
                { name: "Current state", value: client.state, inline: true },
                { name: "Shard", value: "0 / 1", inline: true },
            ]));
        },
    },
    {
        name: "info",
        description: "Show room information.",
        usage: "info [roomId]",
        run: async ({ client, laneId, roomId }) => {
            const room = await client.rest.getRoom(roomId);

            if (!room) {
                await reply(client, laneId, "Room not found.");
                return;
            }

            const embed = fieldsEmbed("Room information", [
                { name: "Name", value: room.name ?? "unnamed", inline: true },
                { name: "Room ID", value: room.id, inline: true },
                { name: "Owner", value: room.ownerId ?? "unknown", inline: true },
                { name: "Members", value: room.memberCount?.toString() ?? "unknown", inline: true },
                { name: "Created", value: shortDate(room.createdAt), inline: true },
                { name: "Updated", value: shortDate(room.updatedAt), inline: true },
                { name: "Description", value: room.description ?? "—", inline: false },
                { name: "Permissions", value: room.permissions ?? "—", inline: false },
            ]);

            if (room.icon) embed.setThumbnail(room.icon);
            if (room.banner) embed.setImage(room.banner);

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "methods",
        description: "List every BotREST method.",
        usage: "methods",
        run: async ({ client, laneId }) => {
            const embed = listEmbed(
                "BotREST methods",
                methodNames,
                (name) => `\`${name}\``,
            ).setFooter(`${methodNames.length} methods • veiled.js example`);

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "call",
        description: "Call any BotREST method with a JSON argument array.",
        usage: "call <method> [jsonArgs]",
        run: async ({ client, laneId, args }) => {
            const [name = "", ...rest] = wordsOf(args);
            const json = rest.join(" ");
            const method = (client.rest as unknown as Record<string, (...methodArgs: unknown[]) => unknown>)[name];

            if (!methodNames.includes(name) || typeof method !== "function") {
                throw new Error(`Unknown method: ${name || "(missing)"}`);
            }

            const methodArgs = json ? JSON.parse(json) as unknown : [];

            if (!Array.isArray(methodArgs)) {
                throw new TypeError("Arguments must be a JSON array.");
            }

            await sendJson(client, laneId, await method.apply(client.rest, methodArgs));
        },
    },
    {
        name: "card",
        description: "Send a Components V2 container.",
        usage: "card [text]",
        aliases: ["panel"],
        run: async ({ client, laneId, args, startedAt }) => {
            await sendContainer(client, laneId, {
                title: "veiled.js control panel",
                description: args || "This panel is rendered with Components V2.",
                sections: [
                    { divider: true, content: `Gateway state: **${client.state}**` },
                    { content: `Socket: **${client.connected ? "connected" : "disconnected"}** • Uptime: **${uptime(startedAt)}**` },
                    { divider: true, content: "Commands use embeds for data and containers for visual panels." },
                ],
                footer: "exemple/commands/core.ts",
                accentColor: colors.brand,
                linkButtons: [
                    { label: "Veiled", url: "https://veiled.lol" },
                    { label: "Commands", url: "https://github.com/FrostyTheDevv/veiledbot" },
                ],
            });
        },
    },
    {
        name: "tour",
        description: "Send a visual tour of the bot capabilities.",
        usage: "tour [laneId]",
        run: async ({ client, laneId, roomId, args }) => {
            const targetLaneId = wordsOf(args)[0] || laneId;
            const [rooms, lanes, members, roles, messages, threads] = await Promise.all([
                client.rest.getMyRooms(),
                client.rest.getLanes(roomId),
                client.rest.getMembers(roomId, { limit: 5 }),
                client.rest.getRoomRoles(roomId),
                client.rest.getMessages(targetLaneId, { limit: 5 }),
                client.rest.getLaneThreads(targetLaneId, { limit: 5 }),
            ]);

            await sendContainer(client, laneId, {
                title: "veiled.js tour",
                description: `Room **${roomId || "unknown"}** • Lane **${targetLaneId}**`,
                sections: [
                    { divider: true, content: `**Rooms** ${rooms.length} • **Lanes** ${lanes.length} • **Members** ${members.length}` },
                    { content: `**Roles** ${roles.length} • **Messages** ${messages.length} • **Threads** ${threads.length}` },
                    { divider: true, content: listLines(rooms.slice(0, 5), (room) => `• ${room.name ?? room.id}`) },
                    { content: listLines(lanes.slice(0, 5), (lane) => `• #${lane.name ?? lane.id}`) },
                ],
                footer: "Use !help for the full command list",
                accentColor: 0xeb459e,
                linkButtons: [{ label: "Open Veiled", url: "https://veiled.lol" }],
            });
        },
    },
    {
        name: "uptime",
        description: "Show the example bot uptime.",
        usage: "uptime",
        run: async ({ client, laneId, startedAt }) => {
            await sendEmbed(client, laneId, infoEmbed("Uptime")
                .addField("Process", uptime(startedAt), true)
                .addField("Started", shortDate(new Date(startedAt)), true)
                .addField("State", client.state, true));
        },
    },
    {
        name: "status",
        description: "Show a compact gateway status card.",
        usage: "status",
        run: async ({ client, laneId, startedAt }) => {
            await sendEmbed(client, laneId, successEmbed("Gateway status")
                .addField("State", client.state, true)
                .addField("Connected", client.connected ? "yes" : "no", true)
                .addField("Uptime", uptime(startedAt), true));
        },
    },
);
