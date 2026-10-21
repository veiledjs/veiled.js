import type { RawWebhookInfo } from "../types/response/webhook";

export class WebhookInfo {
    public readonly id: string;
    public readonly name: string;
    public readonly avatarUrl: string | null;
    public readonly raw: RawWebhookInfo;

    private constructor(raw: RawWebhookInfo) {
        this.raw = raw;
        this.id = raw.id;
        this.name = raw.name;
        this.avatarUrl = raw.avatarUrl;
    }

    public static from(raw: RawWebhookInfo): WebhookInfo {
        return new WebhookInfo(raw);
    }
}
