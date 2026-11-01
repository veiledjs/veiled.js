import { GatewayIntents } from "../src";

const configuredToken = Bun.env.VEILED_BOT_TOKEN;

if (!configuredToken) {
    throw new Error("VEILED_BOT_TOKEN is required");
}

export const token: string = configuredToken;
export const prefix = Bun.env.BOT_PREFIX ?? "!";
export const debugEvents = Bun.env.DEBUG_EVENTS === "true";
export const debugGateway = Bun.env.DEBUG_GATEWAY === "true";
export const defaultRoomId = Bun.env.ROOM_ID ?? "";
export const defaultLaneId = Bun.env.LANE_ID ?? "";
export const allIntents = Object.values(GatewayIntents)
    .reduce((mask, intent) => mask | intent, 0);
