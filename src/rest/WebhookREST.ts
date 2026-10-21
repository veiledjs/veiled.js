import type { RawWebhookMessagePayload } from "../types/payload/message";
import type { RawWebhookExecuteResponse } from "../types/response/message";
import { WebhookAPIError } from "./WebhookAPIError";

export class WebhookREST {
    public constructor(private readonly url: URL) {}

    public async execute(payload: RawWebhookMessagePayload): Promise<RawWebhookExecuteResponse> {
        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new WebhookAPIError(response.status, await response.text());
        }

        return await response.json() as RawWebhookExecuteResponse;
    }
}
