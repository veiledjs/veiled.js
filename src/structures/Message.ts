import type { RawComponent, RawMessage } from "../types/response/message";
import { Attachment } from "./Attachment";
import { Embed } from "./Embed";
import { Reaction } from "./Reaction";
import { Sticker } from "./Sticker";
import { User } from "./User";
import { WebhookInfo } from "./WebhookInfo";

export class Message {
    public readonly id: string;
    public readonly laneId: string;
    public readonly userId: string;
    public readonly webhookId: string | null;
    public readonly webhookDeliveryId: string | null;
    public readonly webhookUsername: string | null;
    public readonly webhookAvatarUrl: string | null;
    public readonly content: string;
    public readonly components: RawComponent[];
    public readonly flags: number;
    public readonly isEdited: boolean;
    public readonly isDeleted: boolean;
    public readonly isPinned: boolean;
    public readonly replyToId: string | null;
    public readonly threadId: string | null;
    public readonly stickerId: string | null;
    public readonly isPublished: boolean;
    public readonly originalMessageId: string | null;
    public readonly publishedToRooms: string[];

    public readonly user: User;
    public readonly author: User;
    public readonly embeds: Embed[];
    public readonly attachments: Attachment[];
    public readonly reactions: Reaction[];
    public readonly sticker: Sticker | null;
    public readonly webhook: WebhookInfo | null;
    public readonly replyTo: Message | null;

    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    public readonly raw: RawMessage;

    private constructor(raw: RawMessage) {
        this.raw = raw;
        this.id = raw.id;
        this.laneId = raw.laneId;
        this.userId = raw.userId;
        this.webhookId = raw.webhookId;
        this.webhookDeliveryId = raw.webhookDeliveryId;
        this.webhookUsername = raw.webhookUsername;
        this.webhookAvatarUrl = raw.webhookAvatarUrl;
        this.content = raw.content;
        this.components = raw.components ?? [];
        this.flags = raw.flags;
        this.isEdited = raw.isEdited;
        this.isDeleted = raw.isDeleted;
        this.isPinned = raw.isPinned;
        this.replyToId = raw.replyToId;
        this.threadId = raw.threadId;
        this.stickerId = raw.stickerId;
        this.isPublished = raw.isPublished;
        this.originalMessageId = raw.originalMessageId;
        this.publishedToRooms = raw.publishedToRooms ?? [];

        this.user = User.from(raw.User);
        this.author = User.from(raw.author ?? raw.User);
        this.embeds = (raw.embeds?.length ? raw.embeds : raw.Embed ?? []).map(Embed.from);
        this.attachments = (raw.attachments?.length ? raw.attachments : raw.Attachment ?? []).map(Attachment.from);
        this.reactions = (raw.Reaction ?? []).map(Reaction.from);
        this.sticker = raw.Sticker ? Sticker.from(raw.Sticker) : null;
        this.webhook = raw.Webhook ? WebhookInfo.from(raw.Webhook) : null;
        this.replyTo = raw.replyTo ? Message.from(raw.replyTo) : null;

        this.createdAt = new Date(raw.createdAt);
        this.updatedAt = new Date(raw.updatedAt);
    }

    public static from(raw: RawMessage): Message {
        return new Message(raw);
    }
}
