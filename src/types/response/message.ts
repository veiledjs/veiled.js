import type { RawAttachment } from "./attachment";
import type { RawEmbed } from "./embed";
import type { RawReaction } from "./reaction";
import type { RawSticker } from "./sticker";
import type { RawUser } from "./user";
import type { RawWebhookInfo } from "./webhook";

export interface RawComponent {
    type: number;
    [key: string]: unknown;
}

export interface RawMessage {
    id: string;
    laneId: string;
    userId: string;
    webhookId: string | null;
    webhookDeliveryId: string | null;
    webhookUsername: string | null;
    webhookAvatarUrl: string | null;
    content: string;
    components: RawComponent[];
    flags: number;
    isEdited: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    replyToId: string | null;
    createdAt: string;
    updatedAt: string;
    threadId: string | null;
    stickerId: string | null;
    isPublished: boolean;
    originalMessageId: string | null;
    publishedToRooms: string[];

    User: RawUser;
    Attachment: RawAttachment[];
    Embed: RawEmbed[];
    Reaction: RawReaction[];
    Sticker: RawSticker | null;
    embeds: RawEmbed[];
    Webhook: RawWebhookInfo | null;
    author: RawUser;
    replyTo: RawMessage | null;
    attachments: RawAttachment[];
}

export interface RawWebhookExecuteResponse {
    message: RawMessage;
}
