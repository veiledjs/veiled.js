import { BotWebhook } from "../structures/BotWebhook";
import { Invite } from "../structures/Invite";
import { Lane } from "../structures/Lane";
import { Member } from "../structures/Member";
import { Message } from "../structures/Message";
import {
    GatewayEvent,
    Interaction,
    JoinRequest,
    PollVote,
    Presence,
    ReactionEvent,
    Typing,
} from "../structures/Misc";
import { Role } from "../structures/Role";
import { Room } from "../structures/Room";
import { ScheduledEvent } from "../structures/ScheduledEvent";
import { Thread, ThreadMember } from "../structures/Thread";
import { VoiceRoster } from "../structures/Voice";
import type { RawGatewayEvent } from "../types/gateway/event";
import { GatewayEvents } from "./GatewayEvents";
import type { GatewayEventName } from "./GatewayEvents";

export type GatewayEventStructureMap = {
    ROOM_CREATE: Room;
    ROOM_UPDATE: Room;
    ROOM_DELETE: Room;
    ROOM_EXPRESSIONS_UPDATE: GatewayEvent;
    BOT_ROOM_ADD: Room;
    BOT_ROOM_REMOVE: Room;
    LANE_CREATE: Lane;
    LANE_UPDATE: Lane;
    LANE_DELETE: Lane;
    LANE_REORDER: GatewayEvent;
    ROLE_CREATE: Role;
    ROLE_UPDATE: Role;
    ROLE_DELETE: Role;
    ROLE_POSITIONS_UPDATE: GatewayEvent;
    MEMBER_JOIN: Member;
    MEMBER_LEAVE: Member;
    MEMBER_ROLE_ADD: Member;
    MEMBER_ROLE_REMOVE: Member;
    MEMBER_BAN: Member;
    MEMBER_UNBAN: Member;
    MEMBER_TIMEOUT: Member;
    ROOM_JOIN_REQUEST_UPDATE: JoinRequest;
    PRESENCE_UPDATE: Presence;
    MESSAGE_CREATE: Message;
    MESSAGE_UPDATE: Message;
    MESSAGE_DELETE: Message;
    DM_MESSAGE_CREATE: Message;
    MENTION_NOTIFY: Message;
    MESSAGE_REACTION_ADD: ReactionEvent;
    MESSAGE_REACTION_REMOVE: ReactionEvent;
    DM_MESSAGE_REACTION_ADD: ReactionEvent;
    DM_MESSAGE_REACTION_REMOVE: ReactionEvent;
    TYPING_START: Typing;
    THREAD_CREATE: Thread;
    THREAD_UPDATE: Thread;
    THREAD_DELETE: Thread;
    THREAD_MEMBER_ADD: ThreadMember;
    THREAD_MEMBER_REMOVE: ThreadMember;
    INVITE_CREATE: Invite;
    INVITE_UPDATE: Invite;
    INVITE_DELETE: Invite;
    WEBHOOK_CREATE: BotWebhook;
    WEBHOOK_UPDATE: BotWebhook;
    WEBHOOK_DELETE: BotWebhook;
    POLL_VOTE_ADD: PollVote;
    POLL_VOTE_REMOVE: PollVote;
    VOICE_ROSTER_UPDATE: VoiceRoster;
    SCHEDULED_EVENT_UPDATE: ScheduledEvent;
    INTERACTION_CREATE: Interaction;
};

export type GatewayEventStructure = GatewayEventStructureMap[GatewayEventName];

export function parseGatewayEvent(
    name: GatewayEventName,
    payload: RawGatewayEvent,
): GatewayEventStructure {
    switch (name) {
        case GatewayEvents.ROOM_CREATE:
        case GatewayEvents.ROOM_UPDATE:
        case GatewayEvents.ROOM_DELETE:
        case GatewayEvents.BOT_ROOM_ADD:
        case GatewayEvents.BOT_ROOM_REMOVE:
            return Room.from(payload);
        case GatewayEvents.LANE_CREATE:
        case GatewayEvents.LANE_UPDATE:
        case GatewayEvents.LANE_DELETE:
            return Lane.from(payload);
        case GatewayEvents.ROLE_CREATE:
        case GatewayEvents.ROLE_UPDATE:
        case GatewayEvents.ROLE_DELETE:
            return Role.from(payload);
        case GatewayEvents.MEMBER_JOIN:
        case GatewayEvents.MEMBER_LEAVE:
        case GatewayEvents.MEMBER_ROLE_ADD:
        case GatewayEvents.MEMBER_ROLE_REMOVE:
        case GatewayEvents.MEMBER_BAN:
        case GatewayEvents.MEMBER_UNBAN:
        case GatewayEvents.MEMBER_TIMEOUT:
            return Member.from(payload);
        case GatewayEvents.ROOM_JOIN_REQUEST_UPDATE:
            return JoinRequest.from(payload);
        case GatewayEvents.PRESENCE_UPDATE:
            return Presence.from(payload);
        case GatewayEvents.MESSAGE_CREATE:
        case GatewayEvents.MESSAGE_UPDATE:
        case GatewayEvents.MESSAGE_DELETE:
        case GatewayEvents.DM_MESSAGE_CREATE:
        case GatewayEvents.MENTION_NOTIFY:
            return Message.fromUnknown(payload);
        case GatewayEvents.MESSAGE_REACTION_ADD:
        case GatewayEvents.MESSAGE_REACTION_REMOVE:
        case GatewayEvents.DM_MESSAGE_REACTION_ADD:
        case GatewayEvents.DM_MESSAGE_REACTION_REMOVE:
            return ReactionEvent.from(payload);
        case GatewayEvents.TYPING_START:
            return Typing.from(payload);
        case GatewayEvents.THREAD_CREATE:
        case GatewayEvents.THREAD_UPDATE:
        case GatewayEvents.THREAD_DELETE:
            return Thread.from(payload);
        case GatewayEvents.THREAD_MEMBER_ADD:
        case GatewayEvents.THREAD_MEMBER_REMOVE:
            return ThreadMember.from(payload);
        case GatewayEvents.INVITE_CREATE:
        case GatewayEvents.INVITE_UPDATE:
        case GatewayEvents.INVITE_DELETE:
            return Invite.from(payload);
        case GatewayEvents.WEBHOOK_CREATE:
        case GatewayEvents.WEBHOOK_UPDATE:
        case GatewayEvents.WEBHOOK_DELETE:
            return BotWebhook.from(payload);
        case GatewayEvents.POLL_VOTE_ADD:
        case GatewayEvents.POLL_VOTE_REMOVE:
            return PollVote.from(payload);
        case GatewayEvents.VOICE_ROSTER_UPDATE:
            return VoiceRoster.from(payload);
        case GatewayEvents.SCHEDULED_EVENT_UPDATE:
            return ScheduledEvent.from(payload);
        case GatewayEvents.INTERACTION_CREATE:
            return Interaction.from(payload);
        default:
            return GatewayEvent.from(name, payload);
    }
}
