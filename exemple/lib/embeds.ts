import { EmbedBuilder } from "../../src";
import { colors, listLines, truncate } from "./format";

export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export function listEmbed<T>(
    title: string,
    items: T[],
    format: (item: T, index: number) => string,
    empty = "Nothing found.",
): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(colors.brand)
        .setDescription(truncate(listLines(items, format, empty), 4000))
        .setFooter(`${items.length} result${items.length === 1 ? "" : "s"} • veiled.js example`)
        .setTimestamp();
}

export function fieldsEmbed(
    title: string,
    fields: EmbedField[],
    color = colors.brand,
    description?: string,
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setFooter("veiled.js example")
        .setTimestamp();

    if (description) embed.setDescription(truncate(description, 4000));

    for (const field of fields) {
        embed.addField(
            truncate(field.name, 256),
            truncate(field.value || "—", 1000),
            field.inline ?? true,
        );
    }

    return embed;
}
