import type { RawLane } from "../types/response/bot";
import {
    asBoolean,
    asDate,
    asNullableNumber,
    asNullableString,
    asNumber,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class Lane extends Structure<RawLane> {
    public readonly id: string;
    public readonly roomId: string | null;
    public readonly name: string | null;
    public readonly type: string | null;
    public readonly topic: string | null;
    public readonly parentId: string | null;
    public readonly position: number;
    public readonly isNSFW: boolean;
    public readonly slowmode: number;
    public readonly createdAt: Date | null;
    public readonly updatedAt: Date | null;

    private constructor(raw: RawLane) {
        super(raw);
        this.id = asString(raw.id ?? raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.name = asNullableString(raw.name);
        this.type = asNullableString(raw.type);
        this.topic = asNullableString(raw.topic);
        this.parentId = asNullableString(raw.parentId);
        this.position = asNumber(raw.position);
        this.isNSFW = asBoolean(raw.isNSFW);
        this.slowmode = asNumber(raw.slowmode);
        this.createdAt = asDate(raw.createdAt);
        this.updatedAt = asDate(raw.updatedAt);
    }

    public static from(value: unknown): Lane {
        return new Lane(unwrapRecord(value, ["lane", "Lane", "channel"]) as RawLane);
    }
}
