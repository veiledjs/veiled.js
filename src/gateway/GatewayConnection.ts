import { io } from "socket.io-client";
import type { GatewayAckResult } from "../types/gateway/ack";
import type {
    GatewayCloseInfo,
    RawGatewayEvent,
    RawGatewayReplayGap,
} from "../types/gateway/event";
import type { GatewayConnectionOptions } from "../types/gateway/options";
import type { SocketFactory, SocketLike } from "../types/gateway/socket";
import { normalizeBotToken } from "../util/botToken";
import { TypedEventEmitter } from "../util/TypedEventEmitter";
import {
    GatewayAckTimeoutError,
    GatewayConnectionError,
    GatewayError,
    GatewayNotConnectedError,
} from "./errors";
import {
    GatewaySystemEvents,
    isGatewayEventName,
} from "./GatewayEvents";
import type { GatewayEventName } from "./GatewayEvents";
import { GatewayState } from "./GatewayState";

export type GatewayConnectionEventMap = {
    connected: [];
    reconnected: [];
    disconnected: [info: GatewayCloseInfo];
    reconnecting: [attempt: number];
    reconnectFailed: [];
    replayGap: [gap: RawGatewayReplayGap];
    error: [error: GatewayError];
    debug: [message: string, ...args: unknown[]];
    event: [name: GatewayEventName, payload: RawGatewayEvent];
};

type SocketHandler = (...args: unknown[]) => void;
type AnyHandler = (event: string, ...args: unknown[]) => void;

interface SocketBinding {
    socket: SocketLike;
    handlers: Array<[string, SocketHandler]>;
    anyHandler: AnyHandler;
    managerHandlers: Array<[string, SocketHandler]>;
}

const RESERVED_EVENTS = new Set([
    "connect",
    "connect_error",
    "disconnect",
    "disconnect_reason",
    "newListener",
    "removeListener",
]);

const defaultSocketFactory: SocketFactory = (url, options) =>
    io(url, options) as unknown as SocketLike;

export class GatewayConnection extends TypedEventEmitter<GatewayConnectionEventMap> {
    private socket: SocketLike | undefined;
    private binding: SocketBinding | undefined;
    private connectPromise: Promise<void> | undefined;
    private connectReject: ((error: GatewayError) => void) | undefined;
    private currentState = GatewayState.Idle;
    private hasConnected = false;
    private intentionalDisconnect = false;

    public constructor(private readonly options: GatewayConnectionOptions) {
        super();
    }

    public get state(): GatewayState {
        return this.currentState;
    }

    public get connected(): boolean {
        return this.currentState === GatewayState.Connected && this.socket?.connected === true;
    }

    public async connect(): Promise<void> {
        if (this.currentState === GatewayState.Connected) return;

        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.intentionalDisconnect = false;
        this.cleanupSocket();
        this.currentState = GatewayState.Connecting;
        this.debug("Connecting to gateway", this.options.gatewayUrl);

        const socket = (this.options.socketFactory ?? defaultSocketFactory)(
            this.options.gatewayUrl,
            this.buildSocketOptions(),
        );

        this.bindSocket(socket);

        this.connectPromise = new Promise<void>((resolve, reject) => {
            let settled = false;
            let timer: ReturnType<typeof setTimeout>;

            const cleanup = (): void => {
                clearTimeout(timer);
                this.off("connected", onConnected);

                if (this.connectReject === onError) {
                    this.connectReject = undefined;
                }
            };

            const onConnected = (): void => {
                if (settled) return;

                settled = true;
                cleanup();
                resolve();
            };

            const onError = (error: GatewayError): void => {
                if (settled) return;

                settled = true;
                cleanup();
                reject(error);
            };

            timer = setTimeout(() => {
                this.currentState = GatewayState.Disconnected;
                onError(new GatewayConnectionError(
                    `Gateway connection timed out after ${this.options.connectTimeoutMs}ms`,
                ));
            }, this.options.connectTimeoutMs);

            this.connectReject = onError;
            this.on("connected", onConnected);
        });

        try {
            socket.connect();
            await this.connectPromise;
        } catch (error) {
            this.cleanupSocket();
            this.currentState = GatewayState.Disconnected;
            throw error;
        } finally {
            this.connectPromise = undefined;
        }
    }

    public async disconnect(): Promise<void> {
        const socket = this.socket;

        if (!socket) {
            this.currentState = GatewayState.Disconnected;
            return;
        }

        if (this.currentState === GatewayState.Connecting) {
            this.handleConnectionError(new GatewayConnectionError(
                "Gateway connection was closed before it was established",
            ));
        }

        this.intentionalDisconnect = true;
        this.currentState = GatewayState.Disconnecting;
        this.cleanupSocket();

        socket.disconnect();
        socket.close();

        this.hasConnected = false;
        this.currentState = GatewayState.Disconnected;
        this.emit("disconnected", { reason: "client disconnect" });
    }

