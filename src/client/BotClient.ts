import { GatewayConnection } from "../gateway/GatewayConnection";
import { GatewayEventContext } from "../gateway/GatewayEventContext";
import type { GatewayEventName } from "../gateway/GatewayEvents";
import { GatewayState } from "../gateway/GatewayState";
import {
    GatewayConnectionError,
    GatewayError,
    GatewayNotConnectedError,
} from "../gateway/errors";
import { DEFAULT_API_BASE_URL, GatewayREST } from "../rest/GatewayREST";
import type { GatewayAckResult } from "../types/gateway/ack";
import type {
    GatewayAnyListener,
    GatewayCloseInfo,
    RawGatewayEvent,
    RawGatewayReplayGap,
} from "../types/gateway/event";
import type {
    BotClientOptions,
    GatewayConnectionOptions,
    ReconnectOptions,
    Shard,
} from "../types/gateway/options";
import type { SocketFactory } from "../types/gateway/socket";
import { TypedEventEmitter } from "../util/TypedEventEmitter";
import { isValidUrl } from "../util/isValidUrl";

const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;
const DEFAULT_ACK_TIMEOUT_MS = 10_000;
const MAX_SHARD_COUNT = 1024;

export type BotClientEventMap = {
    connected: [];
    reconnected: [];
    disconnected: [info: GatewayCloseInfo];
    reconnecting: [attempt: number];
    reconnectFailed: [];
    replayGap: [gap: RawGatewayReplayGap];
    error: [error: GatewayError];
    debug: [message: string, ...args: unknown[]];
} & {
    [K in GatewayEventName]: [payload: RawGatewayEvent, context: GatewayEventContext];
};

export type BotClientListener<K extends keyof BotClientEventMap> = (
    ...args: BotClientEventMap[K]
) => void | Promise<void>;

interface NormalizedBotClientOptions {
    token: string;
    intents: number;
    shard: Shard;
    gatewayUrl: string | undefined;
    apiBaseUrl: string;
    urlResolver: (() => string | Promise<string>) | undefined;
    autoAck: boolean;
    connectTimeoutMs: number;
    ackTimeoutMs: number;
    reconnect: false | ReconnectOptions;
    socketFactory: SocketFactory | undefined;
    debug: boolean;
}

export class BotClient {
    private readonly options: NormalizedBotClientOptions;
    private readonly emitter = new TypedEventEmitter<BotClientEventMap>();
    private readonly anyListeners = new Set<GatewayAnyListener>();
    private readonly ackPromises = new Map<string, Promise<GatewayAckResult>>();

    private connection: GatewayConnection | undefined;
    private connectPromise: Promise<void> | undefined;
    private connectionAttempt = 0;
    private currentState = GatewayState.Idle;

    public constructor(options: BotClientOptions) {
        this.options = normalizeOptions(options);
    }

    public get state(): GatewayState {
        return this.currentState;
    }

    public get connected(): boolean {
        return this.currentState === GatewayState.Connected
            && this.connection?.connected === true;
    }

