import { DEFAULT_API_BASE_URL } from "./GatewayREST";
import { BotAPIError } from "./BotAPIError";
import type { RawContainerCardPayload, RawContainerLinkButtonPayload } from "../types/payload/container";
import type { FetchLike } from "../types/rest";
import type {
    BotQuery,
    RawBotBanPayload,
    RawBotInteractionPayload,
    RawBotInvitePayload,
    RawBotMessageEditPayload,
    RawBotMessagePayload,
    RawBotPollOptions,
    RawBotReactionQuery,
    RawBotRolePayload,
    RawBotRolePosition,
    RawBotScheduledEventPayload,
    RawBotThreadPayload,
    RawBotUploadFile,
    RawBotUploadInput,
    RawBotUploadOptions,
    RawBotWebhookPayload,
} from "../types/payload/bot";
import type {
    RawBotGateway,
    RawBotIdentity,
    RawBotListResponse,
    RawBotWebhook,
    RawIceServerResponse,
    RawInvite,
    RawLane,
    RawLaneCapabilities,
    RawMember,
    RawMemberPermissions,
    RawMessageList,
    RawReactionPage,
    RawRole,
    RawRoom,
    RawScheduledEvent,
    RawStagedUpload,
    RawThread,
    RawThreadMember,
    RawTurnCredentials,
    RawVoiceState,
} from "../types/response/bot";
import { BotGateway, BotIdentity } from "../structures/BotIdentity";
import { BotWebhook } from "../structures/BotWebhook";
import { Invite } from "../structures/Invite";
import { Lane } from "../structures/Lane";
import { Member } from "../structures/Member";
import { Message } from "../structures/Message";
import {
    LaneCapabilities,
    MemberPermissions,
    ReactionPage,
    StagedUpload,
} from "../structures/Misc";
import { Role } from "../structures/Role";
import { Room } from "../structures/Room";
import { ScheduledEvent } from "../structures/ScheduledEvent";
import { Thread, ThreadMember } from "../structures/Thread";
import { IceServerResponse, VoiceCredentials, VoiceState } from "../structures/Voice";
import { normalizeBotToken } from "../util/botToken";
import { createContainer, isValidContainerPayload } from "../util/container";
import { isValidUrl } from "../util/isValidUrl";
import { unwrapList, unwrapRecord } from "../util/structure";

const DEFAULT_TIMEOUT_MS = 15_000;

export interface BotRESTOptions {
    baseUrl?: string;
    token: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
}

export interface BotRequestOptions {
    method?: string;
    body?: unknown;
    headers?: RequestInit["headers"];
    signal?: AbortSignal;
}

export interface BotContainerOptions {
    replyToId?: string;
    linkButtons?: RawContainerLinkButtonPayload[];
}

export class BotREST {
    private readonly baseUrl: string;
    private readonly authorization: string;
    private readonly fetchImpl: FetchLike;
    private readonly timeoutMs: number;

    public constructor(options: BotRESTOptions) {
        const baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");

        if (!isValidUrl(baseUrl)) {
            throw new TypeError("baseUrl must be a valid URL");
        }

        const parsedBase = new URL(baseUrl);

        if (parsedBase.protocol !== "http:" && parsedBase.protocol !== "https:") {
            throw new TypeError("baseUrl must use HTTP or HTTPS");
        }

        const token = options.token?.trim();

        if (!token || token === "Bot") {
            throw new TypeError("Bot token is required");
        }

        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
            throw new RangeError("timeoutMs must be a positive integer");
        }

