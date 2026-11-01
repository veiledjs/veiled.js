import type { RawEmbedPayload } from "./embed";

export type BotQueryValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | readonly (string | number | boolean)[];

export type BotQuery = string | Record<string, BotQueryValue>;

export interface RawBotMessagePayload {
    content?: string | null;
    embeds?: RawEmbedPayload[];
    components?: unknown[];
    replyToId?: string | null;
    threadId?: string | null;
    stagedUploadIds?: string[];
    flags?: number;
}

export interface RawBotMessageEditPayload {
    content?: string | null;
    embeds?: RawEmbedPayload[];
    components?: unknown[];
    title?: string | null;
}

export interface RawBotRolePayload {
    name?: string;
    color?: number | string | null;
    hoist?: boolean;
    isMentionable?: boolean;
    permissions?: string | number | string[] | null;
    position?: number;
    [key: string]: unknown;
}

export interface RawBotRolePosition {
    roleId: string;
    position: number;
}

export interface RawBotBanPayload {
    reason?: string;
    deleteMessageSeconds?: number;
    [key: string]: unknown;
}

export interface RawBotInvitePayload {
    maxAge?: number;
    maxUses?: number;
    temporary?: boolean;
    [key: string]: unknown;
}

export interface RawBotScheduledEventPayload {
    laneId?: string;
    name?: string;
    description?: string | null;
    locationType?: string;
    externalLocation?: string | null;
    scheduledStartAt?: string;
    scheduledEndAt?: string | null;
    timezone?: string;
    [key: string]: unknown;
}

export interface RawBotThreadPayload {
    title?: string;
    name?: string;
    content?: string;
    starterMessageId?: string;
    type?: string | number;
    [key: string]: unknown;
}

export interface RawBotWebhookPayload {
    name?: string;
    avatarUrl?: string | null;
    laneId?: string;
    [key: string]: unknown;
}

export interface RawBotInteractionPayload {
    type: string;
    content?: string | null;
    embeds?: RawEmbedPayload[];
    components?: unknown[];
    ephemeral?: boolean;
    stagedUploadIds?: string[];
    modal?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface RawBotPollOptions {
    question: string;
    options: string[];
    durationHours?: number;
    allowMultiselect?: boolean;
    replyToId?: string;
}

export interface RawBotUploadOptions {
    filename?: string;
    contentType?: string;
    description?: string;
}

export type RawBotUploadData = Blob | ArrayBuffer | ArrayBufferView | string;

export interface RawBotUploadFile extends RawBotUploadOptions {
    data?: RawBotUploadData;
}

export type RawBotUploadInput = RawBotUploadData | RawBotUploadFile;

export interface RawBotReactionQuery {
    limit?: number;
    after?: string;
}