    public ack(eventId: string): Promise<GatewayAckResult> {
        const socket = this.socket;

        if (!socket || !socket.connected || this.currentState !== GatewayState.Connected) {
            return Promise.reject(new GatewayNotConnectedError());
        }

        return new Promise<GatewayAckResult>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new GatewayAckTimeoutError());
            }, this.options.ackTimeoutMs);

            try {
                socket.emit("gateway:ack", { eventId }, (result: unknown) => {
                    clearTimeout(timer);

                    if (isAckResult(result)) {
                        resolve(result);
                        return;
                    }

                    resolve({
                        success: false,
                        error: "Gateway returned an invalid acknowledgement response",
                    });
                });
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    public send(event: string, ...args: unknown[]): void {
        if (!this.socket) {
            throw new GatewayNotConnectedError();
        }

        this.socket.emit(event, ...args);
    }

    private buildSocketOptions(): Record<string, unknown> {
        const auth: Record<string, unknown> = {
            token: normalizeBotToken(this.options.token),
            intents: this.options.intents,
        };

        if (this.options.shard) {
            auth.shard = [...this.options.shard];
        }

        const options: Record<string, unknown> = {
            auth,
            transports: ["websocket"],
            autoConnect: false,
            reconnection: this.options.reconnect !== false,
        };

        if (this.options.reconnect) {
            if (this.options.reconnect.attempts !== undefined) {
                options.reconnectionAttempts = this.options.reconnect.attempts;
            }

            if (this.options.reconnect.delayMs !== undefined) {
                options.reconnectionDelay = this.options.reconnect.delayMs;
            }

            if (this.options.reconnect.maxDelayMs !== undefined) {
                options.reconnectionDelayMax = this.options.reconnect.maxDelayMs;
            }
        }

        return options;
    }

    private bindSocket(socket: SocketLike): void {
        const handlers: Array<[string, SocketHandler]> = [];
        const managerHandlers: Array<[string, SocketHandler]> = [];

        const add = (event: string, handler: SocketHandler): void => {
            socket.on(event, handler);
            handlers.push([event, handler]);
        };

        add("connect", () => {
            const reconnected = this.hasConnected;
            this.hasConnected = true;
            this.currentState = GatewayState.Connected;
            this.debug(reconnected ? "Gateway reconnected" : "Gateway connected");
            this.emit(reconnected ? "reconnected" : "connected");
        });

        add("disconnect", (reason, description) => {
            const info: GatewayCloseInfo = {
                reason: typeof reason === "string" ? reason : String(reason),
                description,
            };

            const willReconnect = !this.intentionalDisconnect
                && this.options.reconnect !== false
                && info.reason !== "io server disconnect";

            this.currentState = willReconnect
                ? GatewayState.Reconnecting
                : GatewayState.Disconnected;

            this.debug("Gateway disconnected", info.reason);

            if (!this.intentionalDisconnect) {
                this.emit("disconnected", info);
            }
        });

        add("connect_error", (error) => {
            const gatewayError = new GatewayConnectionError(
                error instanceof Error ? error.message : String(error),
                { cause: error },
            );

            this.handleConnectionError(gatewayError);
        });

        const anyHandler: AnyHandler = (event, ...args) => {
            if (RESERVED_EVENTS.has(event)) return;

            const payload = args[0];

            if (event === GatewaySystemEvents.REPLAY_GAP) {
                this.emit("replayGap", asRecord(payload) as RawGatewayReplayGap);
                return;
            }

            if (!isGatewayEventName(event)) {
                this.debug(`Ignoring unknown gateway event ${event}`);
                return;
            }

            this.emit("event", event, asRecord(payload) as RawGatewayEvent);
        };

        socket.onAny(anyHandler);

        const manager = socket.io;

        if (manager) {
            const addManager = (event: string, handler: SocketHandler): void => {
                manager.on(event, handler);
                managerHandlers.push([event, handler]);
            };

            addManager("reconnect_attempt", (attempt) => {
                const value = typeof attempt === "number" ? attempt : Number(attempt);
                this.currentState = GatewayState.Reconnecting;
                this.debug("Gateway reconnect attempt", value);
                this.emit("reconnecting", value);
            });

            addManager("reconnect_failed", () => {
                this.currentState = GatewayState.Disconnected;
                this.debug("Gateway reconnect failed");
                this.emit("reconnectFailed");
            });

            addManager("error", (error) => {
                this.handleConnectionError(new GatewayConnectionError(
                    error instanceof Error ? error.message : String(error),
                    { cause: error },
                ));
            });
        }

        this.socket = socket;
        this.binding = { socket, handlers, anyHandler, managerHandlers };
    }

    private cleanupSocket(): void {
        const binding = this.binding;

        if (!binding) {
            this.socket = undefined;
            return;
        }

        for (const [event, handler] of binding.handlers) {
            binding.socket.off(event, handler);
        }

        binding.socket.offAny(binding.anyHandler);

        if (binding.socket.io) {
            for (const [event, handler] of binding.managerHandlers) {
                binding.socket.io.off(event, handler);
            }
        }

        this.binding = undefined;
        this.socket = undefined;
    }

    private handleConnectionError(error: GatewayError): void {
        const reject = this.connectReject;

        if (reject) {
            reject(error);
            return;
        }

        this.emit("error", error);
    }

    private debug(message: string, ...args: unknown[]): void {
        if (!this.options.debug) return;

        this.emit("debug", message, ...args);
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
    }

    return {};
}

function isAckResult(value: unknown): value is GatewayAckResult {
    return typeof value === "object"
        && value !== null
        && typeof (value as { success?: unknown }).success === "boolean";
}
