import { defineCommands } from "./types";
import { reply, sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { shortDate } from "../lib/format";
import { targetId, wordsOf } from "../lib/args";

export const inviteCommands = defineCommands(
    {
        name: "invites",
        description: "List room invites.",
        usage: "invites [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const invites = await client.rest.getRoomInvites(id);

            await sendEmbed(client, laneId, listEmbed(
                `Invites in ${id}`,
                invites,
                (invite, index) => `**${index + 1}.** \`${invite.code}\` — ${invite.uses ?? 0}/${invite.maxUses ?? "∞"} uses\n` +
                    `-# expires ${shortDate(invite.expiresAt)}`,
                "No invites found.",
            ));
        },
    },
    {
        name: "invite",
        description: "Create a room invite.",
        usage: "invite [roomId] [maxAge] [maxUses]",
        run: async ({ client, laneId, roomId, args }) => {
            const [roomHint = "", rawMaxAge = "", rawMaxUses = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;
            const maxAge = rawMaxAge ? Number(rawMaxAge) : undefined;
            const maxUses = rawMaxUses ? Number(rawMaxUses) : undefined;
            const invite = await client.rest.createInvite(targetRoom, {
                ...(maxAge !== undefined && Number.isFinite(maxAge) ? { maxAge } : {}),
                ...(maxUses !== undefined && Number.isFinite(maxUses) ? { maxUses } : {}),
            });

            await sendEmbed(client, laneId, successEmbed("Invite created")
                .addField("Code", invite?.code ?? "unknown", true)
                .addField("Room", targetRoom, true)
                .addField("Max age", invite?.maxAge?.toString() ?? "default", true)
                .addField("Max uses", invite?.maxUses?.toString() ?? "default", true));
        },
    },
    {
        name: "inviteInfo",
        description: "Show an invite.",
        usage: "inviteInfo <code>",
        run: async ({ client, laneId, args }) => {
            const code = targetId(args, "", "invite");
            const invite = await client.rest.getInvite(code);

            if (!invite) {
                await reply(client, laneId, "Invite not found.");
                return;
            }

            await sendEmbed(client, laneId, fieldsEmbed("Invite", [
                { name: "Code", value: invite.code, inline: true },
                { name: "ID", value: invite.id || "unknown", inline: true },
                { name: "Room", value: invite.roomId ?? "unknown", inline: true },
                { name: "Uses", value: `${invite.uses ?? 0} / ${invite.maxUses ?? "∞"}`, inline: true },
                { name: "Temporary", value: invite.temporary ? "yes" : "no", inline: true },
                { name: "Max age", value: invite.maxAge?.toString() ?? "never", inline: true },
                { name: "Created", value: shortDate(invite.createdAt), inline: true },
                { name: "Expires", value: shortDate(invite.expiresAt), inline: true },
            ]));
        },
    },
    {
        name: "inviteUpdate",
        description: "Update an invite's limits.",
        usage: "inviteUpdate <code> <maxAge> <maxUses>",
        run: async ({ client, laneId, args }) => {
            const [code = "", rawMaxAge = "", rawMaxUses = ""] = wordsOf(args);
            const maxAge = Number(rawMaxAge);
            const maxUses = Number(rawMaxUses);

            if (!code || !Number.isFinite(maxAge) || !Number.isFinite(maxUses)) {
                throw new Error("Usage: inviteUpdate <code> <maxAge> <maxUses>");
            }

            const invite = await client.rest.updateInvite(code, { maxAge, maxUses });

            await sendEmbed(client, laneId, successEmbed("Invite updated")
                .addField("Code", invite?.code ?? code, true)
                .addField("Max age", String(invite?.maxAge ?? maxAge), true)
                .addField("Max uses", String(invite?.maxUses ?? maxUses), true));
        },
    },
    {
        name: "inviteDelete",
        description: "Revoke an invite.",
        usage: "inviteDelete <code>",
        run: async ({ client, laneId, args }) => {
            const code = targetId(args, "", "invite");
            await client.rest.revokeInvite(code);
            await sendEmbed(client, laneId, successEmbed("Invite revoked", `Invite \`${code}\` was revoked.`));
        },
    },
);
