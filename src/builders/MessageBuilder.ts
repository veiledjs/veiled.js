import type { RawMessagePayload } from "../types/payload/message";
import { validateMessagePayload } from "../util/validate";
import { ActionRowBuilder } from "./ActionRowBuilder";
import { EmbedBuilder } from "./EmbedBuilder";

export class MessageBuilder {
    protected readonly data: RawMessagePayload = {};

    public setContent(content: string | null): this {
        this.data.content = content;
        return this;
    }

    public addEmbed(embed: EmbedBuilder): this {
        (this.data.embeds ??= []).push(embed.toJSON());
        return this;
    }

    public addEmbeds(...embeds: EmbedBuilder[]): this {
        (this.data.embeds ??= []).push(...embeds.map((embed) => embed.toJSON()));
        return this;
    }

    public addActionRow(row: ActionRowBuilder): this {
        (this.data.components ??= []).push(row.toJSON());
        return this;
    }

    public addActionRows(...rows: ActionRowBuilder[]): this {
        (this.data.components ??= []).push(...rows.map((row) => row.toJSON()));
        return this;
    }

    public toJSON(): RawMessagePayload {
        validateMessagePayload(this.data);
        return structuredClone(this.data);
    }
}
