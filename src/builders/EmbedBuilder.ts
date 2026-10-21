import type {
    RawEmbedAuthorPayload,
    RawEmbedFieldPayload,
    RawEmbedFooterPayload,
    RawEmbedPayload,
} from "../types/payload/embed";
import { normalizeColor } from "../util/color";
import { validateEmbedPayload } from "../util/validate";

export class EmbedBuilder {
    private readonly data: RawEmbedPayload = {};

    public setTitle(title: string): this {
        this.data.title = title;
        return this;
    }

    public setDescription(description: string): this {
        this.data.description = description;
        return this;
    }

    public setUrl(url: string): this {
        this.data.url = url;
        return this;
    }

    public setColor(color: string | number): this {
        this.data.color = normalizeColor(color);
        return this;
    }

    public setAuthor(name: string, url?: string, iconUrl?: string): this {
        const author: RawEmbedAuthorPayload = { name };

        if (url !== undefined) author.url = url;
        if (iconUrl !== undefined) author.icon_url = iconUrl;

        this.data.author = author;
        return this;
    }

    public setThumbnail(url: string): this {
        this.data.thumbnail = { url };
        return this;
    }

    public setImage(url: string): this {
        this.data.image = { url };
        return this;
    }

    public addField(name: string, value: string, inline = false): this {
        const field: RawEmbedFieldPayload = { name, value, inline };
        (this.data.fields ??= []).push(field);
        return this;
    }

    public addFields(...fields: RawEmbedFieldPayload[]): this {
        (this.data.fields ??= []).push(...fields);
        return this;
    }

    public setFooter(text: string, iconUrl?: string): this {
        const footer: RawEmbedFooterPayload = { text };

        if (iconUrl !== undefined) footer.icon_url = iconUrl;

        this.data.footer = footer;
        return this;
    }

    public setTimestamp(timestamp: Date | string = new Date()): this {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            throw new RangeError("Invalid timestamp");
        }

        this.data.timestamp = date.toISOString();
        return this;
    }

    public toJSON(): RawEmbedPayload {
        validateEmbedPayload(this.data);
        return structuredClone(this.data);
    }
}