        this.baseUrl = baseUrl;
        this.authorization = normalizeBotToken(token);
        this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
        this.timeoutMs = timeoutMs;
    }

    private async requestEntity<T>(
        path: string,
        keys: string[],
        from: (raw: unknown) => T,
        options: BotRequestOptions = {},
    ): Promise<T | null> {
        const response = await this.request<unknown>(path, options);

        if (response === null) return null;

        const raw = unwrapRecord(response, keys);
        return Object.keys(raw).length > 0 ? from(raw) : null;
    }

    private async requestList<T>(
        path: string,
        keys: string[],
        from: (raw: unknown) => T,
        options: BotRequestOptions = {},
    ): Promise<T[]> {
        const response = await this.request<unknown>(path, options);
        return unwrapList(response, keys).map(from);
    }

    public async request<T = unknown>(
        path: string,
        options: BotRequestOptions = {},
    ): Promise<T | null> {
        const url = this.resolveUrl(path);
        const method = (options.method ?? "GET").toUpperCase();
        const headers = new Headers(options.headers);
        headers.set("Authorization", this.authorization);

        let body = options.body;

        if (body !== undefined && body !== null && !isRawBody(body)) {
            headers.set("Content-Type", "application/json");
            body = JSON.stringify(body);
        }

        let response: Response;

        try {
            response = await this.fetchImpl(url, {
                method,
                headers,
                body: body as RequestInit["body"],
                signal: options.signal ?? AbortSignal.timeout(this.timeoutMs),
            });
        } catch (error) {
            const message = isTimeoutError(error)
                ? "The Veiled API request timed out."
                : "Could not reach the Veiled API.";

            throw new BotAPIError(0, message, { cause: error });
        }

        const responseBody = await readResponseBody(response);

        if (!response.ok) {
            throw new BotAPIError(response.status, errorMessage(responseBody, response.status), {
                body: responseBody,
                details: responseBody,
                retryAfter: parseRetryAfter(response.headers.get("Retry-After")),
            });
        }

        if (response.status === 204 || response.status === 205 || responseBody === null) {
            return null;
        }

        return responseBody as T;
    }

    public getMe(): Promise<BotIdentity | null> {
        return this.requestEntity("/bots/@me", [], BotIdentity.from);
    }

    public getMyRooms(): Promise<Room[]> {
        return this.requestList("/bots/@me/rooms", ["rooms"], Room.from);
    }

    public getBotRooms(): Promise<Room[]> {
        return this.getMyRooms();
    }

    public getGateway(): Promise<BotGateway | null> {
        return this.requestEntity("/bots/gateway", ["gateway"], BotGateway.from);
    }

    public leaveRoom(roomId: string): Promise<unknown> {
        return this.request(`/bots/@me/rooms/${segment(roomId)}`, { method: "DELETE" });
    }

    public getRoom(roomId: string): Promise<Room | null> {
        return this.requestEntity(`/rooms/${segment(roomId)}`, ["room"], Room.from);
    }

    public getLanes(roomId: string): Promise<Lane[]> {
        return this.requestList(`/rooms/${segment(roomId)}/lanes`, ["lanes"], Lane.from);
    }

    public getLane(laneId: string): Promise<Lane | null> {
        return this.requestEntity(`/lanes/${segment(laneId)}`, ["lane"], Lane.from);
    }

    public getLaneCapabilities(laneId: string): Promise<LaneCapabilities | null> {
        return this.requestEntity(
            `/lanes/${segment(laneId)}/capabilities`,
            ["capabilities"],
            LaneCapabilities.from,
        );
    }

    public getMembers(roomId: string, query?: BotQuery): Promise<Member[]> {
        return this.requestList(
            withQuery(`/rooms/${segment(roomId)}/members`, query),
            ["members"],
            Member.from,
        );
    }

    public getRoomRoles(roomId: string): Promise<Role[]> {
        return this.requestList(`/rooms/${segment(roomId)}/roles`, ["roles"], Role.from);
    }

    public getRoleMembers(roomId: string, roleId: string): Promise<Member[]> {
        return this.requestList(
            `/rooms/${segment(roomId)}/roles/${segment(roleId)}/members`,
            ["members"],
            Member.from,
        );
    }

    public getMemberRoles(roomId: string, userId: string): Promise<Role[]> {
        return this.requestList(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/roles`,
            ["roles"],
            Role.from,
        );
    }

    public getMemberPermissions(roomId: string, userId: string): Promise<MemberPermissions | null> {
        return this.requestEntity(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/permissions`,
            ["permissions"],
            MemberPermissions.from,
        );
    }

    public createRole(roomId: string, payload: RawBotRolePayload): Promise<Role | null> {
        return this.requestEntity(`/rooms/${segment(roomId)}/roles`, ["role"], Role.from, {
            method: "POST",
            body: payload,
        });
    }

    public assignRole(roomId: string, userId: string, roleId: string): Promise<unknown> {
        return this.request(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/roles/${segment(roleId)}`,
            { method: "PUT", body: {} },
        );
    }

    public removeRole(roomId: string, userId: string, roleId: string): Promise<unknown> {
        return this.request(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/roles/${segment(roleId)}`,
            { method: "DELETE" },
        );
    }

    public reorderRoles(roomId: string, positions: RawBotRolePosition[]): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/roles/reorder`, {
            method: "PUT",
            body: { positions },
        });
    }

    public updateRole(roleId: string, payload: RawBotRolePayload): Promise<Role | null> {
        return this.requestEntity(`/roles/${segment(roleId)}`, ["role"], Role.from, {
            method: "PATCH",
            body: payload,
        });
    }

    public deleteRole(roleId: string): Promise<unknown> {
        return this.request(`/roles/${segment(roleId)}`, { method: "DELETE" });
    }

    public kickMember(roomId: string, userId: string, reason?: string): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/members/${segment(userId)}`, {
            method: "DELETE",
            body: reason ? { reason } : {},
        });
    }

    public banMember(
        roomId: string,
        userId: string,
        payload: RawBotBanPayload = {},
    ): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/bans/${segment(userId)}`, {
            method: "PUT",
            body: payload,
        });
    }

    public unbanMember(roomId: string, userId: string): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/bans/${segment(userId)}`, {
            method: "DELETE",
        });
    }

    public timeoutMember(
        roomId: string,
        userId: string,
        duration: number,
        reason?: string,
    ): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/timeouts`, {
            method: "POST",
            body: { userId, duration, ...(reason ? { reason } : {}) },
        });
    }

    public removeMemberTimeout(roomId: string, userId: string): Promise<unknown> {
        return this.request(`/rooms/${segment(roomId)}/timeouts/${segment(userId)}`, {
            method: "DELETE",
        });
    }

    public getMessages(laneId: string, query?: BotQuery): Promise<Message[]> {
        return this.requestList(
            withQuery(`/lanes/${segment(laneId)}/messages`, query),
            ["messages"],
            Message.fromUnknown,
        );
    }

    public sendMessage(
        laneId: string,
        payload: RawBotMessagePayload | string = {},
    ): Promise<Message | null> {
        const body = typeof payload === "string" ? { content: payload } : payload;

        if (body.components !== undefined && !Array.isArray(body.components)) {
            throw new TypeError("components must be an array.");
        }

        return this.requestEntity(
            `/lanes/${segment(laneId)}/messages`,
            ["message"],
            Message.fromUnknown,
            { method: "POST", body },
        );
    }

    public sendTyping(laneId: string): Promise<unknown> {
        return this.request(`/lanes/${segment(laneId)}/typing`, {
            method: "POST",
            body: {},
        });
    }

    public editMessage(
        messageId: string,
        payload: RawBotMessageEditPayload,
    ): Promise<Message | null> {
        return this.requestEntity(
            `/messages/${segment(messageId)}`,
            ["message"],
            Message.fromUnknown,
            { method: "PATCH", body: payload },
        );
    }

    public deleteMessage(messageId: string): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}`, { method: "DELETE" });
    }

    public addReaction(messageId: string, emoji: string): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}/reactions`, {
            method: "POST",
            body: { emoji },
        });
    }

    public removeReaction(messageId: string, emoji: string): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}/reactions/${segment(emoji)}`, {
            method: "DELETE",
        });
    }

    public removeUserReaction(
        messageId: string,
        emoji: string,
        targetUserId: string,
    ): Promise<unknown> {
        return this.request(
            `/messages/${segment(messageId)}/reactions/${segment(emoji)}/users/${segment(targetUserId)}`,
            { method: "DELETE" },
        );
    }

    public getReactions(
        messageId: string,
        emoji: string,
        query: RawBotReactionQuery = {},
    ): Promise<ReactionPage | null> {
        return this.requestEntity(
            withQuery(`/messages/${segment(messageId)}/reactions/${segment(emoji)}`, query),
            ["reactionsPage", "reactionPage"],
            ReactionPage.from,
        );
    }

    public getPins(laneId: string): Promise<Message[]> {
        return this.requestList(
            `/lanes/${segment(laneId)}/pins`,
            ["messages", "pins"],
            Message.fromUnknown,
        );
    }

    public pinMessage(messageId: string): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}/pin`, {
            method: "POST",
            body: {},
        });
    }

    public unpinMessage(messageId: string): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}/pin`, { method: "DELETE" });
    }

    public getLaneThreads(laneId: string, query?: BotQuery): Promise<Thread[]> {
        return this.requestList(
            withQuery(`/lanes/${segment(laneId)}/threads`, query),
            ["threads"],
            Thread.from,
        );
    }

    public getJoinedThreads(roomId: string): Promise<Thread[]> {
        return this.requestList(
            `/rooms/${segment(roomId)}/threads/joined`,
            ["threads"],
            Thread.from,
        );
    }

    public createThread(
        laneId: string,
        payload: RawBotThreadPayload,
    ): Promise<Thread | null> {
        return this.requestEntity(`/lanes/${segment(laneId)}/threads`, ["thread"], Thread.from, {
            method: "POST",
            body: payload,
        });
    }

    public getThread(threadId: string): Promise<Thread | null> {
        return this.requestEntity(`/threads/${segment(threadId)}`, ["thread"], Thread.from);
    }

    public updateThread(
        threadId: string,
        payload: RawBotThreadPayload,
    ): Promise<Thread | null> {
        return this.requestEntity(`/threads/${segment(threadId)}`, ["thread"], Thread.from, {
            method: "PATCH",
            body: payload,
        });
    }

    public deleteThread(threadId: string): Promise<unknown> {
        return this.request(`/threads/${segment(threadId)}`, { method: "DELETE" });
    }

    public getThreadMessages(threadId: string, query?: BotQuery): Promise<Message[]> {
        return this.requestList(
            withQuery(`/threads/${segment(threadId)}/messages`, query),
            ["messages"],
            Message.fromUnknown,
        );
    }

    public sendThreadMessage(
        threadId: string,
        payload: RawBotMessagePayload | string,
    ): Promise<Message | null> {
        const body = typeof payload === "string" ? { content: payload } : payload;

        return this.requestEntity(
            `/threads/${segment(threadId)}/messages`,
            ["message"],
            Message.fromUnknown,
            { method: "POST", body },
        );
    }

    public getThreadMembers(threadId: string): Promise<ThreadMember[]> {
        return this.requestList(
            `/threads/${segment(threadId)}/members`,
            ["members"],
            ThreadMember.from,
        );
    }

    public addThreadMember(threadId: string, userId: string): Promise<unknown> {
        return this.request(`/threads/${segment(threadId)}/members`, {
            method: "POST",
            body: { userId },
        });
    }

    public removeThreadMember(threadId: string, userId: string): Promise<unknown> {
        return this.request(
            `/threads/${segment(threadId)}/members/${segment(userId)}`,
            { method: "DELETE" },
        );
    }

    public archiveThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "archive");
    }

    public unarchiveThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "unarchive");
    }

    public lockThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "lock");
    }

    public unlockThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "unlock");
    }

    public pinThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "pin");
    }

    public publishThread(threadId: string): Promise<unknown> {
        return this.threadAction(threadId, "publish");
    }

    public createInvite(
        roomId: string,
        payload: RawBotInvitePayload = {},
        idempotencyKey?: string,
    ): Promise<Invite | null> {
        return this.requestEntity(`/rooms/${segment(roomId)}/invites`, ["invite"], Invite.from, {
            method: "POST",
            body: payload,
            headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
        });
    }

    public getInvite(code: string): Promise<Invite | null> {
        return this.requestEntity(`/invites/${segment(code)}`, ["invite"], Invite.from);
    }

    public getRoomInvites(roomId: string): Promise<Invite[]> {
        return this.requestList(`/rooms/${segment(roomId)}/invites`, ["invites"], Invite.from);
    }

    public updateInvite(code: string, payload: RawBotInvitePayload): Promise<Invite | null> {
        return this.requestEntity(`/invites/${segment(code)}`, ["invite"], Invite.from, {
            method: "PATCH",
            body: payload,
        });
    }

    public revokeInvite(code: string): Promise<unknown> {
        return this.request(`/invites/${segment(code)}`, { method: "DELETE" });
    }

    public getScheduledEvents(roomId: string, query?: BotQuery): Promise<ScheduledEvent[]> {
        return this.requestList(
            withQuery(`/rooms/${segment(roomId)}/events`, query),
            ["events"],
            ScheduledEvent.from,
        );
    }

    public getScheduledEvent(eventId: string): Promise<ScheduledEvent | null> {
        return this.requestEntity(`/events/${segment(eventId)}`, ["event"], ScheduledEvent.from);
    }

    public createScheduledEvent(
        roomId: string,
        payload: RawBotScheduledEventPayload,
    ): Promise<ScheduledEvent | null> {
        return this.requestEntity(
            `/rooms/${segment(roomId)}/events`,
            ["event"],
            ScheduledEvent.from,
            { method: "POST", body: payload },
        );
    }

    public updateScheduledEvent(
        eventId: string,
        payload: RawBotScheduledEventPayload,
        scope = "OCCURRENCE",
    ): Promise<ScheduledEvent | null> {
        return this.requestEntity(
            withQuery(`/events/${segment(eventId)}`, { scope }),
            ["event"],
            ScheduledEvent.from,
            { method: "PATCH", body: payload },
        );
    }

    public cancelScheduledEvent(eventId: string, scope = "OCCURRENCE"): Promise<unknown> {
        return this.request(withQuery(`/events/${segment(eventId)}`, { scope }), {
            method: "DELETE",
        });
    }

    public setEventRsvp(eventId: string, status: string): Promise<unknown> {
        return this.request(`/events/${segment(eventId)}/rsvp`, {
            method: "PUT",
            body: { status },
        });
    }

    public removeEventRsvp(eventId: string): Promise<unknown> {
        return this.request(`/events/${segment(eventId)}/rsvp`, { method: "DELETE" });
    }

    public getVoiceStates(laneId: string): Promise<VoiceState[]> {
        return this.requestList(
            `/lanes/${segment(laneId)}/voice-states`,
            ["users", "states", "voiceStates"],
            VoiceState.from,
        );
    }

    public joinVoice(laneId: string, sessionId?: string): Promise<unknown> {
        return this.request("/voice/join", {
            method: "POST",
            body: { laneId, ...(sessionId ? { sessionId } : {}) },
        });
    }

    public leaveVoice(laneId: string): Promise<unknown> {
        return this.request("/voice/leave", {
            method: "POST",
            body: { laneId },
        });
    }

    public getVoiceIceServers(laneId?: string): Promise<IceServerResponse | null> {
        return this.requestEntity(
            withQuery("/voice/ice-servers", laneId ? { laneId } : undefined),
            ["ice", "iceServersResponse"],
            IceServerResponse.from,
        );
    }

    public getVoiceTurnCredentials(laneId?: string): Promise<VoiceCredentials | null> {
        return this.requestEntity(
            withQuery("/voice/turn-credentials", laneId ? { laneId } : undefined),
            ["credentials", "turn"],
            VoiceCredentials.from,
        );
    }

    public sendContainer(
        laneId: string,
        card: RawContainerCardPayload,
        options: BotContainerOptions = {},
    ): Promise<Message | null> {
        const components = this.containerComponents(card, options);

        return this.sendMessage(laneId, {
            components,
            ...(options.replyToId ? { replyToId: options.replyToId } : {}),
        });
    }

    public async sendContainerWithFiles(
        laneId: string,
        card: RawContainerCardPayload,
        files: RawBotUploadInput[],
        options: BotContainerOptions = {},
    ): Promise<{ message: Message | null; uploads: Array<StagedUpload | null> }> {
        const uploads: Array<StagedUpload | null> = [];

        for (const file of files) {
            if (isUploadFile(file)) {
                if (file.data === undefined) {
                    throw new TypeError("Upload file data is required.");
                }

                uploads.push(await this.stageUpload(file.data, file));
                continue;
            }

            uploads.push(await this.stageUpload(file));
        }

        const components = this.containerComponents(card, options);

        const message = await this.sendMessage(laneId, {
            components,
            stagedUploadIds: uploads.flatMap((upload) => upload?.id ? [upload.id] : []),
            ...(options.replyToId ? { replyToId: options.replyToId } : {}),
        });

        return { message, uploads };
    }

    public async stageUpload(
        file: Blob | ArrayBuffer | ArrayBufferView | string,
        options: RawBotUploadOptions = {},
    ): Promise<StagedUpload | null> {
        const contentType = options.contentType ?? "application/octet-stream";
        const part = file instanceof Blob
            ? file
            : typeof file === "string"
                ? file
                : file instanceof ArrayBuffer
                    ? file
                    : new Uint8Array(file.buffer, file.byteOffset, file.byteLength);
        const blob = new Blob([part], { type: contentType });
        const form = new FormData();
        const filename = options.filename
            ?? (file instanceof Blob && typeof (file as Blob & { name?: unknown }).name === "string"
                ? (file as Blob & { name: string }).name
                : "upload.bin");

        form.append("file", blob, filename);

        if (options.description) {
            form.append("description", options.description);
        }

        return this.requestEntity("/uploads/staged", ["upload", "stagedUpload"], StagedUpload.from, {
            method: "POST",
            body: form,
        });
    }

    public getLaneWebhooks(laneId: string): Promise<BotWebhook[]> {
        return this.requestList(
            `/lanes/${segment(laneId)}/webhooks`,
            ["webhooks"],
            BotWebhook.from,
        );
    }

    public getWebhook(webhookId: string): Promise<BotWebhook | null> {
        return this.requestEntity(
            `/webhooks/${segment(webhookId)}`,
            ["webhook"],
            BotWebhook.from,
        );
    }

    public createWebhook(
        laneId: string,
        payload: RawBotWebhookPayload,
    ): Promise<BotWebhook | null> {
        return this.requestEntity(
            `/lanes/${segment(laneId)}/webhooks`,
            ["webhook"],
            BotWebhook.from,
            { method: "POST", body: payload },
        );
    }

    public updateWebhook(
        webhookId: string,
        payload: RawBotWebhookPayload,
    ): Promise<BotWebhook | null> {
        return this.requestEntity(
            `/webhooks/${segment(webhookId)}`,
            ["webhook"],
            BotWebhook.from,
            { method: "PATCH", body: payload },
        );
    }

    public resetWebhookToken(webhookId: string): Promise<BotWebhook | null> {
        return this.requestEntity(
            `/webhooks/${segment(webhookId)}/token`,
            ["webhook"],
            BotWebhook.from,
            { method: "POST", body: {} },
        );
    }

    public deleteWebhook(webhookId: string): Promise<unknown> {
        return this.request(`/webhooks/${segment(webhookId)}`, { method: "DELETE" });
    }

    public respondToInteraction(
        interactionId: string,
        payload: RawBotInteractionPayload,
    ): Promise<unknown> {
        return this.request(`/interactions/${segment(interactionId)}/callback`, {
            method: "POST",
            body: payload,
        });
    }

    public respondToCommandInteraction(
        interactionId: string,
        payload: RawBotInteractionPayload,
    ): Promise<unknown> {
        return this.request(`/interactions/commands/${segment(interactionId)}/callback`, {
            method: "POST",
            body: payload,
        });
    }

    public getCommandInteractionAttachment(
        interactionId: string,
        attachmentId: string,
    ): Promise<unknown> {
        return this.request(
            `/interactions/commands/${segment(interactionId)}/attachments/${segment(attachmentId)}`,
        );
    }

    public createPoll(
        laneId: string,
        options: RawBotPollOptions,
    ): Promise<Message | null> {
        const durationHours = options.durationHours ?? 24;
        const allowMultiselect = options.allowMultiselect ?? false;
        const allowedDurations = new Set([0, 1, 6, 24, 72, 168]);

        if (typeof options.question !== "string"
            || options.question.trim().length === 0
            || options.question.trim().length > 150) {
            throw new TypeError("Poll question must be 1–150 characters.");
        }

        if (!Array.isArray(options.options)
            || options.options.length < 2
            || options.options.length > 10
            || options.options.some((option) =>
                typeof option !== "string"
                || option.trim().length === 0
                || option.trim().length > 80)) {
            throw new TypeError("A poll needs 2–10 options, each 1–80 characters.");
        }

        if (!allowedDurations.has(durationHours) || typeof allowMultiselect !== "boolean") {
            throw new TypeError("Poll duration or multiselect value is invalid.");
        }

        const content = `[POLL_DATA]${JSON.stringify({
            question: options.question.trim(),
            options: options.options.map((option) => option.trim()),
            durationHours,
            allowMultiselect,
            createdAt: new Date().toISOString(),
        })}`;

        return this.sendMessage(laneId, {
            content,
            ...(options.replyToId ? { replyToId: options.replyToId } : {}),
        });
    }

    private containerComponents(
        card: RawContainerCardPayload,
        options: BotContainerOptions,
    ) {
        const components = createContainer({
            ...card,
            linkButtons: options.linkButtons ?? card.linkButtons,
        });

        if (!isValidContainerPayload(components)) {
            throw new TypeError("Container must use a Components V2 container root.");
        }

        return components;
    }

    private threadAction(threadId: string, action: string): Promise<unknown> {
        return this.request(`/threads/${segment(threadId)}/${action}`, {
            method: "POST",
            body: {},
        });
    }

    private resolveUrl(path: string): URL {
        const base = new URL(this.baseUrl);
        const url = new URL(path.replace(/^\/+/, ""), `${this.baseUrl}/`);
        const basePath = base.pathname.replace(/\/?$/, "/");

        if (url.origin !== base.origin || !url.pathname.startsWith(basePath)) {
            throw new TypeError("API paths must remain inside the configured API base URL.");
        }

        return url;
    }
}

