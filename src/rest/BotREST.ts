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
import { normalizeBotToken } from "../util/botToken";
import { createContainer, isValidContainerPayload } from "../util/container";
import { isValidUrl } from "../util/isValidUrl";

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

    public getMe(): Promise<RawBotIdentity | null> {
        return this.request<RawBotIdentity>("/bots/@me");
    }

    public getMyRooms(): Promise<RawBotListResponse<RawRoom, "rooms"> | null> {
        return this.request<RawBotListResponse<RawRoom, "rooms">>("/bots/@me/rooms");
    }

    public getBotRooms(): Promise<RawBotListResponse<RawRoom, "rooms"> | null> {
        return this.getMyRooms();
    }

    public getGateway(): Promise<RawBotGateway | null> {
        return this.request<RawBotGateway>("/bots/gateway");
    }

    public leaveRoom(roomId: string): Promise<unknown> {
        return this.request(`/bots/@me/rooms/${segment(roomId)}`, { method: "DELETE" });
    }

    public getRoom(roomId: string): Promise<RawRoom | null> {
        return this.request<RawRoom>(`/rooms/${segment(roomId)}`);
    }

    public getLanes(roomId: string): Promise<RawBotListResponse<RawLane, "lanes"> | null> {
        return this.request<RawBotListResponse<RawLane, "lanes">>(
            `/rooms/${segment(roomId)}/lanes`,
        );
    }

    public getLane(laneId: string): Promise<RawLane | null> {
        return this.request<RawLane>(`/lanes/${segment(laneId)}`);
    }

    public getLaneCapabilities(laneId: string): Promise<RawLaneCapabilities | null> {
        return this.request<RawLaneCapabilities>(`/lanes/${segment(laneId)}/capabilities`);
    }

    public getMembers(
        roomId: string,
        query?: BotQuery,
    ): Promise<RawBotListResponse<RawMember, "members"> | null> {
        return this.request<RawBotListResponse<RawMember, "members">>(
            withQuery(`/rooms/${segment(roomId)}/members`, query),
        );
    }

    public getRoomRoles(
        roomId: string,
    ): Promise<RawBotListResponse<RawRole, "roles"> | null> {
        return this.request<RawBotListResponse<RawRole, "roles">>(
            `/rooms/${segment(roomId)}/roles`,
        );
    }

    public getRoleMembers(
        roomId: string,
        roleId: string,
    ): Promise<RawBotListResponse<RawMember, "members"> | null> {
        return this.request<RawBotListResponse<RawMember, "members">>(
            `/rooms/${segment(roomId)}/roles/${segment(roleId)}/members`,
        );
    }

    public getMemberRoles(
        roomId: string,
        userId: string,
    ): Promise<RawBotListResponse<RawRole, "roles"> | null> {
        return this.request<RawBotListResponse<RawRole, "roles">>(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/roles`,
        );
    }

    public getMemberPermissions(
        roomId: string,
        userId: string,
    ): Promise<RawMemberPermissions | null> {
        return this.request<RawMemberPermissions>(
            `/rooms/${segment(roomId)}/members/${segment(userId)}/permissions`,
        );
    }

    public createRole(roomId: string, payload: RawBotRolePayload): Promise<RawRole | null> {
        return this.request<RawRole>(`/rooms/${segment(roomId)}/roles`, {
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

    public updateRole(roleId: string, payload: RawBotRolePayload): Promise<RawRole | null> {
        return this.request<RawRole>(`/roles/${segment(roleId)}`, {
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

    public getMessages(laneId: string, query?: BotQuery): Promise<RawMessageList | null> {
        return this.request<RawMessageList>(
            withQuery(`/lanes/${segment(laneId)}/messages`, query),
        );
    }

    public sendMessage(
        laneId: string,
        payload: RawBotMessagePayload | string = {},
    ): Promise<unknown> {
        const body = typeof payload === "string" ? { content: payload } : payload;

        if (body.components !== undefined && !Array.isArray(body.components)) {
            throw new TypeError("components must be an array.");
        }

        return this.request(`/lanes/${segment(laneId)}/messages`, {
            method: "POST",
            body,
        });
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
    ): Promise<unknown> {
        return this.request(`/messages/${segment(messageId)}`, {
            method: "PATCH",
            body: payload,
        });
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
    ): Promise<RawReactionPage | null> {
        return this.request<RawReactionPage>(
            withQuery(`/messages/${segment(messageId)}/reactions/${segment(emoji)}`, query),
        );
    }

    public getPins(laneId: string): Promise<RawMessageList | null> {
        return this.request<RawMessageList>(`/lanes/${segment(laneId)}/pins`);
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

    public getLaneThreads(
        laneId: string,
        query?: BotQuery,
    ): Promise<RawBotListResponse<RawThread, "threads"> | null> {
        return this.request<RawBotListResponse<RawThread, "threads">>(
            withQuery(`/lanes/${segment(laneId)}/threads`, query),
        );
    }

    public getJoinedThreads(
        roomId: string,
    ): Promise<RawBotListResponse<RawThread, "threads"> | null> {
        return this.request<RawBotListResponse<RawThread, "threads">>(
            `/rooms/${segment(roomId)}/threads/joined`,
        );
    }

    public createThread(
        laneId: string,
        payload: RawBotThreadPayload,
    ): Promise<RawThread | null> {
        return this.request<RawThread>(`/lanes/${segment(laneId)}/threads`, {
            method: "POST",
            body: payload,
        });
    }

    public getThread(threadId: string): Promise<RawThread | null> {
        return this.request<RawThread>(`/threads/${segment(threadId)}`);
    }

    public updateThread(
        threadId: string,
        payload: RawBotThreadPayload,
    ): Promise<RawThread | null> {
        return this.request<RawThread>(`/threads/${segment(threadId)}`, {
            method: "PATCH",
            body: payload,
        });
    }

    public deleteThread(threadId: string): Promise<unknown> {
        return this.request(`/threads/${segment(threadId)}`, { method: "DELETE" });
    }

    public getThreadMessages(
        threadId: string,
        query?: BotQuery,
    ): Promise<RawMessageList | null> {
        return this.request<RawMessageList>(
            withQuery(`/threads/${segment(threadId)}/messages`, query),
        );
    }

    public sendThreadMessage(
        threadId: string,
        payload: RawBotMessagePayload | string,
    ): Promise<unknown> {
        const body = typeof payload === "string" ? { content: payload } : payload;

        return this.request(`/threads/${segment(threadId)}/messages`, {
            method: "POST",
            body,
        });
    }

    public getThreadMembers(
        threadId: string,
    ): Promise<RawBotListResponse<RawThreadMember, "members"> | null> {
        return this.request<RawBotListResponse<RawThreadMember, "members">>(
            `/threads/${segment(threadId)}/members`,
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
    ): Promise<RawInvite | null> {
        return this.request<RawInvite>(`/rooms/${segment(roomId)}/invites`, {
            method: "POST",
            body: payload,
            headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
        });
    }

    public getInvite(code: string): Promise<RawInvite | null> {
        return this.request<RawInvite>(`/invites/${segment(code)}`);
    }

    public getRoomInvites(
        roomId: string,
    ): Promise<RawBotListResponse<RawInvite, "invites"> | null> {
        return this.request<RawBotListResponse<RawInvite, "invites">>(
            `/rooms/${segment(roomId)}/invites`,
        );
    }

    public updateInvite(
        code: string,
        payload: RawBotInvitePayload,
    ): Promise<RawInvite | null> {
        return this.request<RawInvite>(`/invites/${segment(code)}`, {
            method: "PATCH",
            body: payload,
        });
    }

    public revokeInvite(code: string): Promise<unknown> {
        return this.request(`/invites/${segment(code)}`, { method: "DELETE" });
    }

    public getScheduledEvents(
        roomId: string,
        query?: BotQuery,
    ): Promise<RawBotListResponse<RawScheduledEvent, "events"> | null> {
        return this.request<RawBotListResponse<RawScheduledEvent, "events">>(
            withQuery(`/rooms/${segment(roomId)}/events`, query),
        );
    }

    public getScheduledEvent(eventId: string): Promise<RawScheduledEvent | null> {
        return this.request<RawScheduledEvent>(`/events/${segment(eventId)}`);
    }

    public createScheduledEvent(
        roomId: string,
        payload: RawBotScheduledEventPayload,
    ): Promise<RawScheduledEvent | null> {
        return this.request<RawScheduledEvent>(`/rooms/${segment(roomId)}/events`, {
            method: "POST",
            body: payload,
        });
    }

    public updateScheduledEvent(
        eventId: string,
        payload: RawBotScheduledEventPayload,
        scope = "OCCURRENCE",
    ): Promise<RawScheduledEvent | null> {
        return this.request<RawScheduledEvent>(
            withQuery(`/events/${segment(eventId)}`, { scope }),
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

    public getVoiceStates(
        laneId: string,
    ): Promise<RawBotListResponse<RawVoiceState, "users" | "states"> | null> {
        return this.request<RawBotListResponse<RawVoiceState, "users" | "states">>(
            `/lanes/${segment(laneId)}/voice-states`,
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

    public getVoiceIceServers(laneId?: string): Promise<RawIceServerResponse | null> {
        return this.request<RawIceServerResponse>(
            withQuery("/voice/ice-servers", laneId ? { laneId } : undefined),
        );
    }

    public getVoiceTurnCredentials(laneId?: string): Promise<RawTurnCredentials | null> {
        return this.request<RawTurnCredentials>(
            withQuery("/voice/turn-credentials", laneId ? { laneId } : undefined),
        );
    }

    public sendContainer(
        laneId: string,
        card: RawContainerCardPayload,
        options: BotContainerOptions = {},
    ): Promise<unknown> {
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
    ): Promise<{ message: unknown; uploads: Array<RawStagedUpload | null> }> {
        const uploads: Array<RawStagedUpload | null> = [];

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
    ): Promise<RawStagedUpload | null> {
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

        return this.request<RawStagedUpload>("/uploads/staged", {
            method: "POST",
            body: form,
        });
    }

    public getLaneWebhooks(
        laneId: string,
    ): Promise<RawBotListResponse<RawBotWebhook, "webhooks"> | null> {
        return this.request<RawBotListResponse<RawBotWebhook, "webhooks">>(
            `/lanes/${segment(laneId)}/webhooks`,
        );
    }

    public getWebhook(webhookId: string): Promise<RawBotWebhook | null> {
        return this.request<RawBotWebhook>(`/webhooks/${segment(webhookId)}`);
    }

    public createWebhook(
        laneId: string,
        payload: RawBotWebhookPayload,
    ): Promise<RawBotWebhook | null> {
        return this.request<RawBotWebhook>(`/lanes/${segment(laneId)}/webhooks`, {
            method: "POST",
            body: payload,
        });
    }

    public updateWebhook(
        webhookId: string,
        payload: RawBotWebhookPayload,
    ): Promise<RawBotWebhook | null> {
        return this.request<RawBotWebhook>(`/webhooks/${segment(webhookId)}`, {
            method: "PATCH",
            body: payload,
        });
    }

    public resetWebhookToken(webhookId: string): Promise<RawBotWebhook | null> {
        return this.request<RawBotWebhook>(`/webhooks/${segment(webhookId)}/token`, {
            method: "POST",
            body: {},
        });
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
    ): Promise<unknown> {
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
