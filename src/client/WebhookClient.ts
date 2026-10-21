import { WebhookMessageBuilder } from "../builders/WebhookMessageBuilder";
import { WebhookREST } from "../rest/WebhookREST";
import { Message } from "../structures/Message";
import { isValidUrl } from "../util/isValidUrl";

export class WebhookClient {
    private readonly rest?: WebhookREST;

    public constructor(url?: string) {
        if (url === undefined) return;

        if (!isValidUrl(url)) {
            throw new Error("Invalid url");
        }

        const parsed = new URL(url);
        parsed.searchParams.set("wait", "true");
        parsed.searchParams.set("preview", "true");

        this.rest = new WebhookREST(parsed);
    }

    public async send(message: string | WebhookMessageBuilder): Promise<Message> {
        if (!this.rest) {
            throw new Error("Webhook url not set");
        }

        const payload = typeof message === "string"
            ? new WebhookMessageBuilder().setContent(message).toJSON()
            : message.toJSON();

        const data = await this.rest.execute(payload);
        return Message.from(data.message);
    }
}
