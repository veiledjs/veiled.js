import type { RawRole } from "../types/response/bot";
import {
    asBoolean,
    asNullableNumber,
    asNullableString,
    asNumber,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class Role extends Structure<RawRole> {
    public readonly id: string;
    public readonly name: string | null;
    public readonly color: number | string | null;
    public readonly position: number;
    public readonly hoist: boolean;
    public readonly isMentionable: boolean;
    public readonly permissions: string | number | string[] | null;

    private constructor(raw: RawRole) {
        super(raw);
        this.id = asString(raw.id ?? raw.roleId);
        this.name = asNullableString(raw.name);
        this.color = typeof raw.color === "number" || typeof raw.color === "string" ? raw.color : null;
        this.position = asNumber(raw.position);
        this.hoist = asBoolean(raw.hoist);
        this.isMentionable = asBoolean(raw.isMentionable ?? raw.mentionable);
        this.permissions = typeof raw.permissions === "string"
            || typeof raw.permissions === "number"
            || Array.isArray(raw.permissions)
            ? raw.permissions as string | number | string[]
            : null;
    }

    public static from(value: unknown): Role {
        return new Role(unwrapRecord(value, ["role", "Role"]) as RawRole);
    }
}
