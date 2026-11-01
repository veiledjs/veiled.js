type AnyListener = (...args: any[]) => void | Promise<void>;

export class TypedEventEmitter<EventMap extends Record<string, unknown[]>> {
    private readonly listeners = new Map<keyof EventMap, Set<AnyListener>>();

    public on<K extends keyof EventMap>(
        event: K,
        listener: (...args: EventMap[K]) => void | Promise<void>,
    ): this {
        let listeners = this.listeners.get(event);

        if (!listeners) {
            listeners = new Set();
            this.listeners.set(event, listeners);
        }

        listeners.add(listener as AnyListener);
        return this;
    }

    public once<K extends keyof EventMap>(
        event: K,
        listener: (...args: EventMap[K]) => void | Promise<void>,
    ): this {
        const wrapped = (...args: EventMap[K]): void | Promise<void> => {
            this.off(event, wrapped);
            return listener(...args);
        };

        return this.on(event, wrapped);
    }

    public off<K extends keyof EventMap>(
        event: K,
        listener: (...args: EventMap[K]) => void | Promise<void>,
    ): this {
        const listeners = this.listeners.get(event);

        if (!listeners) return this;

        listeners.delete(listener as AnyListener);

        if (listeners.size === 0) {
            this.listeners.delete(event);
        }

        return this;
    }

    public emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
        const listeners = this.listeners.get(event);

        if (!listeners) return;

        for (const listener of [...listeners]) {
            listener(...args);
        }
    }

    public async emitAsync<K extends keyof EventMap>(
        event: K,
        ...args: EventMap[K]
    ): Promise<void> {
        const listeners = this.listeners.get(event);

        if (!listeners) return;

        const errors: unknown[] = [];
        const pending: Promise<void>[] = [];

        for (const listener of [...listeners]) {
            try {
                const result = listener(...args);

                if (isPromiseLike(result)) {
                    pending.push(Promise.resolve(result).catch((error: unknown) => {
                        errors.push(error);
                    }));
                }
            } catch (error) {
                errors.push(error);
            }
        }

        await Promise.all(pending);

        if (errors.length > 0) {
            throw errors[0];
        }
    }

    public removeAllListeners(event?: keyof EventMap): void {
        if (event === undefined) {
            this.listeners.clear();
            return;
        }

        this.listeners.delete(event);
    }

    public listenerCount(event: keyof EventMap): number {
        return this.listeners.get(event)?.size ?? 0;
    }
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
    return typeof value === "object"
        && value !== null
        && typeof (value as { then?: unknown }).then === "function";
}
