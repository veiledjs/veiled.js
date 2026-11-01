import type { RawRoom } from "../types/response/bot";
import {
    asDate,
    asNullableNumber,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class Room extends Structure<RawRoom> {
    public readonly id: string;
    public readonly name: string | null;
    public readonly description: string | null;
    public readonly ownerId: string | null;
    public readonly icon: string | null;
    public readonly banner: string | null;
    public readonly createdAt: Date | null;
    public readonly updatedAt: Date | null;
    public readonly permissions: string | null;
    public readonly memberCount: number | null;

    private constructor(raw: RawRoom) {
        super(raw);
        this.id = asString(raw.id ?? raw.roomId);
        this.name = asNullableString(raw.name);
        this.description = asNullableString(raw.description);
        this.ownerId = asNullableString(raw.ownerId);
        this.icon = asNullableString(raw.icon);
        this.banner = asNullableString(raw.banner);
        this.createdAt = asDate(raw.createdAt);
        this.updatedAt = asDate(raw.updatedAt);
        this.permissions = asNullableString(raw.permissions);
        this.memberCount = asNullableNumber(asRecord(raw._count).RoomMember)
            ?? asNullableNumber(raw.memberCount);
    }

    public static from(value: unknown): Room {
        return new Room(unwrapRecord(value, ["room", "Room"]) as RawRoom);
    }
}
