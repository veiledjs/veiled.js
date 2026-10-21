export interface RawEmbedImagePayload {
    url: string;
}

export interface RawEmbedAuthorPayload {
    name: string;
    url?: string;
    icon_url?: string;
}

export interface RawEmbedFooterPayload {
    text: string;
    icon_url?: string;
}

export interface RawEmbedFieldPayload {
    name: string;
    value: string;
    inline?: boolean;
}

export interface RawEmbedPayload {
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    author?: RawEmbedAuthorPayload;
    thumbnail?: RawEmbedImagePayload;
    image?: RawEmbedImagePayload;
    fields?: RawEmbedFieldPayload[];
    footer?: RawEmbedFooterPayload;
    timestamp?: string;
}
