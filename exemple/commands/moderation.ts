import { defineCommands } from "./types";
import { sendEmbed, successEmbed } from "../lib/respond";
import { wordsOf } from "../lib/args";
import { truncate } from "../lib/format";

function memberTarget(args: string, usage: string): { userId: string; reason?: string } {
    const [userId = "", ...reason] = wordsOf(args);

    if (!userId) throw new Error(`Usage: ${usage}`);

    return {
        userId,
        ...(reason.length > 0 ? { reason: reason.join(" ") } : {}),
    };
}

export const moderationCommands = defineCommands(
    {
        name: "kick",
        description: "Kick a member from the room.",
        usage: "kick <userId> [reason]",
        run: async ({ client, laneId, roomId, args }) => {
            const target = memberTarget(args, "kick <userId> [reason]");
            await client.rest.kickMember(roomId, target.userId, target.reason);

            await sendEmbed(client, laneId, successEmbed("Member kicked")
                .addField("User", target.userId, true)
                .addField("Room", roomId, true)
                .addField("Reason", target.reason ?? "—", false));
        },
    },
    {
        name: "ban",
        description: "Ban a member from the room.",
        usage: "ban <userId> [reason]",
        run: async ({ client, laneId, roomId, args }) => {
            const target = memberTarget(args, "ban <userId> [reason]");
            await client.rest.banMember(roomId, target.userId, {
                ...(target.reason ? { reason: target.reason } : {}),
            });

            await sendEmbed(client, laneId, successEmbed("Member banned")
                .addField("User", target.userId, true)
                .addField("Room", roomId, true)
                .addField("Reason", target.reason ?? "—", false));
        },
    },
    {
        name: "unban",
        description: "Remove a room ban.",
        usage: "unban <userId>",
        run: async ({ client, laneId, roomId, args }) => {
            const target = memberTarget(args, "unban <userId>");
            await client.rest.unbanMember(roomId, target.userId);

            await sendEmbed(client, laneId, successEmbed("Member unbanned")
                .addField("User", target.userId, true)
                .addField("Room", roomId, true));
        },
    },
    {
        name: "timeout",
        description: "Timeout a member for a number of seconds.",
        usage: "timeout <userId> <seconds> [reason]",
        run: async ({ client, laneId, roomId, args }) => {
            const [userId = "", rawDuration = "", ...reasonParts] = wordsOf(args);
            const duration = Number(rawDuration);

            if (!userId || !Number.isFinite(duration) || duration <= 0) {
                throw new Error("Usage: timeout <userId> <seconds> [reason]");
            }

            const reason = reasonParts.join(" ") || undefined;
            await client.rest.timeoutMember(roomId, userId, duration, reason);

            await sendEmbed(client, laneId, successEmbed("Member timed out")
                .addField("User", userId, true)
                .addField("Duration", `${duration}s`, true)
                .addField("Reason", truncate(reason ?? "—", 1000), false));
        },
    },
    {
        name: "untimeout",
        description: "Remove a member timeout.",
        usage: "untimeout <userId>",
        aliases: ["cleartimeout"],
        run: async ({ client, laneId, roomId, args }) => {
            const target = memberTarget(args, "untimeout <userId>");
            await client.rest.removeMemberTimeout(roomId, target.userId);

            await sendEmbed(client, laneId, successEmbed("Member timeout removed")
                .addField("User", target.userId, true)
                .addField("Room", roomId, true));
        },
    },
);
