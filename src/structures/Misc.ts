import type { RawLaneCapabilities, RawMemberPermissions, RawReactionPage, RawReactionUser, RawStagedUpload } from "../types/response/bot";
import type { RawUser } from "../types/response/user";
import {
    asArray,
    asBoolean,
    asDate,
    asNullableNumber,
    asNullableString,
    asNumber,
    asRecord,
    asString,
    hasRecord,
    unwrapList,
    unwrapRecord,
} from "../util/structure";
import { BotWebhook } from "./BotWebhook";
import { Invite } from "./Invite";
import { Lane } from "./Lane";
import { Member } from "./Member";
import { Message } from "./Message";
import { Role } from "./Role";
import { Room } from "./Room";
import { ScheduledEvent } from "./ScheduledEvent";
import { Structure } from "./Structure";
import { Thread, ThreadMember } from "./Thread";
import { User } from "./User";
import { VoiceState } from "./Voice";

function optional(value: unknown, keys: string[]): unknown {
    const root = asRecord(value);
    const sources = [root, asRecord(root.data), asRecord(root.payload)];

    for (const source of sources) {
        for (const key of keys) {
            if (hasRecord(source[key]) || Array.isArray(source[key])) return source[key];
        }
    }

    return undefined;
}

function optionalUser(value: unknown): User | null {
    const raw = asRecord(value);
    return hasRecord(raw) ? User.from(raw as unknown as RawUser) : null;
}

export class LaneCapabilities extends Structure<RawLaneCapabilities> {
    public readonly capabilities: Record<string, boolean>;
    public readonly slowmode: number;
    public readonly nextSendAt: Date | null;
    public readonly characterLimit: number | null;

    private constructor(raw: RawLaneCapabilities) {
        super(raw);
        const capabilities = asRecord(raw.capabilities);
        this.capabilities = Object.fromEntries(
            Object.entries(capabilities).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
        );
        this.slowmode = asNumber(raw.slowmode);
        this.nextSendAt = asDate(raw.nextSendAt);
        this.characterLimit = asNullableNumber(raw.characterLimit);
    }

    public static from(value: unknown): LaneCapabilities {
        return new LaneCapabilities(unwrapRecord(value, ["capabilities", "laneCapabilities"]) as RawLaneCapabilities);
    }
}

export class StagedUpload extends Structure<RawStagedUpload> {
    public readonly id: string;
    public readonly filename: string | null;
    public readonly contentType: string | null;
    public readonly size: number | null;
    public readonly url: string | null;

    private constructor(raw: RawStagedUpload) {
        super(raw);
        this.id = asString(raw.id);
        this.filename = asNullableString(raw.filename);
        this.contentType = asNullableString(raw.contentType);
        this.size = asNullableNumber(raw.size);
        this.url = asNullableString(raw.url);
    }

    public static from(value: unknown): StagedUpload {
        return new StagedUpload(unwrapRecord(value, ["upload", "stagedUpload", "StagedUpload"]) as RawStagedUpload);
    }
}

export class ReactionUser extends Structure<RawReactionUser> {
    public readonly id: string;
    public readonly userId: string;
    public readonly user: User | null;

    private constructor(raw: RawReactionUser) {
        super(raw);
        this.user = optionalUser(raw.user ?? raw.User);
        this.id = asString(raw.id ?? raw.userId ?? this.user?.id);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
    }

    public static from(value: unknown): ReactionUser {
        return new ReactionUser(asRecord(value) as RawReactionUser);
    }
}

export class ReactionPage extends Structure<RawReactionPage> {
    public readonly reactions: ReactionUser[];
    public readonly count: number;

    private constructor(raw: RawReactionPage) {
        super(raw);
        this.reactions = asArray(raw.reactions).map(ReactionUser.from);
        this.count = asNumber(raw.count, this.reactions.length);
    }

    public static from(value: unknown): ReactionPage {
        return new ReactionPage(unwrapRecord(value, ["reactionsPage", "reactionPage"]) as RawReactionPage);
    }
}

export class MemberPermissions extends Structure<RawMemberPermissions> {
    public readonly permissions: string | number | string[] | null;

    private constructor(raw: RawMemberPermissions) {
        super(raw);
        this.permissions = typeof raw.permissions === "string"
            || typeof raw.permissions === "number"
            || Array.isArray(raw.permissions)
            ? raw.permissions as string | number | string[]
            : null;
    }

