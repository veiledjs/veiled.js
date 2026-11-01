import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
    BotClient,
    DEFAULT_API_BASE_URL,
    DEFAULT_GATEWAY_INTENTS,
    GatewayAPIError,
    GatewayAckTimeoutError,
    GatewayConnectionError,
    GatewayEvents,
    GatewayIntents,
    GatewayNotConnectedError,
    GatewayREST,
    GatewayState,
    hasIntent,
    isGatewayEventName,
} from "../src";
import type {
    GatewayCloseInfo,
    GatewayEventContext,
    ManagerLike,
    RawGatewayEvent,
    RawGatewayReplayGap,
    SocketFactory,
    SocketLike,
} from "../src";

class FakeManager implements ManagerLike {
    private readonly handlers = new Map<string, Set<(...args: unknown[]) => void>>();

    public on(event: string, listener: (...args: unknown[]) => void): this {
        let listeners = this.handlers.get(event);

        if (!listeners) {
            listeners = new Set();
            this.handlers.set(event, listeners);
        }

        listeners.add(listener);
        return this;
    }

    public off(event: string, listener?: (...args: unknown[]) => void): this {
        if (!listener) {
            this.handlers.delete(event);
            return this;
        }

        this.handlers.get(event)?.delete(listener);
        return this;
    }

    public trigger(event: string, ...args: unknown[]): void {
        for (const listener of [...(this.handlers.get(event) ?? [])]) {
            listener(...args);
        }
    }
}

class FakeSocket implements SocketLike {
    public connected = false;
    public autoConnect = true;
    public readonly id = "socket-id";
    public readonly io = new FakeManager();
    public readonly emitted: Array<{ event: string; args: unknown[] }> = [];
    public ackHandler:
        | ((eventId: string, callback: (result: unknown) => void) => void)
        | undefined;

    private readonly handlers = new Map<string, Set<(...args: unknown[]) => void>>();
    private readonly anyHandlers = new Set<(event: string, ...args: unknown[]) => void>();

    public on(event: string, listener: (...args: unknown[]) => void): this {
        let listeners = this.handlers.get(event);

        if (!listeners) {
            listeners = new Set();
            this.handlers.set(event, listeners);
        }

        listeners.add(listener);
        return this;
    }

    public onAny(listener: (event: string, ...args: unknown[]) => void): this {
        this.anyHandlers.add(listener);
        return this;
    }

    public off(event: string, listener?: (...args: unknown[]) => void): this {
        if (!listener) {
            this.handlers.delete(event);
            return this;
        }

        this.handlers.get(event)?.delete(listener);
        return this;
    }

    public offAny(listener?: (event: string, ...args: unknown[]) => void): this {
        if (!listener) {
            this.anyHandlers.clear();
            return this;
        }

        this.anyHandlers.delete(listener);
        return this;
    }

    public emit(event: string, ...args: unknown[]): this {
        this.emitted.push({ event, args });

        if (event === "gateway:ack") {
            const eventId = (args[0] as { eventId: string }).eventId;
            const callback = args[1] as (result: unknown) => void;

            if (this.ackHandler) {
                this.ackHandler(eventId, callback);
            } else {
                callback({ success: true });
            }
        }

        return this;
    }

    public connect(): this {
        this.connected = true;

        if (this.autoConnect) {
            this.trigger("connect");
        }

        return this;
    }

    public disconnect(): this {
        this.connected = false;
        this.trigger("disconnect", "io client disconnect");
        return this;
    }

    public close(): this {
        this.connected = false;
        return this;
    }

    public trigger(event: string, ...args: unknown[]): void {
        for (const listener of [...(this.handlers.get(event) ?? [])]) {
            listener(...args);
        }
    }

    public receive(event: string, ...args: unknown[]): void {
        for (const listener of [...this.anyHandlers]) {
            listener(event, ...args);
        }
    }
}

interface FakeFactory {
    factory: SocketFactory;
    socket: FakeSocket;
    urls: string[];
    options: Record<string, unknown>[];
}

