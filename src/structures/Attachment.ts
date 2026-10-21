import type { RawAttachment } from "../types/response/attachment";

export class Attachment {
    public readonly id: string;
    public readonly url: string;
    public readonly filename: string;
    public readonly size: number;
    public readonly contentType: string | null;
    public readonly width: number | null;
    public readonly height: number | null;
    public readonly raw: RawAttachment;

    private constructor(raw: RawAttachment) {
        this.raw = raw;
        this.id = raw.id;
        this.url = raw.url;
        this.filename = raw.filename;
        this.size = raw.size;
        this.contentType = raw.contentType ?? null;
        this.width = raw.width ?? null;
        this.height = raw.height ?? null;
    }

    public static from(raw: RawAttachment): Attachment {
        return new Attachment(raw);
    }
}
