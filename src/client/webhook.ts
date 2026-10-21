import { isValidUrl } from "../util/isValidUrl";

export class Webhook {
    private url: string;

    constructor(url: string){
        this.url = url;

        if(!isValidUrl(url)){
            throw new Error("Invalid url");
        }
    }

    public async send(content: string): Promise<Response> {
        return await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
        });
    }
}