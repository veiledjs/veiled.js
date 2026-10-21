import type { RawUser } from "../types/response/user";

export class User {
    public readonly id: string;
    public readonly username: string;
    public readonly discriminator: string | null;
    public readonly avatarUrl: string | null;
    public readonly displayName: string;
    public readonly bot: boolean;
    public readonly isWebhook: boolean;
    public readonly webhookId: string | null;
    public readonly raw: RawUser;

    private constructor(raw: RawUser) {
        this.raw = raw;
        this.id = raw.id;
        this.username = raw.username;
        this.discriminator = raw.discriminator ?? null;
        this.avatarUrl = raw.avatar;
        this.displayName = raw.displayName;
        this.bot = raw.isBot ?? raw.bot ?? false;
        this.isWebhook = raw.isWebhook ?? false;
        this.webhookId = raw.webhookId ?? null;
    }

    public static from(raw: RawUser): User {
        return new User(raw);
    }
}
