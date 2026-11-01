import { GatewayAPIError, GatewayConnectionError } from "../gateway/errors";
import { normalizeBotToken } from "../util/botToken";
import { isValidUrl } from "../util/isValidUrl";

export const DEFAULT_API_BASE_URL = "https://veiled.lol/api/v1";

export interface GatewayRESTOptions {
    baseUrl?: string;
    token: string;
}

export class GatewayREST {
    private readonly baseUrl: string;
    private readonly authorization: string;

    public constructor(options: GatewayRESTOptions) {
        this.baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
        this.authorization = normalizeBotToken(options.token);
    }

    public async getGatewayUrl(): Promise<string> {
        const response = await fetch(`${this.baseUrl}/bots/gateway`, {
            method: "GET",
            headers: {
                Authorization: this.authorization,
            },
        });

        if (!response.ok) {
            throw new GatewayAPIError(response.status, await response.text());
        }

        let body: unknown;

        try {
            body = await response.json();
        } catch (error) {
            throw new GatewayConnectionError("Gateway response was not valid JSON", { cause: error });
        }

        const url = extractGatewayUrl(body);

        if (url === undefined || !isValidUrl(url)) {
            throw new GatewayConnectionError("Gateway response did not include a valid url");
        }

        return url;
    }
}

function extractGatewayUrl(body: unknown): string | undefined {
    if (typeof body !== "object" || body === null) return undefined;

    const url = (body as { url?: unknown }).url;
    return typeof url === "string" ? url : undefined;
}
