import type { GatewayAckResult } from "../types/gateway/ack";
import type { RawGatewayEvent } from "../types/gateway/event";
import type { GatewayEventName } from "./GatewayEvents";
import { GatewayError } from "./errors";

export type GatewayAckHandler = (eventId: string) => Promise<GatewayAckResult>;

export class GatewayEventContext {
    private ackPromise: Promise<GatewayAckResult> | undefined;

    public constructor(
        public readonly name: GatewayEventName,
        public readonly payload: RawGatewayEvent,
        public readonly eventId: string | undefined,
        public readonly replayed: boolean,
        private readonly ackHandler: GatewayAckHandler,
    ) {}

    public get canAck(): boolean {
        return this.eventId !== undefined && this.ackPromise === undefined;
    }

    public ack(): Promise<GatewayAckResult> {
        if (!this.eventId) {
            throw new GatewayError("Event does not contain a gateway_event_id");
        }

        this.ackPromise ??= this.ackHandler(this.eventId);
        return this.ackPromise;
    }
}
