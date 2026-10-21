export interface RawUser {
    id: string;
    username: string;
    discriminator?: string | null;
    avatar: string | null;
    displayName: string;
    bot?: boolean;
    isBot?: boolean;
    isWebhook?: boolean;
    webhookId?: string;
}
