import type { RawComponent, RawMessage } from "../types/response/message";
import { Attachment } from "./Attachment";
import { Embed } from "./Embed";
import { Reaction } from "./Reaction";
import { Sticker } from "./Sticker";
import { User } from "./User";
import { WebhookInfo } from "./WebhookInfo";
import { Structure } from "./Structure";
import {
    asArray,
    asBoolean,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    asStringArray,
    unwrapRecord,
} from "../util/structure";

export class Message extends Structure<RawMessage> {
    public readonly id: string;
    public readonly laneId: string;
    public readonly roomId: string | null;
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

    private constructor(raw: RawMessage) {
        super(raw);
        const source = raw as unknown as Record<string, unknown>;
        this.id = raw.id;
        this.laneId = raw.laneId;
        this.roomId = asNullableString(source.roomId ?? asRecord(source.room).id);
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

    public static fromUnknown(value: unknown): Message {
        const data = unwrapRecord(value, ["message", "Message"]);
        return new Message(normalizeMessage(data));
    }
}

function normalizeMessage(data: Record<string, unknown>): RawMessage {
    const user = asRecord(data.User ?? data.author ?? data.user);
    const author = asRecord(data.author ?? data.User ?? data.user);
    const embeds = asArray(data.embeds).length > 0 ? asArray(data.embeds) : asArray(data.Embed);
    const attachments = asArray(data.attachments).length > 0
        ? asArray(data.attachments)
        : asArray(data.Attachment);
    const createdAt = asString(data.createdAt, new Date().toISOString());
    const updatedAt = asString(data.updatedAt, createdAt);
    const replyTo = asRecord(data.replyTo);

    return {
        ...data,
        id: asString(data.id ?? data.messageId),
        laneId: asString(data.laneId ?? data.channelId ?? data.channel_id),
        roomId: data.roomId,
        userId: asString(data.userId ?? user.id),
        webhookId: asNullableString(data.webhookId),
        webhookDeliveryId: asNullableString(data.webhookDeliveryId),
        webhookUsername: asNullableString(data.webhookUsername),
        webhookAvatarUrl: asNullableString(data.webhookAvatarUrl),
        content: asString(data.content),
        components: asArray(data.components),
        flags: asNumber(data.flags),
        isEdited: asBoolean(data.isEdited ?? data.edited),
        isDeleted: asBoolean(data.isDeleted),
        isPinned: asBoolean(data.isPinned ?? data.pinned),
        replyToId: asNullableString(data.replyToId),
        threadId: asNullableString(data.threadId),
        stickerId: asNullableString(data.stickerId),
        isPublished: asBoolean(data.isPublished),
        originalMessageId: asNullableString(data.originalMessageId),
        publishedToRooms: asStringArray(data.publishedToRooms),
        User: user,
        author,
        Attachment: asArray(data.Attachment),
        Embed: asArray(data.Embed),
        Reaction: asArray(data.Reaction),
        Sticker: data.Sticker ?? null,
        embeds,
        Webhook: data.Webhook ?? null,
        replyTo: Object.keys(replyTo).length > 0 ? normalizeMessage(replyTo) : null,
        attachments,
        createdAt,
        updatedAt,
    } as unknown as RawMessage;
}