function segment(value: string): string {
    return encodeURIComponent(value);
}

function withQuery(path: string, query?: string | object): string {
    if (query === undefined || (typeof query === "string" && query.length === 0)) {
        return path;
    }

    const params = typeof query === "string"
        ? new URLSearchParams(query.replace(/^\?/, ""))
        : toSearchParams(query);
    const value = params.toString();

    if (value.length === 0) {
        return path;
    }

    return `${path}${path.includes("?") ? "&" : "?"}${value}`;
}

function toSearchParams(query: object): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
            for (const item of value) params.append(key, String(item));
            continue;
        }

        params.set(key, String(value));
    }

    return params;
}

function isUploadFile(value: RawBotUploadInput): value is RawBotUploadFile {
    return typeof value === "object"
        && value !== null
        && !(value instanceof Blob)
        && !(value instanceof ArrayBuffer)
        && !ArrayBuffer.isView(value);
}

function isRawBody(value: unknown): boolean {
    return typeof value === "string"
        || value instanceof FormData
        || value instanceof Blob
        || value instanceof ArrayBuffer
        || ArrayBuffer.isView(value)
        || value instanceof URLSearchParams;
}

function isTimeoutError(error: unknown): boolean {
    return error instanceof Error
        && (error.name === "TimeoutError" || error.name === "AbortError");
}

