import { defineCommands } from "./types";
import { reply, sendEmbed, successEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { shortDate, truncate, usernameOf } from "../lib/format";
import { requireText, targetId, targetText, wordsOf } from "../lib/args";

async function threadAction(
    action: string,
    run: (threadId: string) => Promise<unknown>,
    threadId: string,
): Promise<string> {
    await run(threadId);
    return action;
}

export const threadCommands = defineCommands(
    {
        name: "thread",
        description: "Create a thread in a lane.",
        usage: "thread <name>",
        aliases: ["createThread"],
        run: async ({ client, laneId, args }) => {
            const thread = await client.rest.createThread(laneId, {
                name: requireText(args, "Thread name"),
            });

            await sendEmbed(client, laneId, successEmbed("Thread created")
                .addField("Name", thread?.name ?? args, true)
                .addField("ID", thread?.id ?? "unknown", true)
                .addField("Lane", thread?.laneId ?? laneId, true));
        },
    },
    {
        name: "threads",
        description: "List threads in a lane.",
        usage: "threads [laneId]",
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const threads = await client.rest.getLaneThreads(id, { limit: 20 });

            await sendEmbed(client, laneId, listEmbed(
                `Threads in ${id}`,
                threads,
                (thread, index) => `**${index + 1}.** ${thread.name ?? thread.id} — \`${thread.id}\`\n` +
                    `-# ${thread.messageCount ?? "?"} messages • ${thread.memberCount ?? "?"} members`,
                "No threads found.",
            ));
        },
    },
    {
        name: "joinedThreads",
        description: "List threads the bot joined.",
        usage: "joinedThreads [roomId]",
        aliases: ["joined"],
        run: async ({ client, laneId, roomId, args }) => {
            const id = targetId(args, roomId, "room");
            const threads = await client.rest.getJoinedThreads(id);

            await sendEmbed(client, laneId, listEmbed(
                `Joined threads in ${id}`,
                threads,
                (thread, index) => `**${index + 1}.** ${thread.name ?? thread.id} — \`${thread.id}\``,
                "The bot has not joined any threads.",
            ));
        },
    },
    {
        name: "threadInfo",
        description: "Show thread details.",
        usage: "threadInfo <threadId>",
        aliases: ["threadinfo"],
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            const thread = await client.rest.getThread(threadId);

            if (!thread) {
                await reply(client, laneId, "Thread not found.");
                return;
            }

            await sendEmbed(client, laneId, fieldsEmbed("Thread", [
                { name: "Name", value: thread.name ?? "unnamed", inline: true },
                { name: "ID", value: thread.id, inline: true },
                { name: "Lane", value: thread.laneId ?? "unknown", inline: true },
                { name: "Owner", value: thread.ownerId ?? "unknown", inline: true },
                { name: "Archived", value: thread.isArchived ? "yes" : "no", inline: true },
                { name: "Locked", value: thread.isLocked ? "yes" : "no", inline: true },
                { name: "Pinned", value: thread.isPinned ? "yes" : "no", inline: true },
                { name: "Messages", value: thread.messageCount?.toString() ?? "unknown", inline: true },
                { name: "Members", value: thread.memberCount?.toString() ?? "unknown", inline: true },
                { name: "Created", value: shortDate(thread.createdAt), inline: true },
                { name: "Updated", value: shortDate(thread.updatedAt), inline: true },
            ]));
        },
    },
    {
        name: "threadMessages",
        description: "List messages in a thread.",
        usage: "threadMessages <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            const messages = await client.rest.getThreadMessages(threadId, { limit: 20 });

            await sendEmbed(client, laneId, listEmbed(
                `Messages in ${threadId}`,
                messages,
                (message, index) => `**${index + 1}.** ${usernameOf(message.author)}\n` +
                    `> ${truncate(message.content || "(empty)", 180)}\n-# \`${message.id}\``,
                "No thread messages.",
            ));
        },
    },
    {
        name: "threadMembers",
        description: "List thread members.",
        usage: "threadMembers <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            const members = await client.rest.getThreadMembers(threadId);

            await sendEmbed(client, laneId, listEmbed(
                `Members in ${threadId}`,
                members,
                (member, index) => `**${index + 1}.** ${usernameOf(member.user)} — \`${member.userId}\``,
                "No thread members.",
            ));
        },
    },
    {
        name: "threadSend",
        description: "Send a message in a thread.",
        usage: "threadSend [threadId] <text>",
        run: async ({ client, laneId, args }) => {
            const [first = "", ...rest] = wordsOf(args);
            const threadId = /^[A-Za-z0-9_-]{10,}$/.test(first) && rest.length > 0
                ? first
                : "";
            const content = threadId ? rest.join(" ") : args;

            if (!threadId) throw new Error("Usage: threadSend <threadId> <text>");

            const message = await client.rest.sendThreadMessage(threadId, requireText(content, "Message text"));

            await sendEmbed(client, laneId, successEmbed("Thread message sent")
                .addField("Thread", threadId, true)
                .addField("Message", message?.id ?? "unknown", true));
        },
    },
    {
        name: "threadUpdate",
        description: "Rename a thread.",
        usage: "threadUpdate <threadId> <name>",
        run: async ({ client, laneId, args }) => {
            const target = targetText(args, "", "thread");
            const thread = await client.rest.updateThread(target.id, { name: target.text });

            await sendEmbed(client, laneId, successEmbed("Thread updated")
                .addField("Thread", thread?.id ?? target.id, true)
                .addField("Name", thread?.name ?? target.text, true));
        },
    },
    {
        name: "threadArchive",
        description: "Archive a thread.",
        usage: "threadArchive <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("archived", (id) => client.rest.archiveThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread archived", `Thread \`${threadId}\` was archived.`));
        },
    },
    {
        name: "threadUnarchive",
        description: "Unarchive a thread.",
        usage: "threadUnarchive <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("unarchived", (id) => client.rest.unarchiveThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread unarchived", `Thread \`${threadId}\` was unarchived.`));
        },
    },
    {
        name: "threadLock",
        description: "Lock a thread.",
        usage: "threadLock <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("locked", (id) => client.rest.lockThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread locked", `Thread \`${threadId}\` was locked.`));
        },
    },
    {
        name: "threadUnlock",
        description: "Unlock a thread.",
        usage: "threadUnlock <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("unlocked", (id) => client.rest.unlockThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread unlocked", `Thread \`${threadId}\` was unlocked.`));
        },
    },
    {
        name: "threadPin",
        description: "Pin a thread.",
        usage: "threadPin <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("pinned", (id) => client.rest.pinThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread pinned", `Thread \`${threadId}\` was pinned.`));
        },
    },
    {
        name: "threadPublish",
        description: "Publish a thread.",
        usage: "threadPublish <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await threadAction("published", (id) => client.rest.publishThread(id), threadId);
            await sendEmbed(client, laneId, successEmbed("Thread published", `Thread \`${threadId}\` was published.`));
        },
    },
    {
        name: "threadDelete",
        description: "Delete a thread.",
        usage: "threadDelete <threadId>",
        run: async ({ client, laneId, args }) => {
            const threadId = targetId(args, "", "thread");
            await client.rest.deleteThread(threadId);
            await sendEmbed(client, laneId, successEmbed("Thread deleted", `Thread \`${threadId}\` was deleted.`));
        },
    },
    {
        name: "threadAddMember",
        description: "Add a user to a thread.",
        usage: "threadAddMember <threadId> <userId>",
        run: async ({ client, laneId, args }) => {
            const [threadId = "", userId = ""] = wordsOf(args);

            if (!threadId || !userId) throw new Error("Usage: threadAddMember <threadId> <userId>");

            await client.rest.addThreadMember(threadId, userId);
            await sendEmbed(client, laneId, successEmbed("Thread member added")
                .addField("Thread", threadId, true)
                .addField("User", userId, true));
        },
    },
    {
        name: "threadRemoveMember",
        description: "Remove a user from a thread.",
        usage: "threadRemoveMember <threadId> <userId>",
        run: async ({ client, laneId, args }) => {
            const [threadId = "", userId = ""] = wordsOf(args);

            if (!threadId || !userId) throw new Error("Usage: threadRemoveMember <threadId> <userId>");

            await client.rest.removeThreadMember(threadId, userId);
            await sendEmbed(client, laneId, successEmbed("Thread member removed")
                .addField("Thread", threadId, true)
                .addField("User", userId, true));
        },
    },
);
