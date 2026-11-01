import type { FetchLike } from "../rest";
import type { SocketFactory } from "./socket";

export type Shard = readonly [shardId: number, shardCount: number];

export interface ReconnectOptions {
    attempts?: number;
    delayMs?: number;
    maxDelayMs?: number;
}

export interface BotClientOptions {
    token: string;
    intents?: number;
    shard?: Shard;

    gatewayUrl?: string;
    apiBaseUrl?: string;
    urlResolver?: () => string | Promise<string>;

    fetchImpl?: FetchLike;
    requestTimeoutMs?: number;

    autoAck?: boolean;
    connectTimeoutMs?: number;
    ackTimeoutMs?: number;
    reconnect?: false | ReconnectOptions;

    socketFactory?: SocketFactory;
    debug?: boolean;
}

export interface GatewayConnectionOptions {
    token: string;
    intents: number;
    shard?: Shard;
    gatewayUrl: string;

    connectTimeoutMs: number;
    ackTimeoutMs: number;
    reconnect: false | ReconnectOptions;
    socketFactory?: SocketFactory;
    debug: boolean;
}
