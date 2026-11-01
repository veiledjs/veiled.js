import type { RawMessage } from "./message";
import type { RawUser } from "./user";

export type RawBotListResponse<T, K extends string = never> =
    | T[]
    | ({ data?: T[] } & { [P in K]?: T[] } & { [key: string]: unknown });

export interface RawApplication {
    id: string;
    name?: string;
    description?: string | null;
    icon?: string | null;
    [key: string]: unknown;
}

export interface RawBotIdentity {
    user: RawUser;
    application: RawApplication;
    [key: string]: unknown;
}

export interface RawBotGateway {
    url: string;
    [key: string]: unknown;
}

export interface RawRoom {
    id: string;
    name?: string;
    description?: string | null;
    ownerId?: string;
    [key: string]: unknown;
}

export interface RawLane {
    id: string;
    roomId?: string;
    name?: string;
    type?: string;
    topic?: string | null;
    [key: string]: unknown;
}

export interface RawRole {
    id: string;
    name?: string;
    color?: number | string | null;
    position?: number;
    [key: string]: unknown;
}

export interface RawMember {
    id?: string;
    userId?: string;
    nickname?: string | null;
    user?: RawUser;
    User?: RawUser;
    roles?: unknown[];
    [key: string]: unknown;
}

export interface RawMemberPermissions {
    permissions?: string | number | string[];
    [key: string]: unknown;
}

export interface RawInvite {
    id?: string;
    code?: string;
    roomId?: string;
    maxAge?: number;
    maxUses?: number;
    temporary?: boolean;
    [key: string]: unknown;
}

export interface RawThread {
    id: string;
    laneId?: string;
    roomId?: string;
    title?: string;
    name?: string;
    [key: string]: unknown;
}

export interface RawThreadMember {
    id?: string;
    userId?: string;
    threadId?: string;
    user?: RawUser;
    [key: string]: unknown;
}

export interface RawScheduledEvent {
    id: string;
    roomId?: string;
    laneId?: string;
    name?: string;
    locationType?: string;
    scheduledStartAt?: string;
    [key: string]: unknown;
}

export interface RawLaneCapabilities {
    capabilities?: Record<string, boolean>;
    slowmode?: number;
    nextSendAt?: string | null;
    characterLimit?: number;
    [key: string]: unknown;
}

export interface RawVoiceState {
    userId?: string;
    laneId?: string;
    sessionId?: string;
    [key: string]: unknown;
}

export interface RawStagedUpload {
    id: string;
    filename?: string;
    contentType?: string;
    size?: number;
    url?: string;
    [key: string]: unknown;
}

export interface RawReactionUser {
    id?: string;
    userId?: string;
    user?: RawUser;
    [key: string]: unknown;
}

export interface RawReactionPage {
    reactions?: RawReactionUser[];
    count?: number;
    [key: string]: unknown;
}

export interface RawBotWebhook {
    id: string;
    laneId?: string;
    name?: string;
    avatarUrl?: string | null;
    webhookUrl?: string;
    [key: string]: unknown;
}

export interface RawIceServer {
    urls?: string | string[];
    username?: string;
    credential?: string;
    [key: string]: unknown;
}

export interface RawIceServerResponse {
    iceServers?: RawIceServer[];
    ttl?: number;
    [key: string]: unknown;
}

export interface RawTurnCredentials {
    username?: string;
    credential?: string;
    urls?: string | string[];
    ttl?: number;
    [key: string]: unknown;
}

export type RawMessageList = RawBotListResponse<RawMessage, "messages" | "pins">;