function createFactory(): FakeFactory {
    const socket = new FakeSocket();
    const urls: string[] = [];
    const options: Record<string, unknown>[] = [];

    return {
        socket,
        urls,
        options,
        factory: (url, socketOptions) => {
            urls.push(url);
            options.push(socketOptions);
            return socket;
        },
    };
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
    const started = Date.now();

    while (!predicate()) {
        if (Date.now() - started > timeoutMs) {
            throw new Error("Timed out waiting for condition");
        }

        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

afterEach(() => {
    mock.restore();
});

describe("GatewayEvents", () => {
    test("uses string event names", () => {
        expect(String(GatewayEvents.MESSAGE_CREATE)).toBe("MESSAGE_CREATE");
        expect(String(GatewayEvents.INTERACTION_CREATE)).toBe("INTERACTION_CREATE");
        expect(isGatewayEventName("MESSAGE_CREATE")).toBe(true);
        expect(isGatewayEventName("UNKNOWN_EVENT")).toBe(false);
    });
});

describe("GatewayIntents", () => {
    test("matches the documented bit values", () => {
        expect(GatewayIntents.ROOMS).toBe(1);
        expect(GatewayIntents.MEMBERS).toBe(2);
        expect(GatewayIntents.MESSAGES).toBe(4);
        expect(GatewayIntents.MESSAGE_CONTENT).toBe(8);
        expect(GatewayIntents.REACTIONS).toBe(16);
        expect(GatewayIntents.PRESENCE).toBe(32);
        expect(GatewayIntents.THREADS).toBe(64);
        expect(GatewayIntents.INVITES).toBe(128);
        expect(GatewayIntents.WEBHOOKS).toBe(256);
        expect(GatewayIntents.POLLS).toBe(512);
        expect(GatewayIntents.MODERATION).toBe(1024);
        expect(GatewayIntents.VOICE_STATES).toBe(2048);
        expect(GatewayIntents.SCHEDULED_EVENTS).toBe(4096);
        expect(GatewayIntents.INTERACTIONS).toBe(8192);
        expect(GatewayIntents.ROLES).toBe(16384);
        expect(GatewayIntents.DM_REACTIONS).toBe(32768);
        expect(GatewayIntents.DM_MESSAGES).toBe(65536);
    });

    test("exposes the raw gateway default set", () => {
        expect(DEFAULT_GATEWAY_INTENTS).toBe(32725);
    });

    test("checks intent masks", () => {
        const mask = GatewayIntents.MESSAGES | GatewayIntents.MESSAGE_CONTENT;

        expect(hasIntent(mask, GatewayIntents.MESSAGES)).toBe(true);
        expect(hasIntent(mask, GatewayIntents.MESSAGE_CONTENT)).toBe(true);
        expect(hasIntent(mask, GatewayIntents.REACTIONS)).toBe(false);
    });
});

describe("BotClient options", () => {
    test("rejects invalid tokens", () => {
        expect(() => new BotClient({ token: "" })).toThrow(TypeError);
        expect(() => new BotClient({ token: "Bot" })).toThrow(TypeError);
    });

    test("rejects invalid intents", () => {
        expect(() => new BotClient({ token: "token", intents: -1 })).toThrow(TypeError);
        expect(() => new BotClient({ token: "token", intents: 1.5 })).toThrow(TypeError);
    });

    test("rejects invalid shards", () => {
        expect(() => new BotClient({ token: "token", shard: [0, 0] })).toThrow(RangeError);
        expect(() => new BotClient({ token: "token", shard: [1, 1] })).toThrow(RangeError);
        expect(() => new BotClient({ token: "token", shard: [0, 1025] })).toThrow(RangeError);
    });

    test("rejects invalid timeouts and urls", () => {
        expect(() => new BotClient({ token: "token", connectTimeoutMs: 0 })).toThrow(RangeError);
        expect(() => new BotClient({ token: "token", ackTimeoutMs: -1 })).toThrow(RangeError);
        expect(() => new BotClient({ token: "token", gatewayUrl: "not a url" })).toThrow(TypeError);
    });
});

describe("GatewayREST", () => {
    test("fetches the gateway url with bot authorization", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ url: "https://gateway.example.com" }), { status: 200 }),
        );

        const rest = new GatewayREST({ token: "secret" });
        const url = await rest.getGatewayUrl();

        expect(url).toBe("https://gateway.example.com");
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        expect(String(call[0])).toBe(`${DEFAULT_API_BASE_URL}/bots/gateway`);
        expect(new Headers(call[1]?.headers).get("authorization")).toBe("Bot secret");
    });

    test("accepts an explicit api base url", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ url: "https://gateway.example.com" }), { status: 200 }),
        );

        await new GatewayREST({
            baseUrl: "https://api.example.com/api/v1/",
            token: "Bot already-prefixed",
        }).getGatewayUrl();

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        expect(String(call[0])).toBe("https://api.example.com/api/v1/bots/gateway");
        expect(new Headers(call[1]?.headers).get("authorization")).toBe("Bot already-prefixed");
    });

    test("throws GatewayAPIError for failed requests", async () => {
        spyOn(globalThis, "fetch").mockResolvedValue(
            new Response("forbidden", { status: 403 }),
        );

        try {
            await new GatewayREST({ token: "secret" }).getGatewayUrl();
            throw new Error("Expected request to fail");
        } catch (error) {
            expect(error).toBeInstanceOf(GatewayAPIError);
            expect((error as GatewayAPIError).status).toBe(403);
            expect((error as GatewayAPIError).body).toBe("forbidden");
        }
    });

    test("rejects malformed gateway responses", async () => {
        spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ url: 12 }), { status: 200 }),
        );

        await expect(new GatewayREST({ token: "secret" }).getGatewayUrl())
            .rejects.toBeInstanceOf(GatewayConnectionError);
    });
});

