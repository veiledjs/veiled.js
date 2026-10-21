export class WebhookAPIError extends Error {
    public readonly status: number;
    public readonly body: string;

    public constructor(status: number, body: string) {
        super(`Webhook request failed with status ${status}`);
        this.name = "WebhookAPIError";
        this.status = status;
        this.body = body;
    }
}
