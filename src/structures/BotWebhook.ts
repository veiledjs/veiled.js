import type { RawBotWebhook } from "../types/response/bot";
import {
    asDate,
    asNullableString,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class BotWebhook extends Structure<RawBotWebhook> {
    public readonly id: string;
    public readonly laneId: string | null;
    public readonly name: string | null;
    public readonly avatarUrl: string | null;
    public readonly webhookUrl: string | null;
    public readonly token: string | null;
    public readonly createdAt: Date | null;
    public readonly updatedAt: Date | null;

    private constructor(raw: RawBotWebhook) {
        super(raw);
        this.id = asString(raw.id ?? raw.webhookId);
        this.laneId = asNullableString(raw.laneId);
        this.name = asNullableString(raw.name);
        this.avatarUrl = asNullableString(raw.avatarUrl);
        this.webhookUrl = asNullableString(raw.webhookUrl);
        this.token = asNullableString(raw.token);
        this.createdAt = asDate(raw.createdAt);
        this.updatedAt = asDate(raw.updatedAt);
    }

    public static from(value: unknown): BotWebhook {
        return new BotWebhook(unwrapRecord(value, ["webhook", "Webhook"]) as RawBotWebhook);
    }
}