describe("BotClient connection", () => {
    test("connects with normalized auth and shard data", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            intents: GatewayIntents.MESSAGES,
            shard: [0, 2],
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });

        await client.connect();

        expect(client.state).toBe(GatewayState.Connected);
        expect(client.connected).toBe(true);
        expect(fake.urls).toEqual(["https://gateway.example.com"]);
        expect(fake.options[0]?.auth).toEqual({
            token: "Bot secret",
            intents: GatewayIntents.MESSAGES,
            shard: [0, 2],
        });
        expect(fake.options[0]?.transports).toEqual(["websocket"]);
        expect(fake.options[0]?.autoConnect).toBe(false);
    });

    test("defaults to single-shard auth with no intents", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });

        await client.connect();

        expect(fake.options[0]?.auth).toEqual({
            token: "Bot secret",
            intents: 0,
            shard: [0, 1],
        });
    });

    test("fetches the gateway url when none is provided", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ url: "https://gateway.example.com" }), { status: 200 }),
        );
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            socketFactory: fake.factory,
        });

        await client.connect();

        expect(fake.urls).toEqual(["https://gateway.example.com"]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        expect(String(call[0])).toBe(`${DEFAULT_API_BASE_URL}/bots/gateway`);
    });

    test("uses a custom fetch implementation for gateway discovery", async () => {
        const fake = createFactory();
        const urls: string[] = [];
        const client = new BotClient({
            token: "secret",
            socketFactory: fake.factory,
            fetchImpl: async (input) => {
                urls.push(String(input));
                return new Response(JSON.stringify({ url: "https://gateway.example.com" }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            },
        });

        await client.connect();

        expect(urls).toEqual([`${DEFAULT_API_BASE_URL}/bots/gateway`]);
        expect(fake.urls).toEqual(["https://gateway.example.com"]);
    });

    test("resolves the gateway url through a custom resolver", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            urlResolver: () => "https://gateway.example.com",
            socketFactory: fake.factory,
        });

        await client.connect();

        expect(fake.urls).toEqual(["https://gateway.example.com"]);
    });

    test("rejects a pending connection when disconnected", async () => {
        const fake = createFactory();
        fake.socket.autoConnect = false;

        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const errors: Error[] = [];

        client.on("error", (error) => {
            errors.push(error);
        });

        const connecting = client.connect();
        await waitFor(() => fake.urls.length === 1);
        await client.disconnect();

        await expect(connecting).rejects.toBeInstanceOf(GatewayConnectionError);
        expect(client.state).toBe(GatewayState.Disconnected);
        expect(errors).toHaveLength(0);
    });

    test("rejects the initial connection without emitting a duplicate error", async () => {
        const fake = createFactory();
        fake.socket.autoConnect = false;

        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const errors: Error[] = [];

        client.on("error", (error) => {
            errors.push(error);
        });

        const connecting = client.connect();
        await waitFor(() => fake.urls.length === 1);
        fake.socket.trigger("connect_error", new Error("privileged intent not approved"));

        await expect(connecting).rejects.toBeInstanceOf(GatewayConnectionError);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(errors).toHaveLength(0);
        expect(client.state).toBe(GatewayState.Disconnected);
    });

    test("emits connection errors that happen after the initial connection", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const errors: Error[] = [];

        client.on("error", (error) => {
            errors.push(error);
        });

        await client.connect();
        fake.socket.trigger("connect_error", new Error("reconnect denied"));

        await waitFor(() => errors.length === 1);

        expect(errors[0]?.message).toBe("reconnect denied");
    });

    test("disconnects and clears state", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const disconnected: GatewayCloseInfo[] = [];

        client.on("disconnected", (info) => {
            disconnected.push(info);
        });

        await client.connect();
        await client.disconnect();

        expect(client.state).toBe(GatewayState.Disconnected);
        expect(client.connected).toBe(false);
        expect(disconnected).toEqual([{ reason: "client disconnect" }]);
    });
});

