import type { RawWebhookMessagePayload } from "../types/payload/message";
import { validateWebhookMessagePayload } from "../util/validate";
import { MessageBuilder } from "./MessageBuilder";

export class WebhookMessageBuilder extends MessageBuilder {
    private readonly webhookData: Pick<RawWebhookMessagePayload, "username" | "avatar_url"> = {};

    public setUsername(username: string): this {
        this.webhookData.username = username;
        return this;
    }

    public setAvatarUrl(url: string): this {
        this.webhookData.avatar_url = url;
        return this;
    }

    public override toJSON(): RawWebhookMessagePayload {
        const payload: RawWebhookMessagePayload = {
            ...super.toJSON(),
            ...structuredClone(this.webhookData),
        };

        validateWebhookMessagePayload(payload);
        return payload;
    }
}
