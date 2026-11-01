import { defineCommands } from "./types";
import { infoEmbed, reply, sendEmbed, successEmbed } from "../lib/respond";
import { listEmbed } from "../lib/embeds";
import { colors, shortDate, truncate, usernameOf } from "../lib/format";
import { requireText, targetId, targetText, wordsOf } from "../lib/args";
import { EmbedBuilder } from "../../src";

export const messageCommands = defineCommands(
    {
        name: "messages",
        description: "List recent lane messages.",
        usage: "messages [laneId]",
        aliases: ["history"],
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const messages = await client.rest.getMessages(id, { limit: 10 });

            await sendEmbed(client, laneId, listEmbed(
                `Messages in ${id}`,
                messages,
                (message, index) => `**${index + 1}.** ${usernameOf(message.author)} — ${shortDate(message.createdAt)}\n` +
                    `> ${truncate(message.content || "(empty)", 180)}\n-# \`${message.id}\``,
                "No messages found.",
            ));
        },
    },
    {
        name: "send",
        description: "Send a plain message.",
        usage: "send <text>",
        aliases: ["say"],
        run: async ({ client, laneId, args }) => {
            const message = await client.rest.sendMessage(laneId, requireText(args, "Message text"));

            await sendEmbed(client, laneId, successEmbed("Message sent")
                .addField("Message ID", message?.id ?? "unknown", true)
                .addField("Lane", laneId, true)
                .addField("Content", truncate(message?.content ?? args, 1000), false));
        },
    },
    {
        name: "echo",
        description: "Send text without a confirmation embed.",
        usage: "echo <text>",
        run: async ({ client, laneId, args }) => {
            await client.rest.sendMessage(laneId, requireText(args, "Message text"));
        },
    },
    {
        name: "reply",
        description: "Reply to the command message.",
        usage: "reply <text>",
        run: async ({ client, laneId, messageId, args }) => {
            const message = await client.rest.sendMessage(laneId, {
                content: requireText(args, "Reply text"),
                ...(messageId ? { replyToId: messageId } : {}),
            });

            await sendEmbed(client, laneId, successEmbed("Reply sent")
                .addField("Message ID", message?.id ?? "unknown", true)
                .addField("Reply target", messageId || "none", true));
        },
    },
    {
        name: "edit",
        description: "Edit a message.",
        usage: "edit [messageId] <text>",
        run: async ({ client, laneId, messageId, args }) => {
            const target = targetText(args, messageId, "message");

            if (!target.text) throw new Error("Text is required.");

            const message = await client.rest.editMessage(target.id, { content: target.text });

            await sendEmbed(client, laneId, successEmbed("Message edited")
                .addField("Message ID", message?.id ?? target.id, true)
                .addField("New content", truncate(message?.content ?? target.text, 1000), false));
        },
    },
    {
        name: "delete",
        description: "Delete a message.",
        usage: "delete [messageId]",
        aliases: ["del"],
        run: async ({ client, laneId, messageId, args }) => {
            const id = targetId(args, messageId, "message");
            await client.rest.deleteMessage(id);
            await sendEmbed(client, laneId, successEmbed("Message deleted", `Message \`${id}\` was deleted.`));
        },
    },
    {
        name: "react",
        description: "Add a reaction to a message.",
        usage: "react [messageId] <emoji>",
        run: async ({ client, laneId, messageId, args }) => {
            const target = targetText(args, messageId, "message");

            if (!target.text) throw new Error("An emoji is required.");

            await client.rest.addReaction(target.id, target.text);
            await sendEmbed(client, laneId, successEmbed("Reaction added")
                .addField("Message", target.id, true)
                .addField("Emoji", target.text, true));
        },
    },
    {
        name: "unreact",
        description: "Remove a reaction from a message.",
        usage: "unreact [messageId] <emoji>",
        run: async ({ client, laneId, messageId, args }) => {
            const target = targetText(args, messageId, "message");

            if (!target.text) throw new Error("An emoji is required.");

            await client.rest.removeReaction(target.id, target.text);
            await sendEmbed(client, laneId, successEmbed("Reaction removed")
                .addField("Message", target.id, true)
                .addField("Emoji", target.text, true));
        },
    },
    {
        name: "reactions",
        description: "List users that reacted with an emoji.",
        usage: "reactions [messageId] [emoji]",
        run: async ({ client, laneId, messageId, args }) => {
            const target = targetText(args, messageId, "message");
            const emoji = target.text || "👍";
            const page = await client.rest.getReactions(target.id, emoji, { limit: 25 });

            await sendEmbed(client, laneId, listEmbed(
                `Reactions ${emoji} on ${target.id}`,
                page?.reactions ?? [],
                (reaction, index) => `**${index + 1}.** ${usernameOf(reaction.user)} — \`${reaction.userId}\``,
                "No reactions returned.",
            ));
        },
    },
    {
        name: "pins",
        description: "List pinned messages.",
        usage: "pins [laneId]",
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const pins = await client.rest.getPins(id);

            await sendEmbed(client, laneId, listEmbed(
                `Pinned messages in ${id}`,
                pins,
                (message, index) => `**${index + 1}.** ${usernameOf(message.author)}\n` +
                    `> ${truncate(message.content || "(embed)", 200)}\n-# \`${message.id}\``,
                "No pinned messages.",
            ));
        },
    },
    {
        name: "pin",
        description: "Pin a message.",
        usage: "pin [messageId]",
        run: async ({ client, laneId, messageId, args }) => {
            const id = targetId(args, messageId, "message");
            await client.rest.pinMessage(id);
            await sendEmbed(client, laneId, successEmbed("Message pinned", `Message \`${id}\` is now pinned.`));
        },
    },
    {
        name: "unpin",
        description: "Unpin a message.",
        usage: "unpin [messageId]",
        run: async ({ client, laneId, messageId, args }) => {
            const id = targetId(args, messageId, "message");
            await client.rest.unpinMessage(id);
            await sendEmbed(client, laneId, successEmbed("Message unpinned", `Message \`${id}\` is no longer pinned.`));
        },
    },
    {
        name: "typing",
        description: "Trigger a typing indicator.",
        usage: "typing",
        run: async ({ client, laneId }) => {
            await client.rest.sendTyping(laneId);
            await sendEmbed(client, laneId, infoEmbed("Typing", "Typing indicator sent."));
        },
    },
    {
        name: "poll",
        description: "Create a poll.",
        usage: "poll <question> | <option> | <option>",
        run: async ({ client, laneId, args }) => {
            const [question, ...options] = args.split("|").map((part) => part.trim()).filter(Boolean);

            if (!question || options.length < 2) {
                throw new Error(`Use ${"!poll"} question | option | option`);
            }

            const message = await client.rest.createPoll(laneId, { question, options });

            await sendEmbed(client, laneId, successEmbed("Poll created")
                .addField("Question", question, false)
                .addField("Options", options.map((option, index) => `${index + 1}. ${option}`).join("\n"), false)
                .addField("Message ID", message?.id ?? "unknown", true));
        },
    },
    {
        name: "sendEmbed",
        description: "Send a custom embed: title | description.",
        usage: "sendEmbed <title> | <description>",
        run: async ({ client, laneId, args }) => {
            const [title, ...rest] = args.split("|").map((part) => part.trim());
            const description = rest.join(" | ") || "Custom embed from the veiled.js example bot.";
            const embed = new EmbedBuilder()
                .setTitle(truncate(title || "Custom embed", 256))
                .setDescription(truncate(description, 4000))
                .setColor(colors.brand)
                .setFooter("sent with !sendEmbed")
                .setTimestamp();

            await sendEmbed(client, laneId, embed);
        },
    },
    {
        name: "whoami",
        description: "Show your message author data.",
        usage: "whoami",
        run: async ({ client, laneId, messageId, botUserId }) => {
            await sendEmbed(client, laneId, infoEmbed("Message context")
                .addField("Lane", laneId, true)
                .addField("Message", messageId || "unknown", true)
                .addField("Bot user", botUserId || "unknown", true));
        },
    },
);
