export interface BotAPIErrorOptions {
    body?: unknown;
    details?: unknown;
    retryAfter?: number | null;
    cause?: unknown;
}

export class BotAPIError extends Error {
    public readonly status: number;
    public readonly body: unknown;
    public readonly details: unknown;
    public readonly retryAfter: number | null;

    public constructor(status: number, message: string, options: BotAPIErrorOptions = {}) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "BotAPIError";
        this.status = status;
        this.body = options.body;
        this.details = options.details;
        this.retryAfter = options.retryAfter ?? null;
    }
}
