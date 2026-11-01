export { BotClient, BotClient as Bot } from "./client/BotClient";
export { WebhookClient, WebhookClient as Webhook } from "./client/WebhookClient";

export { GatewayConnection } from "./gateway/GatewayConnection";
export { GatewayEventContext } from "./gateway/GatewayEventContext";
export { GatewayEvents, GatewaySystemEvents, isGatewayEventName } from "./gateway/GatewayEvents";
export {
    BOT_GATEWAY_INTENTS,
    DEFAULT_GATEWAY_INTENTS,
    GatewayIntents,
    hasIntent,
} from "./gateway/GatewayIntents";
export { GatewayState } from "./gateway/GatewayState";
export {
    GatewayAPIError,
    GatewayAckTimeoutError,
    GatewayConnectionError,
    GatewayError,
    GatewayNotConnectedError,
} from "./gateway/errors";

export { GatewayREST, DEFAULT_API_BASE_URL } from "./rest/GatewayREST";
export { WebhookREST } from "./rest/WebhookREST";
export { WebhookAPIError } from "./rest/WebhookAPIError";

export { Message } from "./structures/Message";
export { User } from "./structures/User";
export { Embed } from "./structures/Embed";
export { Attachment } from "./structures/Attachment";
export { Reaction } from "./structures/Reaction";
export { Sticker } from "./structures/Sticker";
export { WebhookInfo } from "./structures/WebhookInfo";

export { MessageBuilder } from "./builders/MessageBuilder";
export { WebhookMessageBuilder, WebhookMessageBuilder as WebhookMessage } from "./builders/WebhookMessageBuilder";
export { EmbedBuilder } from "./builders/EmbedBuilder";
export { ActionRowBuilder } from "./builders/ActionRowBuilder";
export { ButtonBuilder } from "./builders/ButtonBuilder";

export { ComponentType, ButtonStyle } from "./types/payload/component";
export { LIMITS } from "./util/validate";

export type {
    RawMessagePayload,
    RawWebhookMessagePayload,
} from "./types/payload/message";
export type {
    RawEmbedPayload,
    RawEmbedImagePayload,
    RawEmbedAuthorPayload,
    RawEmbedFooterPayload,
    RawEmbedFieldPayload,
} from "./types/payload/embed";
export type {
    RawButtonPayload,
    RawActionRowPayload,
} from "./types/payload/component";
export type {
    RawMessage,
    RawComponent,
    RawWebhookExecuteResponse,
} from "./types/response/message";
export type { RawUser } from "./types/response/user";
export type { RawEmbed, RawEmbedField } from "./types/response/embed";
export type { RawAttachment } from "./types/response/attachment";
export type { RawReaction } from "./types/response/reaction";
export type { RawSticker } from "./types/response/sticker";
export type { RawWebhookInfo } from "./types/response/webhook";

export type {
    BotClientEventMap,
    BotClientListener,
} from "./client/BotClient";
export type { GatewayConnectionEventMap } from "./gateway/GatewayConnection";
export type { GatewayEventName } from "./gateway/GatewayEvents";
export type { GatewayAckHandler } from "./gateway/GatewayEventContext";
export type {
    GatewayCloseInfo,
    GatewayAnyListener,
    RawGatewayEvent,
    RawGatewayReplayGap,
} from "./types/gateway/event";
export type { GatewayAckCallback, GatewayAckResult } from "./types/gateway/ack";
export type {
    BotClientOptions,
    GatewayConnectionOptions,
    ReconnectOptions,
    Shard,
} from "./types/gateway/options";
export type { ManagerLike, SocketFactory, SocketLike } from "./types/gateway/socket";
