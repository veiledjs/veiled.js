import type { RawActionRowPayload } from "./component";
import type { RawEmbedPayload } from "./embed";

export interface RawMessagePayload {
    content?: string | null;
    embeds?: RawEmbedPayload[];
    components?: RawActionRowPayload[];
}

export interface RawWebhookMessagePayload extends RawMessagePayload {
    username?: string;
    avatar_url?: string;
}
