export const GatewayIntents = {
    ROOMS: 1 << 0,
    MEMBERS: 1 << 1,
    MESSAGES: 1 << 2,
    MESSAGE_CONTENT: 1 << 3,
    REACTIONS: 1 << 4,
    PRESENCE: 1 << 5,
    THREADS: 1 << 6,
    INVITES: 1 << 7,
    WEBHOOKS: 1 << 8,
    POLLS: 1 << 9,
    MODERATION: 1 << 10,
    VOICE_STATES: 1 << 11,
    SCHEDULED_EVENTS: 1 << 12,
    INTERACTIONS: 1 << 13,
    ROLES: 1 << 14,
    DM_REACTIONS: 1 << 15,
    DM_MESSAGES: 1 << 16,
} as const;

export const BOT_GATEWAY_INTENTS = GatewayIntents;

export const DEFAULT_GATEWAY_INTENTS =
    GatewayIntents.ROOMS |
    GatewayIntents.MESSAGES |
    GatewayIntents.REACTIONS |
    GatewayIntents.THREADS |
    GatewayIntents.INVITES |
    GatewayIntents.WEBHOOKS |
    GatewayIntents.POLLS |
    GatewayIntents.MODERATION |
    GatewayIntents.VOICE_STATES |
    GatewayIntents.SCHEDULED_EVENTS |
    GatewayIntents.INTERACTIONS |
    GatewayIntents.ROLES;

export type GatewayIntent = typeof GatewayIntents[keyof typeof GatewayIntents];

export function hasIntent(mask: number, intent: GatewayIntent): boolean {
    return (mask & intent) === intent;
}
