import { defineCommands } from "./types";
import { sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { truncate, usernameOf } from "../lib/format";
import { targetId, wordsOf } from "../lib/args";

export const voiceCommands = defineCommands(
    {
        name: "voice",
        description: "Show voice states and connection info.",
        usage: "voice [laneId]",
        aliases: ["voiceStates"],
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const [states, iceServers, credentials] = await Promise.all([
                client.rest.getVoiceStates(id),
                client.rest.getVoiceIceServers(id).catch(() => null),
                client.rest.getVoiceTurnCredentials(id).catch(() => null),
            ]);

            const embed = listEmbed(
                `Voice states in ${id}`,
                states,
                (state, index) => `**${index + 1}.** ${usernameOf(state.user)}\n` +
                    `-# muted ${state.isMuted} • deafened ${state.isDeafened} • streaming ${state.isStreaming}`,
                "No one is connected to this voice lane.",
            );

            embed.addField("ICE servers", String(iceServers?.iceServers.length ?? 0), true);
            embed.addField("TURN credential", credentials?.username ?? "none", true);
            embed.setFooter(`Lane ${id} • veiled.js example`);

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "voiceJoin",
        description: "Join a voice lane.",
        usage: "voiceJoin [laneId] [sessionId]",
        run: async ({ client, laneId, args }) => {
            const [laneHint = "", sessionId = ""] = wordsOf(args);
            const id = laneHint || laneId;
            await client.rest.joinVoice(id, sessionId || undefined);

            await sendEmbed(client, laneId, successEmbed("Voice join requested")
                .addField("Lane", id, true)
                .addField("Session", sessionId || "generated", true));
        },
    },
    {
        name: "voiceLeave",
        description: "Leave a voice lane.",
        usage: "voiceLeave [laneId]",
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            await client.rest.leaveVoice(id);
            await sendEmbed(client, laneId, successEmbed("Voice leave requested", `Left lane \`${id}\`.`));
        },
    },
    {
        name: "ice",
        description: "Show ICE servers.",
        usage: "ice [laneId]",
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const response = await client.rest.getVoiceIceServers(id);

            await sendEmbed(client, laneId, listEmbed(
                "ICE servers",
                response?.iceServers ?? [],
                (server, index) => `**${index + 1}.** ${server.urls.join(", ") || "no urls"}\n` +
                    `-# username ${server.username ?? "none"}`,
                "No ICE servers returned.",
            ).addField("TTL", String(response?.ttl ?? "unknown"), true));
        },
    },
    {
        name: "turn",
        description: "Show TURN credentials.",
        usage: "turn [laneId]",
        aliases: ["turnCredentials"],
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const credentials = await client.rest.getVoiceTurnCredentials(id);

            await sendEmbed(client, laneId, fieldsEmbed("TURN credentials", [
                { name: "Username", value: credentials?.username ?? "unknown", inline: true },
                { name: "Credential", value: truncate(credentials?.credential ?? "unknown", 1000), inline: false },
                { name: "URLs", value: credentials?.urls.join(", ") ?? "none", inline: false },
                { name: "TTL", value: String(credentials?.ttl ?? "unknown"), inline: true },
            ]));
        },
    },
);