function parseRetryAfter(value: string | null): number | null {
    if (value === null || value.length === 0) {
        return null;
    }

    const seconds = Number(value);

    if (Number.isFinite(seconds)) {
        return seconds;
    }

    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? null : Math.max(0, (timestamp - Date.now()) / 1000);
}

async function readResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();

    if (text.length === 0) {
        return null;
    }

    const contentType = response.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
        try {
            return JSON.parse(text) as unknown;
        } catch (error) {
            throw new BotAPIError(response.status, "Veiled API returned invalid JSON.", {
                body: text,
                cause: error,
            });
        }
    }

    return text;
}

function errorMessage(body: unknown, status: number): string {
    if (typeof body === "string" && body.length > 0) {
        return body.slice(0, 500);
    }

    if (typeof body === "object" && body !== null) {
        const value = body as { error?: unknown; message?: unknown };

        if (typeof value.error === "string" && value.error.length > 0) {
            return value.error;
        }

        if (typeof value.message === "string" && value.message.length > 0) {
            return value.message;
        }

        if (typeof value.error === "object" && value.error !== null) {
            const nested = value.error as { message?: unknown };

            if (typeof nested.message === "string" && nested.message.length > 0) {
                return nested.message;
            }
        }
    }

    return `Veiled API returned HTTP ${status}.`;
}
