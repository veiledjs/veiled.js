import type { RawBaseMessage } from "../interface/rawBaseMessage";

export class WebhookMessage implements RawBaseMessage {
    public content?: string;

    public setContent(content: string){
        this.content = content;
        return this;
    }

    public toJson(): RawBaseMessage {
        return {
            content: this.content ? this.content : null
        }
    }
}