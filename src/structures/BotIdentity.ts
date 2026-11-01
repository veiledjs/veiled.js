import type { RawApplication, RawBotGateway, RawBotIdentity } from "../types/response/bot";
import type { RawUser } from "../types/response/user";
import {
    asNullableString,
    asRecord,
    asString,
    hasRecord,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";
import { User } from "./User";

export class Application extends Structure<RawApplication> {
    public readonly id: string;
    public readonly name: string | null;
    public readonly description: string | null;
    public readonly icon: string | null;

    private constructor(raw: RawApplication) {
        super(raw);
        this.id = asString(raw.id);
        this.name = asNullableString(raw.name);
        this.description = asNullableString(raw.description);
        this.icon = asNullableString(raw.icon);
    }

    public static from(value: unknown): Application {
        return new Application(unwrapRecord(value, ["application", "Application"]) as RawApplication);
    }
}

export class BotIdentity extends Structure<RawBotIdentity> {
    public readonly user: User | null;
    public readonly application: Application | null;

    private constructor(raw: RawBotIdentity) {
        super(raw);
        const userRaw = asRecord(raw.user);
        const applicationRaw = asRecord(raw.application);
        this.user = hasRecord(userRaw) ? User.from(userRaw as unknown as RawUser) : null;
        this.application = hasRecord(applicationRaw) ? Application.from(applicationRaw) : null;
    }

    public static from(value: unknown): BotIdentity {
        return new BotIdentity(unwrapRecord(value, ["identity", "bot", "me"]) as RawBotIdentity);
    }
}

export class BotGateway extends Structure<RawBotGateway> {
    public readonly url: string;

    private constructor(raw: RawBotGateway) {
        super(raw);
        this.url = asString(raw.url);
    }

    public static from(value: unknown): BotGateway {
        return new BotGateway(unwrapRecord(value, ["gateway"]) as RawBotGateway);
    }
}
