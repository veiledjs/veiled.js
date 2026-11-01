import type { BotClient, Message } from "../../src";
import { EmbedBuilder } from "../../src";
import type { RawContainerCardPayload } from "../../src";
import { colors, stringify, truncate } from "./format";

const CONTENT_LIMIT = 2000;
const EMBED_DESCRIPTION_LIMIT = 4000;

export async function reply(
    client: BotClient,
    laneId: string,
    content: string,
    embeds: EmbedBuilder[] = [],
): Promise<Message | null> {
    return client.rest.sendMessage(laneId, {
        content: truncate(content, CONTENT_LIMIT),
        ...(embeds.length > 0 ? { embeds: embeds.map((embed) => embed.toJSON()) } : {}),
    });
}

export async function sendEmbed(
    client: BotClient,
    laneId: string,
    embed: EmbedBuilder,
    content = "",
): Promise<Message | null> {
    return reply(client, laneId, content, [embed]);
}

export async function sendContainer(
    client: BotClient,
    laneId: string,
    card: RawContainerCardPayload,
): Promise<Message | null> {
    return client.rest.sendContainer(laneId, card);
}

export async function sendJson(
    client: BotClient,
    laneId: string,
    value: unknown,
): Promise<void> {
    const text = stringify(value ?? "ok");
    const chunks: string[] = [];

    for (let index = 0; index < text.length && chunks.length < 5; index += EMBED_DESCRIPTION_LIMIT) {
        chunks.push(text.slice(index, index + EMBED_DESCRIPTION_LIMIT));
    }

    if (chunks.length === 0) chunks.push("ok");

    const embeds = chunks.map((chunk, index) => new EmbedBuilder()
        .setTitle(index === 0 ? "API response" : "API response (continued)")
        .setDescription(`\`\`\`json\n${chunk.replaceAll("```", "``ˋ")}\n\`\`\``)
        .setColor(colors.brand)
        .setFooter(`veiled.js example${chunks.length > 1 ? ` • part ${index + 1}/${chunks.length}` : ""}`)
        .setTimestamp());

    await reply(client, laneId, "", embeds);
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
    return baseEmbed(title, colors.success, description);
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
    return baseEmbed(title, colors.brand, description);
}

export function warningEmbed(title: string, description?: string): EmbedBuilder {
    return baseEmbed(title, colors.warning, description);
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
    return baseEmbed(title, colors.danger, description);
}

function baseEmbed(title: string, color: number, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setFooter("veiled.js example")
        .setTimestamp();

    if (description) embed.setDescription(truncate(description, EMBED_DESCRIPTION_LIMIT));

    return embed;
}