    public connect(): Promise<void> {
        if (this.currentState === GatewayState.Connected) {
            return Promise.resolve();
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        const attempt = ++this.connectionAttempt;
        const promise = this.startConnection(attempt).finally(() => {
            if (this.connectPromise === promise) {
                this.connectPromise = undefined;
            }
        });

        this.connectPromise = promise;
        return promise;
    }

    public async disconnect(): Promise<void> {
        const connection = this.connection;

        this.connectionAttempt += 1;
        this.currentState = GatewayState.Disconnecting;

        if (connection) {
            await connection.disconnect();
        }

        this.connection = undefined;
        this.ackPromises.clear();
        this.currentState = GatewayState.Disconnected;
    }

    public ack(eventId: string): Promise<GatewayAckResult> {
        const existing = this.ackPromises.get(eventId);

        if (existing) {
            return existing;
        }

        if (!this.connection) {
            return Promise.reject(new GatewayNotConnectedError());
        }

        const promise = this.connection.ack(eventId);
        this.ackPromises.set(eventId, promise);
        void promise.catch(() => {
            this.ackPromises.delete(eventId);
        });

        return promise;
    }

    public on<K extends keyof BotClientEventMap>(
        event: K,
        listener: BotClientListener<K>,
    ): this {
        this.emitter.on(event, listener);
        return this;
    }

    public once<K extends keyof BotClientEventMap>(
        event: K,
        listener: BotClientListener<K>,
    ): this {
        this.emitter.once(event, listener);
        return this;
    }

    public off<K extends keyof BotClientEventMap>(
        event: K,
        listener: BotClientListener<K>,
    ): this {
        this.emitter.off(event, listener);
        return this;
    }

    public onAny(listener: GatewayAnyListener): this {
        this.anyListeners.add(listener);
        return this;
    }

    public offAny(listener: GatewayAnyListener): this {
        this.anyListeners.delete(listener);
        return this;
    }

    public removeAllListeners(event?: keyof BotClientEventMap): void {
        this.emitter.removeAllListeners(event);

        if (event === undefined) {
            this.anyListeners.clear();
        }
    }

    private async startConnection(attempt: number): Promise<void> {
        this.currentState = GatewayState.Connecting;

        try {
            const gatewayUrl = await this.resolveGatewayUrl();

            if (attempt !== this.connectionAttempt) {
                throw new GatewayConnectionError("Gateway connection was cancelled");
            }

            const connectionOptions: GatewayConnectionOptions = {
                token: this.options.token,
                intents: this.options.intents,
                shard: this.options.shard,
                gatewayUrl,
                connectTimeoutMs: this.options.connectTimeoutMs,
                ackTimeoutMs: this.options.ackTimeoutMs,
                reconnect: this.options.reconnect,
                socketFactory: this.options.socketFactory,
                debug: this.options.debug,
            };

            const connection = new GatewayConnection(connectionOptions);
            this.connection = connection;
            this.bindConnection(connection);
            await connection.connect();

            if (attempt !== this.connectionAttempt) {
                await connection.disconnect();
                throw new GatewayConnectionError("Gateway connection was cancelled");
            }
        } catch (error) {
            this.connection = undefined;
            this.currentState = GatewayState.Disconnected;
            throw error;
        }
    }

    private async resolveGatewayUrl(): Promise<string> {
        const { gatewayUrl, urlResolver, apiBaseUrl, token } = this.options;

        const resolved = gatewayUrl
            ?? (urlResolver
                ? await urlResolver()
                : await new GatewayREST({ baseUrl: apiBaseUrl, token }).getGatewayUrl());

        if (!isValidUrl(resolved)) {
            throw new GatewayConnectionError("Resolved gateway url is invalid");
        }

        return resolved;
    }

    private bindConnection(connection: GatewayConnection): void {
        connection.on("connected", () => {
            this.currentState = GatewayState.Connected;
            this.emitSafe("connected");
        });

        connection.on("reconnected", () => {
            this.currentState = GatewayState.Connected;
            this.emitSafe("reconnected");
        });

        connection.on("disconnected", (info) => {
            this.currentState = connection.state;
            this.emitSafe("disconnected", info);
        });

        connection.on("reconnecting", (attempt) => {
            this.currentState = GatewayState.Reconnecting;
            this.emitSafe("reconnecting", attempt);
        });

        connection.on("reconnectFailed", () => {
            this.currentState = GatewayState.Disconnected;
            this.emitSafe("reconnectFailed");
        });

        connection.on("replayGap", (gap) => {
            this.emitSafe("replayGap", gap);
        });

        connection.on("error", (error) => {
            this.emitSafe("error", error);
        });

        connection.on("debug", (message, ...args) => {
            this.emitSafe("debug", message, ...args);
        });

        connection.on("event", (name, payload) => {
            void this.dispatch(name, payload);
        });
    }

    private async dispatch(
        name: GatewayEventName,
        payload: RawGatewayEvent,
    ): Promise<void> {
        const eventId = typeof payload.gateway_event_id === "string"
            ? payload.gateway_event_id
            : undefined;

        const context = new GatewayEventContext(
            name,
            payload,
            eventId,
            payload.gateway_event_replayed === true,
            (id) => this.ack(id),
        );

        let failed = false;

        try {
            await this.emitter.emitAsync(name, payload, context);
        } catch (error) {
            failed = true;
            this.emitSafe("error", toGatewayError(error));
        }

        if (this.anyListeners.size > 0) {
            const results = await Promise.allSettled(
                [...this.anyListeners].map((listener) => listener(name, payload, context)),
            );
            const rejected = results.find((result) => result.status === "rejected");

            if (rejected?.status === "rejected") {
                failed = true;
                this.emitSafe("error", toGatewayError(rejected.reason));
            }
        }

        if (failed || !this.options.autoAck || eventId === undefined) {
            return;
        }

        try {
            const result = await context.ack();

            if (!result.success) {
                this.emitSafe("error", new GatewayError(
                    result.error ?? "Gateway acknowledgement failed",
                ));
            }
        } catch (error) {
            this.emitSafe("error", toGatewayError(error));
        }
    }

    private emitSafe<K extends keyof BotClientEventMap>(
        event: K,
        ...args: BotClientEventMap[K]
    ): void {
        void this.emitter.emitAsync(event, ...args).catch((error: unknown) => {
            if (event === "error") {
                console.error("Unhandled error in BotClient error listener", error);
                return;
            }

            this.emitSafe("error", toGatewayError(error));
        });
    }
}

function normalizeOptions(options: BotClientOptions): NormalizedBotClientOptions {
    if (!options || typeof options.token !== "string") {
        throw new TypeError("Bot token is required");
    }

    const token = options.token.trim();

    if (token.length === 0 || token === "Bot") {
        throw new TypeError("Bot token is required");
    }

    const intents = options.intents ?? 0;

    if (!Number.isInteger(intents) || intents < 0) {
        throw new TypeError("intents must be a non-negative integer bitmask");
    }

    validateShard(options.shard);

    if (options.gatewayUrl !== undefined && !isValidUrl(options.gatewayUrl)) {
        throw new TypeError("gatewayUrl must be a valid URL");
    }

    const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;

    if (!Number.isInteger(connectTimeoutMs) || connectTimeoutMs <= 0) {
        throw new RangeError("connectTimeoutMs must be a positive integer");
    }

    const ackTimeoutMs = options.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;

    if (!Number.isInteger(ackTimeoutMs) || ackTimeoutMs <= 0) {
        throw new RangeError("ackTimeoutMs must be a positive integer");
    }

    const reconnect = options.reconnect ?? {};

    if (reconnect !== false) {
        validateReconnectOptions(reconnect);
    }

    return {
        token,
        intents,
        shard: options.shard ?? [0, 1],
        gatewayUrl: options.gatewayUrl,
        apiBaseUrl: options.apiBaseUrl ?? DEFAULT_API_BASE_URL,
        urlResolver: options.urlResolver,
        autoAck: options.autoAck ?? true,
        connectTimeoutMs,
        ackTimeoutMs,
        reconnect,
        socketFactory: options.socketFactory,
        debug: options.debug ?? false,
    };
}

function validateShard(shard: Shard | undefined): void {
    if (shard === undefined) return;

    if (shard.length !== 2) {
        throw new TypeError("shard must be [shardId, shardCount]");
    }

    const [shardId, shardCount] = shard;

    if (!Number.isInteger(shardCount) || shardCount < 1 || shardCount > MAX_SHARD_COUNT) {
        throw new RangeError(`shardCount must be an integer between 1 and ${MAX_SHARD_COUNT}`);
    }

    if (!Number.isInteger(shardId) || shardId < 0 || shardId >= shardCount) {
        throw new RangeError("shardId must be an integer between 0 and shardCount - 1");
    }
}

function validateReconnectOptions(options: ReconnectOptions): void {
    if (options.attempts !== undefined
        && (!Number.isInteger(options.attempts) || options.attempts < 0)) {
        throw new RangeError("reconnect.attempts must be a non-negative integer");
    }

    if (options.delayMs !== undefined
        && (!Number.isInteger(options.delayMs) || options.delayMs < 0)) {
        throw new RangeError("reconnect.delayMs must be a non-negative integer");
    }

    if (options.maxDelayMs !== undefined
        && (!Number.isInteger(options.maxDelayMs) || options.maxDelayMs < 0)) {
        throw new RangeError("reconnect.maxDelayMs must be a non-negative integer");
    }
}

function toGatewayError(error: unknown): GatewayError {
    if (error instanceof GatewayError) {
        return error;
    }

    if (error instanceof Error) {
        return new GatewayError(error.message, { cause: error });
    }

    return new GatewayError(String(error));
}
