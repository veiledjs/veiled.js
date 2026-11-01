import { defineCommands } from "./types";
import { reply, sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { colors, shortDate, truncate } from "../lib/format";
import { requireText, targetId, targetText, wordsOf } from "../lib/args";
import { EmbedBuilder } from "../../src";

export const roomCommands = defineCommands(
    {
        name: "rooms",
        description: "List rooms this bot belongs to.",
        usage: "rooms",
        aliases: ["servers"],
        run: async ({ client, laneId }) => {
            const rooms = await client.rest.getMyRooms();

            await sendEmbed(client, laneId, listEmbed(
                "Bot rooms",
                rooms,
                (room, index) => `**${index + 1}.** ${room.name ?? "unnamed"} — \`${room.id}\`\n` +
                    `-# ${room.memberCount ?? "?"} members`,
                "This bot is not in any rooms.",
            ));
        },
    },
    {
        name: "room",
        description: "Show one room.",
        usage: "room [roomId]",
        aliases: ["server"],
        run: async ({ client, laneId, roomId, args }) => {
            const room = await client.rest.getRoom(targetId(args, roomId, "room"));

            if (!room) {
                await reply(client, laneId, "Room not found.");
                return;
            }

            const embed = fieldsEmbed("Room", [
                { name: "Name", value: room.name ?? "unnamed", inline: true },
                { name: "ID", value: room.id, inline: true },
                { name: "Owner", value: room.ownerId ?? "unknown", inline: true },
                { name: "Members", value: room.memberCount?.toString() ?? "unknown", inline: true },
                { name: "Created", value: shortDate(room.createdAt), inline: true },
                { name: "Updated", value: shortDate(room.updatedAt), inline: true },
                { name: "Description", value: room.description ?? "—", inline: false },
            ]);

            if (room.icon) embed.setThumbnail(room.icon);
            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "lanes",
        description: "List lanes in a room.",
        usage: "lanes [roomId]",
        aliases: ["channels"],
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const lanes = await client.rest.getLanes(id);

            await sendEmbed(client, laneId, listEmbed(
                `Lanes in ${id}`,
                lanes,
                (lane, index) => `**${index + 1}.** ${lane.type === "VOICE" ? "🔊" : "#"}${lane.name ?? lane.id}` +
                    ` — \`${lane.id}\`\n-# position ${lane.position} • slowmode ${lane.slowmode}s`,
                "No lanes found.",
            ));
        },
    },
    {
        name: "lane",
        description: "Show a lane and its capabilities.",
        usage: "lane [laneId]",
        aliases: ["channel"],
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const [lane, capabilities] = await Promise.all([
                client.rest.getLane(id),
                client.rest.getLaneCapabilities(id).catch(() => null),
            ]);

            if (!lane) {
                await reply(client, laneId, "Lane not found.");
                return;
            }

            const embed = fieldsEmbed("Lane", [
                { name: "Name", value: lane.name ?? "unnamed", inline: true },
                { name: "ID", value: lane.id, inline: true },
                { name: "Type", value: lane.type ?? "unknown", inline: true },
                { name: "Room", value: lane.roomId ?? "unknown", inline: true },
                { name: "Parent", value: lane.parentId ?? "none", inline: true },
                { name: "Position", value: lane.position.toString(), inline: true },
                { name: "Slowmode", value: `${lane.slowmode}s`, inline: true },
                { name: "NSFW", value: lane.isNSFW ? "yes" : "no", inline: true },
                { name: "Topic", value: lane.topic ?? "—", inline: false },
            ]);

            if (capabilities) {
                const allowed = Object.entries(capabilities.capabilities)
                    .filter(([, value]) => value)
                    .map(([key]) => key);

                embed.addField("Capabilities", truncate(allowed.join(", ") || "none", 1000), false);
            }

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "members",
        description: "List room members.",
        usage: "members [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const members = await client.rest.getMembers(id, { limit: 20 });

            await sendEmbed(client, laneId, listEmbed(
                `Members in ${id}`,
                members,
                (member, index) => `**${index + 1}.** ${member.nickname ?? member.user?.displayName ?? member.userId}` +
                    ` — \`${member.userId}\`\n-# ${member.roles.length} roles`,
                "No members returned.",
            ));
        },
    },
    {
        name: "roles",
        description: "List room roles.",
        usage: "roles [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const roles = await client.rest.getRoomRoles(id);

            await sendEmbed(client, laneId, listEmbed(
                `Roles in ${id}`,
                roles,
                (role, index) => `**${index + 1}.** ${role.name ?? "unnamed"} — \`${role.id}\`\n` +
                    `-# color ${role.color ?? "default"} • position ${role.position} • mentionable ${role.isMentionable}`,
                "No roles found.",
            ));
        },
    },
    {
        name: "roleMembers",
        description: "List members that have a role.",
        usage: "roleMembers <roleId> [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const [roleId = "", roomHint = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;
            const members = await client.rest.getRoleMembers(
                targetRoom,
                roleId || targetId("", "", "role"),
            );

            await sendEmbed(client, laneId, listEmbed(
                `Members with role ${roleId}`,
                members,
                (member, index) => `**${index + 1}.** ${member.nickname ?? member.user?.displayName ?? member.userId}`,
                "No members have this role.",
            ));
        },
    },
    {
        name: "memberRoles",
        description: "List roles assigned to a member.",
        usage: "memberRoles <userId> [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const [userId = "", roomHint = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;
            const roles = await client.rest.getMemberRoles(
                targetRoom,
                userId || targetId("", "", "user"),
            );

            await sendEmbed(client, laneId, listEmbed(
                `Roles for ${userId}`,
                roles,
                (role) => `• ${role.name ?? "unnamed"} — \`${role.id}\``,
                "This member has no roles.",
            ));
        },
    },
    {
        name: "permissions",
        description: "Show a member's permissions.",
        usage: "permissions <userId> [roomId]",
        aliases: ["perms"],
        run: async ({ client, laneId, roomId, args }) => {
            const [userId = "", roomHint = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;
            const result = await client.rest.getMemberPermissions(
                targetRoom,
                userId || targetId("", "", "user"),
            );
            const permissions = Array.isArray(result?.permissions)
                ? result.permissions.join(", ")
                : String(result?.permissions ?? "none");

            await sendEmbed(client, laneId, fieldsEmbed("Member permissions", [
                { name: "User", value: userId, inline: true },
                { name: "Room", value: targetRoom, inline: true },
                { name: "Permissions", value: truncate(permissions, 1000), inline: false },
            ]));
        },
    },
    {
        name: "createRole",
        description: "Create a role in the current room.",
        usage: "createRole <name>",
        aliases: ["addRole"],
        run: async ({ client, laneId, roomId, args }) => {
            const name = requireText(args, "Role name");
            const role = await client.rest.createRole(roomId, { name });

            await sendEmbed(client, laneId, successEmbed("Role created")
                .addField("Name", role?.name ?? name, true)
                .addField("ID", role?.id ?? "unknown", true)
                .addField("Position", role?.position?.toString() ?? "0", true));
        },
    },
    {
        name: "updateRole",
        description: "Rename a role or change its color.",
        usage: "updateRole <roleId> <name> [color]",
        run: async ({ client, laneId, args }) => {
            const [roleId = "", name = "", color] = wordsOf(args);

            if (!roleId || !name) throw new Error("Usage: updateRole <roleId> <name> [color]");

            const role = await client.rest.updateRole(roleId, {
                name,
                ...(color ? { color } : {}),
            });

            await sendEmbed(client, laneId, successEmbed("Role updated")
                .addField("Name", role?.name ?? name, true)
                .addField("ID", role?.id ?? roleId, true)
                .addField("Color", String(role?.color ?? color ?? "default"), true));
        },
    },
    {
        name: "deleteRole",
        description: "Delete a role.",
        usage: "deleteRole <roleId>",
        aliases: ["removeRole"],
        run: async ({ client, laneId, args }) => {
            const roleId = targetId(args, "", "role");
            await client.rest.deleteRole(roleId);
            await sendEmbed(client, laneId, successEmbed("Role deleted", `Role \`${roleId}\` was deleted.`));
        },
    },
    {
        name: "assignRole",
        description: "Assign a role to a member.",
        usage: "assignRole <userId> <roleId> [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const [userId = "", roleId = "", roomHint = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;

            if (!userId || !roleId) throw new Error("Usage: assignRole <userId> <roleId> [roomId]");

            await client.rest.assignRole(targetRoom, userId, roleId);
            await sendEmbed(client, laneId, successEmbed("Role assigned")
                .addField("User", userId, true)
                .addField("Role", roleId, true)
                .addField("Room", targetRoom, true));
        },
    },
    {
        name: "unassignRole",
        description: "Remove a role from a member.",
        usage: "unassignRole <userId> <roleId> [roomId]",
        run: async ({ client, laneId, roomId, args }) => {
            const [userId = "", roleId = "", roomHint = ""] = wordsOf(args);
            const targetRoom = roomHint || roomId;

            if (!userId || !roleId) throw new Error("Usage: unassignRole <userId> <roleId> [roomId]");

            await client.rest.removeRole(targetRoom, userId, roleId);
            await sendEmbed(client, laneId, successEmbed("Role removed")
                .addField("User", userId, true)
                .addField("Role", roleId, true)
                .addField("Room", targetRoom, true));
        },
    },
    {
        name: "roleColor",
        description: "Set a role color using the raw role payload.",
        usage: "roleColor <roleId> <color>",
        run: async ({ client, laneId, args }) => {
            const [roleId = "", color = ""] = wordsOf(args);

            if (!roleId || !color) throw new Error("Usage: roleColor <roleId> <color>");

            const role = await client.rest.updateRole(roleId, { color });
            const embed = new EmbedBuilder()
                .setTitle("Role color updated")
                .setDescription(`Role \`${role?.id ?? roleId}\` now uses **${role?.color ?? color}**.`)
                .setColor(typeof role?.color === "number" ? role.color : colors.brand);

            await sendEmbed(client, laneId, embed);
        },
    },
);