    public static from(value: unknown): MemberPermissions {
        return new MemberPermissions(unwrapRecord(value, ["permissions", "memberPermissions"]) as RawMemberPermissions);
    }
}

export class Presence extends Structure<Record<string, unknown>> {
    public readonly userId: string;
    public readonly roomId: string | null;
    public readonly status: string | null;
    public readonly activities: unknown[];
    public readonly user: User | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        this.user = optionalUser(raw.user ?? raw.User);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.roomId = asNullableString(raw.roomId);
        this.status = asNullableString(raw.status);
        this.activities = asArray(raw.activities);
    }

    public static from(value: unknown): Presence {
        return new Presence(unwrapRecord(value, ["presence", "Presence"]) as Record<string, unknown>);
    }
}

export class Interaction extends Structure<Record<string, unknown>> {
    public readonly id: string;
    public readonly type: string | number | null;
    public readonly data: Record<string, unknown>;
    public readonly user: User | null;
    public readonly member: Member | null;
    public readonly roomId: string | null;
    public readonly laneId: string | null;
    public readonly commandName: string | null;
    public readonly customId: string | null;
    public readonly token: string | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        const data = hasRecord(raw.data) ? asRecord(raw.data) : raw;
        this.id = asString(raw.interaction_id ?? raw.id);
        this.type = typeof raw.type === "string" || typeof raw.type === "number" ? raw.type : null;
        this.data = data;
        this.user = optionalUser(raw.user ?? raw.User);
        this.member = hasRecord(raw.member ?? raw.Member) ? Member.from(raw.member ?? raw.Member) : null;
        this.roomId = asNullableString(raw.roomId);
        this.laneId = asNullableString(raw.laneId);
        this.commandName = asNullableString(data.name);
        this.customId = asNullableString(data.custom_id ?? data.customId);
        this.token = asNullableString(raw.token);
    }

    public static from(value: unknown): Interaction {
        return new Interaction(unwrapRecord(value, ["interaction", "Interaction"]) as Record<string, unknown>);
    }
}

export class Typing extends Structure<Record<string, unknown>> {
    public readonly userId: string;
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly user: User | null;
    public readonly createdAt: Date | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        this.user = optionalUser(raw.user ?? raw.User);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.createdAt = asDate(raw.createdAt ?? raw.timestamp);
    }

    public static from(value: unknown): Typing {
        return new Typing(unwrapRecord(value, ["typing", "Typing"]) as Record<string, unknown>);
    }
}

export class ReactionEvent extends Structure<Record<string, unknown>> {
    public readonly userId: string;
    public readonly messageId: string | null;
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly emoji: string | null;
    public readonly user: User | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        const emoji = raw.emoji;
        this.user = optionalUser(raw.user ?? raw.User);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.messageId = asNullableString(raw.messageId);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.emoji = typeof emoji === "string"
            ? emoji
            : asNullableString(asRecord(emoji).name ?? asRecord(emoji).id);
    }

    public static from(value: unknown): ReactionEvent {
        return new ReactionEvent(unwrapRecord(value, ["reaction", "Reaction"]) as Record<string, unknown>);
    }
}

export class PollVote extends Structure<Record<string, unknown>> {
    public readonly userId: string;
    public readonly messageId: string | null;
    public readonly laneId: string | null;
    public readonly roomId: string | null;
    public readonly pollId: string | null;
    public readonly answerId: string | null;
    public readonly user: User | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        this.user = optionalUser(raw.user ?? raw.User);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.messageId = asNullableString(raw.messageId);
        this.laneId = asNullableString(raw.laneId);
        this.roomId = asNullableString(raw.roomId);
        this.pollId = asNullableString(raw.pollId);
        this.answerId = asNullableString(raw.answerId ?? raw.optionId);
    }

    public static from(value: unknown): PollVote {
        return new PollVote(unwrapRecord(value, ["vote", "pollVote", "PollVote"]) as Record<string, unknown>);
    }
}

export class JoinRequest extends Structure<Record<string, unknown>> {
    public readonly id: string;
    public readonly roomId: string | null;
    public readonly userId: string;
    public readonly status: string | null;
    public readonly user: User | null;

    private constructor(raw: Record<string, unknown>) {
        super(raw);
        this.user = optionalUser(raw.user ?? raw.User);
        this.id = asString(raw.id);
        this.roomId = asNullableString(raw.roomId);
        this.userId = asString(raw.userId ?? raw.id ?? this.user?.id);
        this.status = asNullableString(raw.status);
    }

