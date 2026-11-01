import { defineCommands } from "./types";
import { reply, sendEmbed, successEmbed, warningEmbed } from "../lib/respond";
import { fieldsEmbed, listEmbed } from "../lib/embeds";
import { shortDate, truncate } from "../lib/format";
import { requireText, targetId, targetText, wordsOf } from "../lib/args";

export const webhookCommands = defineCommands(
    {
        name: "webhooks",
        description: "List lane webhooks.",
        usage: "webhooks [laneId]",
        run: async ({ client, laneId, args }) => {
            const id = targetId(args, laneId, "lane");
            const webhooks = await client.rest.getLaneWebhooks(id);

            await sendEmbed(client, laneId, listEmbed(
                `Webhooks in ${id}`,
                webhooks,
                (webhook, index) => `**${index + 1}.** ${webhook.name ?? "unnamed"} — \`${webhook.id}\`\n` +
                    `-# created ${shortDate(webhook.createdAt)}`,
                "No webhooks found.",
            ));
        },
    },
    {
        name: "webhook",
        description: "Show a webhook.",
        usage: "webhook <webhookId>",
        run: async ({ client, laneId, args }) => {
            const webhookId = targetId(args, "", "webhook");
            const webhook = await client.rest.getWebhook(webhookId);

            if (!webhook) {
                await reply(client, laneId, "Webhook not found.");
                return;
            }

            await sendEmbed(client, laneId, fieldsEmbed("Webhook", [
                { name: "Name", value: webhook.name ?? "unnamed", inline: true },
                { name: "ID", value: webhook.id, inline: true },
                { name: "Lane", value: webhook.laneId ?? "unknown", inline: true },
                { name: "Token", value: truncate(webhook.token ?? "hidden", 100), inline: false },
                { name: "URL", value: truncate(webhook.webhookUrl ?? "—", 1000), inline: false },
                { name: "Created", value: shortDate(webhook.createdAt), inline: true },
                { name: "Updated", value: shortDate(webhook.updatedAt), inline: true },
            ], 0xeb459e));
        },
    },
    {
        name: "webhookCreate",
        description: "Create a webhook in a lane.",
        usage: "webhookCreate <name> [laneId]",
        aliases: ["createWebhook"],
        run: async ({ client, laneId, args }) => {
            const [name = "", laneHint = ""] = wordsOf(args);
            const targetLane = laneHint || laneId;
            const webhook = await client.rest.createWebhook(targetLane, {
                name: requireText(name, "Webhook name"),
            });

            await sendEmbed(client, laneId, successEmbed("Webhook created")
                .addField("Name", webhook?.name ?? name, true)
                .addField("ID", webhook?.id ?? "unknown", true)
                .addField("Lane", webhook?.laneId ?? targetLane, true)
                .addField("Token", truncate(webhook?.token ?? "not returned", 100), false));
        },
    },
    {
        name: "webhookUpdate",
        description: "Rename a webhook.",
        usage: "webhookUpdate <webhookId> <name>",
        run: async ({ client, laneId, args }) => {
            const target = targetText(args, "", "webhook");
            const webhook = await client.rest.updateWebhook(target.id, { name: target.text });

            await sendEmbed(client, laneId, successEmbed("Webhook updated")
                .addField("ID", webhook?.id ?? target.id, true)
                .addField("Name", webhook?.name ?? target.text, true));
        },
    },
    {
        name: "webhookReset",
        description: "Reset a webhook token.",
        usage: "webhookReset <webhookId>",
        run: async ({ client, laneId, args }) => {
            const webhookId = targetId(args, "", "webhook");
            const webhook = await client.rest.resetWebhookToken(webhookId);

            await sendEmbed(client, laneId, warningEmbed("Webhook token reset")
                .addField("ID", webhook?.id ?? webhookId, true)
                .addField("New token", truncate(webhook?.token ?? "not returned", 100), false));
        },
    },
    {
        name: "webhookDelete",
        description: "Delete a webhook.",
        usage: "webhookDelete <webhookId>",
        run: async ({ client, laneId, args }) => {
            const webhookId = targetId(args, "", "webhook");
            await client.rest.deleteWebhook(webhookId);
            await sendEmbed(client, laneId, successEmbed("Webhook deleted", `Webhook \`${webhookId}\` was deleted.`));
        },
    },
);
