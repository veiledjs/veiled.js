import type { RawInvite } from "../types/response/bot";
import {
    asBoolean,
    asDate,
    asNullableNumber,
    asNullableString,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class Invite extends Structure<RawInvite> {
    public readonly id: string;
    public readonly code: string;
    public readonly roomId: string | null;
    public readonly maxAge: number | null;
    public readonly maxUses: number | null;
    public readonly temporary: boolean;
    public readonly uses: number | null;
    public readonly createdAt: Date | null;
    public readonly expiresAt: Date | null;

    private constructor(raw: RawInvite) {
        super(raw);
        this.id = asString(raw.id ?? raw.inviteId);
        this.code = asString(raw.code ?? raw.inviteCode);
        this.roomId = asNullableString(raw.roomId);
        this.maxAge = asNullableNumber(raw.maxAge);
        this.maxUses = asNullableNumber(raw.maxUses);
        this.temporary = asBoolean(raw.temporary);
        this.uses = asNullableNumber(raw.uses ?? raw.usedCount);
        this.createdAt = asDate(raw.createdAt);
        this.expiresAt = asDate(raw.expiresAt);
    }

    public static from(value: unknown): Invite {
        return new Invite(unwrapRecord(value, ["invite", "Invite"]) as RawInvite);
    }
}