    public static from(value: unknown): JoinRequest {
        return new JoinRequest(unwrapRecord(value, ["request", "joinRequest", "JoinRequest"]) as Record<string, unknown>);
    }
}

export class GatewayEvent extends Structure<Record<string, unknown>> {
    public readonly name: string;
    public readonly data: Record<string, unknown>;
    public readonly room: Room | null;
    public readonly lane: Lane | null;
    public readonly message: Message | null;
    public readonly member: Member | null;
    public readonly user: User | null;
    public readonly role: Role | null;
    public readonly roles: Role[];
    public readonly lanes: Lane[];
    public readonly thread: Thread | null;
    public readonly threadMember: ThreadMember | null;
    public readonly invite: Invite | null;
    public readonly webhook: BotWebhook | null;
    public readonly scheduledEvent: ScheduledEvent | null;
    public readonly interaction: Interaction | null;
    public readonly presence: Presence | null;
    public readonly typing: Typing | null;
    public readonly reaction: ReactionEvent | null;
    public readonly pollVote: PollVote | null;
    public readonly voiceStates: VoiceState[];

    private constructor(name: string, raw: Record<string, unknown>) {
        super(raw);
        this.name = name;
        this.data = asRecord(raw.data);
        this.room = hasRecord(optional(raw, ["room", "Room"])) ? Room.from(optional(raw, ["room", "Room"])) : null;
        this.lane = hasRecord(optional(raw, ["lane", "Lane"])) ? Lane.from(optional(raw, ["lane", "Lane"])) : null;
        this.message = hasRecord(optional(raw, ["message", "Message"])) ? Message.fromUnknown(optional(raw, ["message", "Message"])) : null;
        this.member = hasRecord(optional(raw, ["member", "Member"])) ? Member.from(optional(raw, ["member", "Member"])) : null;
        this.user = optionalUser(optional(raw, ["user", "User"]));
        this.role = hasRecord(optional(raw, ["role", "Role"])) ? Role.from(optional(raw, ["role", "Role"])) : null;
        this.roles = unwrapList(optional(raw, ["roles"]), ["roles"]).map(Role.from);
        this.lanes = unwrapList(optional(raw, ["lanes"]), ["lanes"]).map(Lane.from);
        this.thread = hasRecord(optional(raw, ["thread", "Thread"])) ? Thread.from(optional(raw, ["thread", "Thread"])) : null;
        this.threadMember = hasRecord(optional(raw, ["threadMember", "ThreadMember"])) ? ThreadMember.from(optional(raw, ["threadMember", "ThreadMember"])) : null;
        this.invite = hasRecord(optional(raw, ["invite", "Invite"])) ? Invite.from(optional(raw, ["invite", "Invite"])) : null;
        this.webhook = hasRecord(optional(raw, ["webhook", "Webhook"])) ? BotWebhook.from(optional(raw, ["webhook", "Webhook"])) : null;
        this.scheduledEvent = hasRecord(optional(raw, ["event", "scheduledEvent", "ScheduledEvent"]))
            ? ScheduledEvent.from(optional(raw, ["event", "scheduledEvent", "ScheduledEvent"]))
            : null;
        this.interaction = hasRecord(optional(raw, ["interaction", "Interaction"]))
            ? Interaction.from(optional(raw, ["interaction", "Interaction"]))
            : null;
        this.presence = hasRecord(optional(raw, ["presence", "Presence"])) ? Presence.from(optional(raw, ["presence", "Presence"])) : null;
        this.typing = hasRecord(optional(raw, ["typing", "Typing"])) ? Typing.from(optional(raw, ["typing", "Typing"])) : null;
        this.reaction = hasRecord(optional(raw, ["reaction", "Reaction"])) ? ReactionEvent.from(optional(raw, ["reaction", "Reaction"])) : null;
        this.pollVote = hasRecord(optional(raw, ["vote", "pollVote", "PollVote"])) ? PollVote.from(optional(raw, ["vote", "pollVote", "PollVote"])) : null;
        this.voiceStates = unwrapList(optional(raw, ["states", "voiceStates", "users"]), ["states", "voiceStates", "users"]).map(VoiceState.from);
    }

    public static from(name: string, value: unknown): GatewayEvent {
        return new GatewayEvent(name, unwrapRecord(value));
    }
}
