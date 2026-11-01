import type { RawThread, RawThreadMember } from "../types/response/bot";
import type { RawUser } from "../types/response/user";
import {
    asBoolean,
    asDate,
    asNullableNumber,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    hasRecord,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";
import { User } from "./User";

export class Thread extends Structure<RawThread> {
    public readonly id: string;
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly title: string | null;
    public readonly name: string | null;
    public readonly ownerId: string | null;
    public readonly type: string | number | null;
    public readonly isArchived: boolean;
    public readonly isLocked: boolean;
    public readonly isPinned: boolean;
    public readonly messageCount: number | null;
    public readonly memberCount: number | null;
    public readonly createdAt: Date | null;
    public readonly updatedAt: Date | null;

    private constructor(raw: RawThread) {
        super(raw);
        this.id = asString(raw.id ?? raw.threadId);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.title = asNullableString(raw.title);
        this.name = asNullableString(raw.name ?? raw.title);
        this.ownerId = asNullableString(raw.ownerId);
        this.type = typeof raw.type === "string" || typeof raw.type === "number" ? raw.type : null;
        this.isArchived = asBoolean(raw.isArchived ?? raw.archived);
        this.isLocked = asBoolean(raw.isLocked ?? raw.locked);
        this.isPinned = asBoolean(raw.isPinned ?? raw.pinned);
        this.messageCount = asNullableNumber(raw.messageCount);
        this.memberCount = asNullableNumber(raw.memberCount);
        this.createdAt = asDate(raw.createdAt);
        this.updatedAt = asDate(raw.updatedAt);
    }

    public static from(value: unknown): Thread {
        return new Thread(unwrapRecord(value, ["thread", "Thread"]) as RawThread);
    }
}

export class ThreadMember extends Structure<RawThreadMember> {
    public readonly id: string;
    public readonly userId: string;
    public readonly threadId: string | null;
    public readonly user: User | null;
    public readonly joinedAt: Date | null;

    private constructor(raw: RawThreadMember) {
        super(raw);
        const userRaw = asRecord(raw.user ?? raw.User);
        this.user = hasRecord(userRaw) ? User.from(userRaw as unknown as RawUser) : null;
        this.id = asString(raw.id ?? raw.userId ?? this.user?.id);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.threadId = asNullableString(raw.threadId);
        this.joinedAt = asDate(raw.joinedAt ?? raw.createdAt);
    }

    public static from(value: unknown): ThreadMember {
        return new ThreadMember(unwrapRecord(value, ["member", "threadMember", "ThreadMember"]) as RawThreadMember);
    }
}
