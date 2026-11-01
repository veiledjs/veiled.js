import type { RawScheduledEvent } from "../types/response/bot";
import {
    asDate,
    asNullableString,
    asString,
    unwrapRecord,
} from "../util/structure";
import { Structure } from "./Structure";

export class ScheduledEvent extends Structure<RawScheduledEvent> {
    public readonly id: string;
    public readonly roomId: string | null;
    public readonly laneId: string | null;
    public readonly name: string | null;
    public readonly description: string | null;
    public readonly locationType: string | null;
    public readonly externalLocation: string | null;
    public readonly status: string | null;
    public readonly scheduledStartAt: Date | null;
    public readonly scheduledEndAt: Date | null;
    public readonly createdAt: Date | null;
    public readonly updatedAt: Date | null;

    private constructor(raw: RawScheduledEvent) {
        super(raw);
        this.id = asString(raw.id ?? raw.eventId);
        this.roomId = asNullableString(raw.roomId);
        this.laneId = asNullableString(raw.laneId);
        this.name = asNullableString(raw.name);
        this.description = asNullableString(raw.description);
        this.locationType = asNullableString(raw.locationType);
        this.externalLocation = asNullableString(raw.externalLocation);
        this.status = asNullableString(raw.status);
        this.scheduledStartAt = asDate(raw.scheduledStartAt);
        this.scheduledEndAt = asDate(raw.scheduledEndAt);
        this.createdAt = asDate(raw.createdAt);
        this.updatedAt = asDate(raw.updatedAt);
    }

    public static from(value: unknown): ScheduledEvent {
        return new ScheduledEvent(unwrapRecord(value, ["event", "scheduledEvent", "ScheduledEvent"]) as RawScheduledEvent);
    }
}
