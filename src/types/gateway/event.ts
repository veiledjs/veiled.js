import type { GatewayEventName } from "../../gateway/GatewayEvents";
import type { GatewayEventContext } from "../../gateway/GatewayEventContext";

export interface RawGatewayEvent {
    gateway_event_id?: string;
    gateway_event_replayed?: boolean;
    [key: string]: unknown;
}

export interface RawGatewayReplayGap {
    availableSince?: string;
    reason?: string;
    [key: string]: unknown;
}

export interface GatewayCloseInfo {
    reason: string;
    description?: unknown;
}

export type GatewayAnyListener = (
    name: GatewayEventName,
    payload: RawGatewayEvent,
    context: GatewayEventContext,
) => void | Promise<void>;