describe("BotClient events", () => {
    test("dispatches events with a context and auto-acks", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const contexts: GatewayEventContext[] = [];
        const payloads: RawGatewayEvent[] = [];

        client.on("MESSAGE_CREATE", (payload, context) => {
            payloads.push(payload);
            contexts.push(context);
        });

        await client.connect();
        fake.socket.receive("MESSAGE_CREATE", {
            gateway_event_id: "event-1",
            gateway_event_replayed: true,
            content: "hello",
        });

        await waitFor(() => fake.socket.emitted.some((entry) => entry.event === "gateway:ack"));

        expect(payloads).toHaveLength(1);
        expect(payloads[0]?.content).toBe("hello");
        expect(contexts[0]?.eventId).toBe("event-1");
        expect(contexts[0]?.replayed).toBe(true);
        expect(contexts[0]?.canAck).toBe(false);

        const ack = fake.socket.emitted.find((entry) => entry.event === "gateway:ack");
        expect(ack?.args[0]).toEqual({ eventId: "event-1" });
    });

    test("supports onAny listeners", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const names: string[] = [];

        client.onAny((name) => {
            names.push(name);
        });

        await client.connect();
        fake.socket.receive("MESSAGE_CREATE", { gateway_event_id: "event-1" });
        fake.socket.receive("TYPING_START", {});

        await waitFor(() => names.length === 2);

        expect(names).toEqual(["MESSAGE_CREATE", "TYPING_START"]);
        expect(fake.socket.emitted.filter((entry) => entry.event === "gateway:ack")).toHaveLength(1);
    });

    test("tracks reconnects and reconnect failures", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        let reconnected = 0;
        let reconnectFailed = 0;

        client.on("reconnected", () => {
            reconnected += 1;
        });
        client.on("reconnectFailed", () => {
            reconnectFailed += 1;
        });

        await client.connect();

        fake.socket.connected = false;
        fake.socket.trigger("disconnect", "transport close");
        expect(client.state).toBe(GatewayState.Reconnecting);

        fake.socket.io.trigger("reconnect_attempt", 1);
        expect(client.state).toBe(GatewayState.Reconnecting);

        fake.socket.connected = true;
        fake.socket.trigger("connect");

        await waitFor(() => reconnected === 1);
        expect(client.state).toBe(GatewayState.Connected);

        fake.socket.io.trigger("reconnect_failed");

        await waitFor(() => reconnectFailed === 1);
        expect(client.state).toBe(GatewayState.Disconnected);
    });

    test("does not auto-ack when disabled", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
            autoAck: false,
        });
        let context: GatewayEventContext | undefined;

        client.on("MESSAGE_CREATE", (_payload, eventContext) => {
            context = eventContext;
        });

        await client.connect();
        fake.socket.receive("MESSAGE_CREATE", { gateway_event_id: "event-1" });
        await waitFor(() => context !== undefined);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(fake.socket.emitted.some((entry) => entry.event === "gateway:ack")).toBe(false);

        await context?.ack();
        expect(fake.socket.emitted.some((entry) => entry.event === "gateway:ack")).toBe(true);
    });

    test("does not ack when a listener throws", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const errors: Error[] = [];

        client.on("MESSAGE_CREATE", () => {
            throw new Error("handler failed");
        });
        client.on("error", (error) => {
            errors.push(error);
        });

        await client.connect();
        fake.socket.receive("MESSAGE_CREATE", { gateway_event_id: "event-1" });

        await waitFor(() => errors.length > 0);

        expect(errors[0]?.message).toBe("handler failed");
        expect(fake.socket.emitted.some((entry) => entry.event === "gateway:ack")).toBe(false);
    });

    test("emits replay gaps without dispatching them as events", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });
        const gaps: RawGatewayReplayGap[] = [];
        const events: string[] = [];

        client.on("replayGap", (gap) => {
            gaps.push(gap);
        });
        client.onAny((name) => {
            events.push(name);
        });

        await client.connect();
        fake.socket.receive("BOT_GATEWAY_REPLAY_GAP", {
            reason: "cursor too old",
            availableSince: "2026-01-01T00:00:00.000Z",
        });

        await waitFor(() => gaps.length === 1);

        expect(gaps[0]?.reason).toBe("cursor too old");
        expect(events).toEqual([]);
        expect(fake.socket.emitted.some((entry) => entry.event === "gateway:ack")).toBe(false);
    });

    test("acknowledges through the client and times out", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
            ackTimeoutMs: 10,
        });

        await client.connect();

        fake.socket.ackHandler = () => {
            // Deliberately never call the callback.
        };

        await expect(client.ack("event-1")).rejects.toBeInstanceOf(GatewayAckTimeoutError);
    });

    test("rejects acknowledgements while disconnected", async () => {
        const fake = createFactory();
        const client = new BotClient({
            token: "secret",
            gatewayUrl: "https://gateway.example.com",
            socketFactory: fake.factory,
        });

        await expect(client.ack("event-1")).rejects.toBeInstanceOf(GatewayNotConnectedError);
    });
});
