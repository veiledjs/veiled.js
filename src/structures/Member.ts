import type { RawMember } from "../types/response/bot";
import type { RawUser } from "../types/response/user";
import {
    asArray,
    asDate,
    asNullableString,
    asRecord,
    asString,
    hasRecord,
    unwrapRecord,
} from "../util/structure";
import { Role } from "./Role";
import { Structure } from "./Structure";
import { User } from "./User";

export class Member extends Structure<RawMember> {
    public readonly id: string;
    public readonly userId: string;
    public readonly roomId: string | null;
    public readonly nickname: string | null;
    public readonly user: User | null;
    public readonly roles: Role[];
    public readonly roleIds: string[];
    public readonly joinedAt: Date | null;

    private constructor(raw: RawMember) {
        super(raw);
        const userRaw = asRecord(raw.user ?? raw.User);
        const rolesRaw = asArray(raw.roles ?? raw.Role);
        this.user = hasRecord(userRaw) ? User.from(userRaw as unknown as RawUser) : null;
        this.id = asString(raw.id ?? raw.memberId ?? raw.userId ?? this.user?.id);
        this.userId = asString(raw.userId ?? raw.id ?? raw.memberId ?? this.user?.id);
        this.roomId = asNullableString(raw.roomId);
        this.nickname = asNullableString(raw.nickname ?? raw.displayName);
        this.roles = rolesRaw
            .filter((role) => typeof role !== "string")
            .map((role) => Role.from(role));
        this.roleIds = rolesRaw.map((role) => typeof role === "string"
            ? role
            : asString(asRecord(role).id ?? asRecord(role).roleId)).filter(Boolean);
        this.joinedAt = asDate(raw.joinedAt ?? raw.createdAt);
    }

    public static from(value: unknown): Member {
        return new Member(unwrapRecord(value, ["member", "Member"]) as RawMember);
    }
}
