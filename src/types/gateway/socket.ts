export interface ManagerLike {
    on(event: string, listener: (...args: unknown[]) => void): this;
    off(event: string, listener?: (...args: unknown[]) => void): this;
}

export interface SocketLike {
    readonly connected: boolean;
    readonly id: string | undefined;
    readonly io?: ManagerLike;

    on(event: string, listener: (...args: unknown[]) => void): this;
    onAny(listener: (event: string, ...args: unknown[]) => void): this;
    off(event: string, listener?: (...args: unknown[]) => void): this;
    offAny(listener?: (event: string, ...args: unknown[]) => void): this;
    emit(event: string, ...args: unknown[]): this;

    connect(): this;
    disconnect(): this;
    close(): this;
}

export type SocketFactory = (
    url: string,
    options: Record<string, unknown>,
) => SocketLike;
