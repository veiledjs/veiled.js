import { WebhookMessage } from "../component/webhookMessage";
import type { RawBaseMessage } from "../interface/rawBaseMessage";
import { isValidUrl } from "../util/isValidUrl";

export class Webhook {
    private url?: URL;

    constructor(url?: string){
        if(url){
            if(!isValidUrl(url)){
                throw new Error("Invalid url");
            }

            this.url = new URL(url);

            this.url.searchParams.set("wait", "true");
            this.url.searchParams.set("preview", "true");
        }
        
    }

    public async send(message: string | WebhookMessage): Promise<Response> {
        let rawMessage: RawBaseMessage = {};

        if(!this.url){
            throw new Error("Webhook url not set");
        }

        if(typeof message === "string"){
            rawMessage = new WebhookMessage().setContent(message).toJson();
        }else if(message instanceof WebhookMessage){
            rawMessage = message.toJson();
        }else {
            throw new Error("Invalid webhook message content");
        }

        return await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(rawMessage)
        });
    }
}