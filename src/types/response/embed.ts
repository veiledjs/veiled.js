export interface RawEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface RawEmbed {
    id: string;
    messageId: string;
    type: string;
    url: string;
    title: string | null;
    description: string | null;
    siteName: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    imageAlt: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    videoUrl: string | null;
    videoWidth: number | null;
    videoHeight: number | null;
    providerName: string | null;
    providerUrl: string | null;
    authorName: string | null;
    authorUrl: string | null;
    authorIconUrl: string | null;
    footerText: string | null;
    footerIconUrl: string | null;
    fields: RawEmbedField[] | null;
    color: string | null;
    createdAt: string;
}
