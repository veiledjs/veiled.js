import type { RawEmbed } from "../types/response/embed";

export interface EmbedAuthor {
    name: string;
    url: string | null;
    iconUrl: string | null;
}

export interface EmbedFooter {
    text: string;
    iconUrl: string | null;
}

export interface EmbedImage {
    url: string;
    alt: string | null;
    width: number | null;
    height: number | null;
}

export interface EmbedVideo {
    url: string;
    width: number | null;
    height: number | null;
}

export interface EmbedProvider {
    name: string | null;
    url: string | null;
}

export interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

export class Embed {
    public readonly id: string;
    public readonly messageId: string;
    public readonly type: string;
    public readonly url: string;
    public readonly title: string | null;
    public readonly description: string | null;
    public readonly siteName: string | null;
    public readonly author: EmbedAuthor | null;
    public readonly thumbnail: EmbedImage | null;
    public readonly image: EmbedImage | null;
    public readonly video: EmbedVideo | null;
    public readonly provider: EmbedProvider | null;
    public readonly footer: EmbedFooter | null;
    public readonly fields: EmbedField[];
    public readonly color: string | null;
    public readonly createdAt: Date;
    public readonly raw: RawEmbed;

    private constructor(raw: RawEmbed) {
        this.raw = raw;
        this.id = raw.id;
        this.messageId = raw.messageId;
        this.type = raw.type;
        this.url = raw.url;
        this.title = raw.title;
        this.description = raw.description;
        this.siteName = raw.siteName;
        this.color = raw.color;
        this.createdAt = new Date(raw.createdAt);

        this.author = raw.authorName === null
            ? null
            : {
                name: raw.authorName,
                url: raw.authorUrl,
                iconUrl: raw.authorIconUrl,
            };

        this.thumbnail = raw.thumbnailUrl === null
            ? null
            : {
                url: raw.thumbnailUrl,
                alt: raw.imageAlt,
                width: raw.imageWidth,
                height: raw.imageHeight,
            };

        this.image = raw.imageUrl === null
            ? null
            : {
                url: raw.imageUrl,
                alt: raw.imageAlt,
                width: raw.imageWidth,
                height: raw.imageHeight,
            };

        this.video = raw.videoUrl === null
            ? null
            : {
                url: raw.videoUrl,
                width: raw.videoWidth,
                height: raw.videoHeight,
            };

        this.provider = raw.providerName === null && raw.providerUrl === null
            ? null
            : {
                name: raw.providerName,
                url: raw.providerUrl,
            };

        this.footer = raw.footerText === null
            ? null
            : {
                text: raw.footerText,
                iconUrl: raw.footerIconUrl,
            };

        this.fields = (raw.fields ?? []).map((field) => ({
            name: field.name,
            value: field.value,
            inline: field.inline ?? false,
        }));
    }

    public static from(raw: RawEmbed): Embed {
        return new Embed(raw);
    }
}
