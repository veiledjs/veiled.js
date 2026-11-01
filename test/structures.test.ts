import { describe, expect, test } from "bun:test";
import {
    Application,
    BotGateway,
    BotIdentity,
    BotWebhook,
    GatewayEvent,
    GatewayEvents,
    IceServer,
    IceServerResponse,
    Interaction,
    Invite,
    JoinRequest,
    Lane,
    LaneCapabilities,
    Member,
    MemberPermissions,
    Message,
    PollVote,
    Presence,
    ReactionEvent,
    ReactionPage,
    ReactionUser,
    Role,
    Room,
    ScheduledEvent,
    StagedUpload,
    Thread,
    ThreadMember,
    Typing,
    User,
    VoiceCredentials,
    VoiceRoster,
    VoiceState,
    parseGatewayEvent,
} from "../src";
import type { GatewayEventName, RawGatewayEvent } from "../src";

const user = {
    id: "user1",
    username: "alice",
    displayName: "Alice",
    avatar: "https://cdn.test/alice.png",
};

describe("Room", () => {
    test("parses nested room payloads", () => {
        const room = Room.from({
            data: {
                room: {
                    id: "room1",
                    name: "Test Room",
                    description: "A room",
                    ownerId: "user1",
                    icon: "icon.png",
                    banner: "banner.png",
                    permissions: "1024",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    updatedAt: "2026-01-02T00:00:00.000Z",
                    _count: { RoomMember: 42 },
                },
            },
        });

        expect(room).toBeInstanceOf(Room);
        expect(room.id).toBe("room1");
        expect(room.name).toBe("Test Room");
        expect(room.description).toBe("A room");
        expect(room.ownerId).toBe("user1");
        expect(room.icon).toBe("icon.png");
        expect(room.banner).toBe("banner.png");
        expect(room.permissions).toBe("1024");
        expect(room.memberCount).toBe(42);
        expect(room.createdAt?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
        expect(room.updatedAt?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
        expect(room.raw).toHaveProperty("id", "room1");
    });

    test("supports delete payloads and direct member counts", () => {
        const room = Room.from({ roomId: "room2", memberCount: 7 });

        expect(room.id).toBe("room2");
        expect(room.memberCount).toBe(7);
        expect(room.name).toBeNull();
    });

    test("uses safe defaults for missing and invalid values", () => {
        const room = Room.from({ id: 123, createdAt: "not-a-date", _count: null });

        expect(room.id).toBe("");
        expect(room.createdAt).toBeNull();
        expect(room.memberCount).toBeNull();
    });
});

describe("Lane", () => {
    test("parses wrapped lane fields", () => {
        const lane = Lane.from({
            data: {
                lane: {
                    id: "lane1",
                    roomId: "room1",
                    name: "general",
                    type: "TEXT",
                    topic: "Chat",
                    parentId: "category1",
                    position: 3,
                    isNSFW: true,
                    slowmode: 10,
                    createdAt: "2026-02-01T10:00:00.000Z",
                    updatedAt: "2026-02-02T10:00:00.000Z",
                },
            },
        });

        expect(lane).toBeInstanceOf(Lane);
        expect(lane.id).toBe("lane1");
        expect(lane.roomId).toBe("room1");
        expect(lane.name).toBe("general");
        expect(lane.type).toBe("TEXT");
        expect(lane.topic).toBe("Chat");
        expect(lane.parentId).toBe("category1");
        expect(lane.position).toBe(3);
        expect(lane.isNSFW).toBe(true);
        expect(lane.slowmode).toBe(10);
        expect(lane.createdAt).toBeInstanceOf(Date);
        expect(lane.updatedAt).toBeInstanceOf(Date);
    });

    test("supports delete payloads", () => {
        const lane = Lane.from({ laneId: "lane2" });

        expect(lane.id).toBe("lane2");
        expect(lane.position).toBe(0);
        expect(lane.isNSFW).toBe(false);
    });

    test("accepts channel aliases and defaults to zero", () => {
        const lane = Lane.from({ channel: { id: "lane3", position: "not-a-number" } });

        expect(lane.id).toBe("lane3");
        expect(lane.position).toBe(0);
        expect(lane.slowmode).toBe(0);
    });
});

describe("Role", () => {
    test("parses role fields and permissions", () => {
        const role = Role.from({
            role: {
                id: "role1",
                name: "Admin",
                color: "#ff00ff",
                position: 5,
                hoist: true,
                mentionable: true,
                permissions: ["manage_room", "send_messages"],
            },
        });

        expect(role).toBeInstanceOf(Role);
        expect(role.id).toBe("role1");
        expect(role.name).toBe("Admin");
        expect(role.color).toBe("#ff00ff");
        expect(role.position).toBe(5);
        expect(role.hoist).toBe(true);
        expect(role.isMentionable).toBe(true);
        expect(role.permissions).toEqual(["manage_room", "send_messages"]);
    });

    test("supports numeric colors and string permissions", () => {
        const role = Role.from({ id: "role2", color: 12, permissions: "1024" });

        expect(role.color).toBe(12);
        expect(role.permissions).toBe("1024");
        expect(role.isMentionable).toBe(false);
    });

    test("falls back to roleId and filters invalid colors", () => {
        const role = Role.from({ roleId: "role3", color: { red: 1 } });

        expect(role.id).toBe("role3");
        expect(role.color).toBeNull();
        expect(role.permissions).toBeNull();
    });
});

describe("Member", () => {
    test("parses a member with nested user and role objects", () => {
        const member = Member.from({
            data: {
                member: {
                    id: "member1",
                    userId: "user1",
                    roomId: "room1",
                    nickname: "Ali",
                    joinedAt: "2026-03-01T00:00:00.000Z",
                    user,
                    roles: [
                        { id: "role1", name: "Admin" },
                        { id: "role2", name: "Mod" },
                    ],
                },
            },
        });

        expect(member).toBeInstanceOf(Member);
        expect(member.id).toBe("member1");
        expect(member.userId).toBe("user1");
        expect(member.roomId).toBe("room1");
        expect(member.nickname).toBe("Ali");
        expect(member.user).toBeInstanceOf(User);
        expect(member.user?.username).toBe("alice");
        expect(member.roles).toHaveLength(2);
        expect(member.roles[0]).toBeInstanceOf(Role);
        expect(member.roleIds).toEqual(["role1", "role2"]);
        expect(member.joinedAt).toBeInstanceOf(Date);
    });

    test("accepts role ID strings and displayName aliases", () => {
        const member = Member.from({
            id: "member2",
            user,
            displayName: "Alice!",
            roles: ["role1", "role2"],
        });

        expect(member.nickname).toBe("Alice!");
        expect(member.roles).toEqual([]);
        expect(member.roleIds).toEqual(["role1", "role2"]);
        expect(member.user?.id).toBe("user1");
    });

    test("supports member and user ID fallbacks", () => {
        const byMemberId = Member.from({ memberId: "member3" });
        const byUserId = Member.from({ userId: "user3" });

        expect(byMemberId.id).toBe("member3");
        expect(byMemberId.userId).toBe("member3");
        expect(byMemberId.user).toBeNull();
        expect(byUserId.id).toBe("user3");
        expect(byUserId.roleIds).toEqual([]);
    });
});

describe("Invite", () => {
    test("parses invite values and aliases", () => {
        const invite = Invite.from({
            invite: {
                id: "invite1",
                code: "abc123",
                roomId: "room1",
                maxAge: 3600,
                maxUses: 10,
                temporary: true,
                usedCount: 4,
                createdAt: "2026-04-01T00:00:00.000Z",
                expiresAt: "2026-04-02T00:00:00.000Z",
            },
        });

        expect(invite).toBeInstanceOf(Invite);
        expect(invite.id).toBe("invite1");
        expect(invite.code).toBe("abc123");
        expect(invite.roomId).toBe("room1");
        expect(invite.maxAge).toBe(3600);
        expect(invite.maxUses).toBe(10);
        expect(invite.temporary).toBe(true);
        expect(invite.uses).toBe(4);
        expect(invite.createdAt).toBeInstanceOf(Date);
        expect(invite.expiresAt).toBeInstanceOf(Date);
    });

    test("supports invite code fallbacks", () => {
        const invite = Invite.from({ inviteCode: "fallback", temporary: "yes" });

        expect(invite.id).toBe("");
        expect(invite.code).toBe("fallback");
        expect(invite.temporary).toBe(false);
        expect(invite.uses).toBeNull();
    });
});

describe("Thread", () => {
    test("parses thread fields and boolean aliases", () => {
        const thread = Thread.from({
            data: {
                thread: {
                    id: "thread1",
                    laneId: "lane1",
                    roomId: "room1",
                    title: "Planning",
                    ownerId: "user1",
                    type: "PUBLIC",
                    archived: true,
                    locked: true,
                    pinned: true,
                    messageCount: 12,
                    memberCount: 4,
                    createdAt: "2026-05-01T00:00:00.000Z",
                    updatedAt: "2026-05-02T00:00:00.000Z",
                },
            },
        });

        expect(thread).toBeInstanceOf(Thread);
        expect(thread.id).toBe("thread1");
        expect(thread.laneId).toBe("lane1");
        expect(thread.roomId).toBe("room1");
        expect(thread.title).toBe("Planning");
        expect(thread.name).toBe("Planning");
        expect(thread.ownerId).toBe("user1");
        expect(thread.type).toBe("PUBLIC");
        expect(thread.isArchived).toBe(true);
        expect(thread.isLocked).toBe(true);
        expect(thread.isPinned).toBe(true);
        expect(thread.messageCount).toBe(12);
        expect(thread.memberCount).toBe(4);
    });

    test("supports thread delete payloads", () => {
        const thread = Thread.from({ threadId: "thread2" });

        expect(thread.id).toBe("thread2");
        expect(thread.isArchived).toBe(false);
        expect(thread.isLocked).toBe(false);
    });

    test("parses thread members", () => {
        const member = ThreadMember.from({
            member: {
                id: "threadMember1",
                userId: "user1",
                threadId: "thread1",
                user,
                joinedAt: "2026-05-03T00:00:00.000Z",
            },
        });

        expect(member).toBeInstanceOf(ThreadMember);
        expect(member.id).toBe("threadMember1");
        expect(member.userId).toBe("user1");
        expect(member.threadId).toBe("thread1");
        expect(member.user?.displayName).toBe("Alice");
        expect(member.joinedAt).toBeInstanceOf(Date);
    });

    test("falls back to the nested user ID for thread members", () => {
        const member = ThreadMember.from({ user });

        expect(member.id).toBe("user1");
        expect(member.userId).toBe("user1");
        expect(member.threadId).toBeNull();
    });
});

describe("ScheduledEvent", () => {
    test("parses scheduled event fields", () => {
        const event = ScheduledEvent.from({
            event: {
                id: "event1",
                roomId: "room1",
                laneId: "lane1",
                name: "Launch",
                description: "Launch party",
                locationType: "EXTERNAL",
                externalLocation: "https://example.com",
                status: "SCHEDULED",
                scheduledStartAt: "2026-06-01T00:00:00.000Z",
                scheduledEndAt: "2026-06-01T01:00:00.000Z",
                createdAt: "2026-05-20T00:00:00.000Z",
                updatedAt: "2026-05-21T00:00:00.000Z",
            },
        });

        expect(event).toBeInstanceOf(ScheduledEvent);
        expect(event.id).toBe("event1");
        expect(event.roomId).toBe("room1");
        expect(event.laneId).toBe("lane1");
        expect(event.name).toBe("Launch");
        expect(event.description).toBe("Launch party");
        expect(event.locationType).toBe("EXTERNAL");
        expect(event.externalLocation).toBe("https://example.com");
        expect(event.status).toBe("SCHEDULED");
        expect(event.scheduledStartAt).toBeInstanceOf(Date);
        expect(event.scheduledEndAt).toBeInstanceOf(Date);
    });

    test("supports event delete payloads", () => {
        const event = ScheduledEvent.from({ eventId: "event2" });

        expect(event.id).toBe("event2");
        expect(event.name).toBeNull();
    });
});

describe("BotWebhook", () => {
    test("parses webhook fields", () => {
        const webhook = BotWebhook.from({
            webhook: {
                id: "webhook1",
                laneId: "lane1",
                name: "Hook",
                avatarUrl: "https://cdn.test/hook.png",
                webhookUrl: "https://veiled.lol/api/webhooks/1/token",
                token: "secret",
                createdAt: "2026-07-01T00:00:00.000Z",
                updatedAt: "2026-07-02T00:00:00.000Z",
            },
        });

        expect(webhook).toBeInstanceOf(BotWebhook);
        expect(webhook.id).toBe("webhook1");
        expect(webhook.laneId).toBe("lane1");
        expect(webhook.name).toBe("Hook");
        expect(webhook.avatarUrl).toBe("https://cdn.test/hook.png");
        expect(webhook.webhookUrl).toBe("https://veiled.lol/api/webhooks/1/token");
        expect(webhook.token).toBe("secret");
        expect(webhook.createdAt).toBeInstanceOf(Date);
    });

    test("supports webhook delete payloads", () => {
        const webhook = BotWebhook.from({ webhookId: "webhook2" });

        expect(webhook.id).toBe("webhook2");
        expect(webhook.token).toBeNull();
    });
});

describe("Bot identity and gateway", () => {
    test("parses the bot identity and application", () => {
        const identity = BotIdentity.from({
            user,
            application: { id: "app1", name: "Test App", description: "App", icon: "icon.png" },
        });

        expect(identity).toBeInstanceOf(BotIdentity);
        expect(identity.user).toBeInstanceOf(User);
        expect(identity.user?.id).toBe("user1");
        expect(identity.application).toBeInstanceOf(Application);
        expect(identity.application?.id).toBe("app1");
        expect(identity.application?.name).toBe("Test App");
        expect(identity.application?.description).toBe("App");
        expect(identity.application?.icon).toBe("icon.png");
    });

    test("allows missing identity sections", () => {
        const identity = BotIdentity.from({ data: { identity: { application: { id: "app1" } } } });

        expect(identity.user).toBeNull();
        expect(identity.application?.id).toBe("app1");
    });

    test("parses the gateway URL", () => {
        const gateway = BotGateway.from({ gateway: { url: "wss://gateway.test" } });

        expect(gateway).toBeInstanceOf(BotGateway);
        expect(gateway.url).toBe("wss://gateway.test");
    });
});

describe("Voice structures", () => {
    test("parses voice states with aliases", () => {
        const state = VoiceState.from({
            state: {
                id: "user1",
                laneId: "lane1",
                roomId: "room1",
                sessionId: "session1",
                user,
                mute: true,
                deaf: true,
                streaming: true,
                video: true,
            },
        });

        expect(state).toBeInstanceOf(VoiceState);
        expect(state.userId).toBe("user1");
        expect(state.laneId).toBe("lane1");
        expect(state.roomId).toBe("room1");
        expect(state.sessionId).toBe("session1");
        expect(state.user?.username).toBe("alice");
        expect(state.isMuted).toBe(true);
        expect(state.isDeafened).toBe(true);
        expect(state.isStreaming).toBe(true);
        expect(state.isVideo).toBe(true);
    });

    test("parses voice rosters", () => {
        const roster = VoiceRoster.from({
            data: {
                voice: {
                    laneId: "lane1",
                    roomId: "room1",
                    users: [{ userId: "user1" }, { userId: "user2", selfMute: true }],
                },
            },
        });

        expect(roster).toBeInstanceOf(VoiceRoster);
        expect(roster.laneId).toBe("lane1");
        expect(roster.roomId).toBe("room1");
        expect(roster.states).toHaveLength(2);
        expect(roster.states[0]).toBeInstanceOf(VoiceState);
        expect(roster.states[1]?.isMuted).toBe(true);
    });

    test("parses ICE servers from strings and arrays", () => {
        const stringServer = IceServer.from({ urls: "turn:turn.test", username: "u", credential: "c" });
        const response = IceServerResponse.from({
            ice: {
                iceServers: [
                    { urls: ["stun:one.test", "stun:two.test"] },
                    { urls: "turn:turn.test" },
                ],
                ttl: 60,
            },
        });

        expect(stringServer.urls).toEqual(["turn:turn.test"]);
        expect(response).toBeInstanceOf(IceServerResponse);
        expect(response.iceServers).toHaveLength(2);
        expect(response.iceServers[0]).toBeInstanceOf(IceServer);
        expect(response.iceServers[0]?.urls).toEqual(["stun:one.test", "stun:two.test"]);
        expect(response.iceServers[1]?.urls).toEqual(["turn:turn.test"]);
        expect(response.ttl).toBe(60);
    });

    test("parses voice credentials", () => {
        const credentials = VoiceCredentials.from({
            credentials: { username: "turn-user", credential: "turn-pass", urls: "turns:turn.test", ttl: 120 },
        });

        expect(credentials).toBeInstanceOf(VoiceCredentials);
        expect(credentials.username).toBe("turn-user");
        expect(credentials.credential).toBe("turn-pass");
        expect(credentials.urls).toEqual(["turns:turn.test"]);
        expect(credentials.ttl).toBe(120);
    });
});

describe("Misc structures", () => {
    test("parses lane capabilities and filters non-booleans", () => {
        const capabilities = LaneCapabilities.from({
            capabilities: {
                capabilities: { sendMessages: true, attachFiles: false, ignored: "yes" },
                slowmode: 15,
                nextSendAt: "2026-08-01T00:00:00.000Z",
                characterLimit: 4000,
            },
        });

        expect(capabilities).toBeInstanceOf(LaneCapabilities);
        expect(capabilities.capabilities).toEqual({ sendMessages: true, attachFiles: false });
        expect(capabilities.slowmode).toBe(15);
        expect(capabilities.nextSendAt).toBeInstanceOf(Date);
        expect(capabilities.characterLimit).toBe(4000);
    });

    test("parses staged uploads", () => {
        const upload = StagedUpload.from({
            upload: {
                id: "upload1",
                filename: "file.txt",
                contentType: "text/plain",
                size: 12,
                url: "https://cdn.test/file.txt",
            },
        });

        expect(upload).toBeInstanceOf(StagedUpload);
        expect(upload.id).toBe("upload1");
        expect(upload.filename).toBe("file.txt");
        expect(upload.contentType).toBe("text/plain");
        expect(upload.size).toBe(12);
        expect(upload.url).toBe("https://cdn.test/file.txt");
    });

    test("parses reaction users and pages", () => {
        const page = ReactionPage.from({
            reactionsPage: {
                reactions: [
                    { id: "react1", user },
                    { userId: "user2" },
                ],
                count: 9,
            },
        });

        expect(page).toBeInstanceOf(ReactionPage);
        expect(page.reactions).toHaveLength(2);
        expect(page.reactions[0]).toBeInstanceOf(ReactionUser);
        expect(page.reactions[0]?.user?.id).toBe("user1");
        expect(page.reactions[1]?.userId).toBe("user2");
        expect(page.count).toBe(9);
    });

    test("defaults reaction page counts", () => {
        const page = ReactionPage.from({ reactions: [{ id: "react1" }] });

        expect(page.count).toBe(1);
    });

    test("parses member permissions", () => {
        expect(MemberPermissions.from({ permissions: "1024" }).permissions).toBe("1024");
        expect(MemberPermissions.from({ permissions: 1024 }).permissions).toBe(1024);
        expect(MemberPermissions.from({ data: { permissions: ["a", "b"] } }).permissions).toEqual(["a", "b"]);
        expect(MemberPermissions.from({ permissions: null }).permissions).toBeNull();
    });

    test("parses presence updates", () => {
        const presence = Presence.from({
            presence: { userId: "user1", roomId: "room1", status: "online", activities: [{ name: "Test" }], user },
        });

        expect(presence).toBeInstanceOf(Presence);
        expect(presence.userId).toBe("user1");
        expect(presence.roomId).toBe("room1");
        expect(presence.status).toBe("online");
        expect(presence.activities).toEqual([{ name: "Test" }]);
        expect(presence.user?.id).toBe("user1");
    });

    test("parses interactions", () => {
        const interaction = Interaction.from({
            interaction: {
                interaction_id: "interaction1",
                type: 2,
                data: { name: "ping", custom_id: "button1" },
                user,
                member: { id: "member1", userId: "user1" },
                roomId: "room1",
                laneId: "lane1",
                token: "interaction-token",
            },
        });

        expect(interaction).toBeInstanceOf(Interaction);
        expect(interaction.id).toBe("interaction1");
        expect(interaction.type).toBe(2);
        expect(interaction.commandName).toBe("ping");
        expect(interaction.customId).toBe("button1");
        expect(interaction.user?.id).toBe("user1");
        expect(interaction.member).toBeInstanceOf(Member);
        expect(interaction.roomId).toBe("room1");
        expect(interaction.laneId).toBe("lane1");
        expect(interaction.token).toBe("interaction-token");
    });

    test("supports camel-case interaction custom IDs", () => {
        const interaction = Interaction.from({ data: { customId: "button2" } });

        expect(interaction.customId).toBe("button2");
        expect(interaction.commandName).toBeNull();
    });

    test("parses typing events", () => {
        const typing = Typing.from({
            typing: { userId: "user1", laneId: "lane1", roomId: "room1", user, timestamp: "2026-09-01T00:00:00.000Z" },
        });

        expect(typing).toBeInstanceOf(Typing);
        expect(typing.userId).toBe("user1");
        expect(typing.laneId).toBe("lane1");
        expect(typing.roomId).toBe("room1");
        expect(typing.user?.id).toBe("user1");
        expect(typing.createdAt).toBeInstanceOf(Date);
    });

    test("parses reaction events with string and object emoji values", () => {
        const asString = ReactionEvent.from({
            messageId: "message1",
            laneId: "lane1",
            roomId: "room1",
            userId: "user1",
            emoji: "👍",
        });
        const asObject = ReactionEvent.from({
            messageId: "message1",
            emoji: { name: "fire", id: "emoji1" },
        });

        expect(asString).toBeInstanceOf(ReactionEvent);
        expect(asString.messageId).toBe("message1");
        expect(asString.emoji).toBe("👍");
        expect(asString.userId).toBe("user1");
        expect(asObject.emoji).toBe("fire");
    });

    test("parses poll votes", () => {
        const vote = PollVote.from({
            vote: {
                userId: "user1",
                messageId: "message1",
                laneId: "lane1",
                roomId: "room1",
                pollId: "poll1",
                optionId: "option1",
                user,
            },
        });

        expect(vote).toBeInstanceOf(PollVote);
        expect(vote.userId).toBe("user1");
        expect(vote.messageId).toBe("message1");
        expect(vote.laneId).toBe("lane1");
        expect(vote.roomId).toBe("room1");
        expect(vote.pollId).toBe("poll1");
        expect(vote.answerId).toBe("option1");
        expect(vote.user?.id).toBe("user1");
    });

    test("parses join requests", () => {
        const request = JoinRequest.from({
            joinRequest: { id: "request1", roomId: "room1", userId: "user1", status: "PENDING", user },
        });

        expect(request).toBeInstanceOf(JoinRequest);
        expect(request.id).toBe("request1");
        expect(request.roomId).toBe("room1");
        expect(request.userId).toBe("user1");
        expect(request.status).toBe("PENDING");
        expect(request.user?.id).toBe("user1");
    });

    test("parses generic gateway events with nested entities", () => {
        const event = GatewayEvent.from("LANE_REORDER", {
            data: {
                room: { id: "room1" },
                lane: { id: "lane1" },
                message: { id: "message1", laneId: "lane1", content: "hello" },
                member: { id: "member1", userId: "user1" },
                user,
                role: { id: "role1" },
                roles: [{ id: "role1" }, { id: "role2" }],
                lanes: [{ id: "lane1" }, { id: "lane2" }],
                thread: { id: "thread1" },
                threadMember: { id: "threadMember1" },
                invite: { id: "invite1", code: "code1" },
                webhook: { id: "webhook1" },
                scheduledEvent: { id: "event1" },
                interaction: { id: "interaction1" },
                presence: { userId: "user1" },
                typing: { userId: "user1" },
                reaction: { userId: "user1", emoji: "👍" },
                pollVote: { userId: "user1", answerId: "answer1" },
                users: [{ userId: "user1" }, { userId: "user2" }],
            },
        });

        expect(event).toBeInstanceOf(GatewayEvent);
        expect(event.name).toBe("LANE_REORDER");
        expect(event.data).toEqual({});
        expect(event.room).toBeInstanceOf(Room);
        expect(event.lane).toBeInstanceOf(Lane);
        expect(event.message).toBeInstanceOf(Message);
        expect(event.member).toBeInstanceOf(Member);
        expect(event.user).toBeInstanceOf(User);
        expect(event.role).toBeInstanceOf(Role);
        expect(event.roles).toHaveLength(2);
        expect(event.lanes).toHaveLength(2);
        expect(event.thread).toBeInstanceOf(Thread);
        expect(event.threadMember).toBeInstanceOf(ThreadMember);
        expect(event.invite).toBeInstanceOf(Invite);
        expect(event.webhook).toBeInstanceOf(BotWebhook);
        expect(event.scheduledEvent).toBeInstanceOf(ScheduledEvent);
        expect(event.interaction).toBeInstanceOf(Interaction);
        expect(event.presence).toBeInstanceOf(Presence);
        expect(event.typing).toBeInstanceOf(Typing);
        expect(event.reaction).toBeInstanceOf(ReactionEvent);
        expect(event.pollVote).toBeInstanceOf(PollVote);
        expect(event.voiceStates).toHaveLength(2);
        expect(event.voiceStates[0]).toBeInstanceOf(VoiceState);
    });

    test("leaves absent optional gateway entities null", () => {
        const event = GatewayEvent.from("LANE_REORDER", {});

        expect(event.room).toBeNull();
        expect(event.lane).toBeNull();
        expect(event.message).toBeNull();
        expect(event.roles).toEqual([]);
        expect(event.voiceStates).toEqual([]);
    });
});

describe("Message gateway normalization", () => {
    test("normalizes message create payloads", () => {
        const message = Message.fromUnknown({
            message: {
                messageId: "message1",
                channelId: "lane1",
                content: "hello",
                author: user,
                edited: true,
                pinned: true,
                createdAt: "2026-10-01T00:00:00.000Z",
            },
        });

        expect(message).toBeInstanceOf(Message);
        expect(message.id).toBe("message1");
        expect(message.laneId).toBe("lane1");
        expect(message.content).toBe("hello");
        expect(message.userId).toBe("user1");
        expect(message.author.username).toBe("alice");
        expect(message.isEdited).toBe(true);
        expect(message.isPinned).toBe(true);
        expect(message.createdAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
        expect(message.updatedAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    });

    test("normalizes snake-case channel IDs and missing values", () => {
        const message = Message.fromUnknown({ message: { channel_id: "lane2" } });

        expect(message.id).toBe("");
        expect(message.laneId).toBe("lane2");
        expect(message.content).toBe("");
        expect(message.userId).toBe("");
        expect(message.isEdited).toBe(false);
        expect(message.isPinned).toBe(false);
        expect(message.publishedToRooms).toEqual([]);
    });

    test("recursively normalizes reply messages", () => {
        const message = Message.fromUnknown({
            message: {
                id: "message2",
                laneId: "lane1",
                content: "reply",
                replyTo: { id: "message1", laneId: "lane1", content: "original" },
            },
        });

        expect(message.replyTo).toBeInstanceOf(Message);
        expect(message.replyTo?.id).toBe("message1");
        expect(message.replyTo?.content).toBe("original");
    });
});

const parserCases: Array<[GatewayEventName, unknown, Function]> = [
    [GatewayEvents.ROOM_CREATE, { id: "room1" }, Room],
    [GatewayEvents.ROOM_UPDATE, { id: "room1" }, Room],
    [GatewayEvents.ROOM_DELETE, { roomId: "room1" }, Room],
    [GatewayEvents.BOT_ROOM_ADD, { id: "room1" }, Room],
    [GatewayEvents.BOT_ROOM_REMOVE, { id: "room1" }, Room],
    [GatewayEvents.LANE_CREATE, { id: "lane1" }, Lane],
    [GatewayEvents.LANE_UPDATE, { id: "lane1" }, Lane],
    [GatewayEvents.LANE_DELETE, { laneId: "lane1" }, Lane],
    [GatewayEvents.ROLE_CREATE, { id: "role1" }, Role],
    [GatewayEvents.ROLE_UPDATE, { id: "role1" }, Role],
    [GatewayEvents.ROLE_DELETE, { roleId: "role1" }, Role],
    [GatewayEvents.MEMBER_JOIN, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_LEAVE, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_ROLE_ADD, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_ROLE_REMOVE, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_BAN, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_UNBAN, { id: "member1" }, Member],
    [GatewayEvents.MEMBER_TIMEOUT, { id: "member1" }, Member],
    [GatewayEvents.ROOM_JOIN_REQUEST_UPDATE, { id: "request1" }, JoinRequest],
    [GatewayEvents.PRESENCE_UPDATE, { userId: "user1" }, Presence],
    [GatewayEvents.MESSAGE_CREATE, { id: "message1" }, Message],
    [GatewayEvents.MESSAGE_UPDATE, { id: "message1" }, Message],
    [GatewayEvents.MESSAGE_DELETE, { messageId: "message1" }, Message],
    [GatewayEvents.DM_MESSAGE_CREATE, { id: "message1" }, Message],
    [GatewayEvents.MENTION_NOTIFY, { id: "message1" }, Message],
    [GatewayEvents.MESSAGE_REACTION_ADD, { userId: "user1" }, ReactionEvent],
    [GatewayEvents.MESSAGE_REACTION_REMOVE, { userId: "user1" }, ReactionEvent],
    [GatewayEvents.DM_MESSAGE_REACTION_ADD, { userId: "user1" }, ReactionEvent],
    [GatewayEvents.DM_MESSAGE_REACTION_REMOVE, { userId: "user1" }, ReactionEvent],
    [GatewayEvents.TYPING_START, { userId: "user1" }, Typing],
    [GatewayEvents.THREAD_CREATE, { id: "thread1" }, Thread],
    [GatewayEvents.THREAD_UPDATE, { id: "thread1" }, Thread],
    [GatewayEvents.THREAD_DELETE, { threadId: "thread1" }, Thread],
    [GatewayEvents.THREAD_MEMBER_ADD, { userId: "user1" }, ThreadMember],
    [GatewayEvents.THREAD_MEMBER_REMOVE, { userId: "user1" }, ThreadMember],
    [GatewayEvents.INVITE_CREATE, { id: "invite1" }, Invite],
    [GatewayEvents.INVITE_UPDATE, { id: "invite1" }, Invite],
    [GatewayEvents.INVITE_DELETE, { id: "invite1" }, Invite],
    [GatewayEvents.WEBHOOK_CREATE, { id: "webhook1" }, BotWebhook],
    [GatewayEvents.WEBHOOK_UPDATE, { id: "webhook1" }, BotWebhook],
    [GatewayEvents.WEBHOOK_DELETE, { webhookId: "webhook1" }, BotWebhook],
    [GatewayEvents.POLL_VOTE_ADD, { userId: "user1" }, PollVote],
    [GatewayEvents.POLL_VOTE_REMOVE, { userId: "user1" }, PollVote],
    [GatewayEvents.VOICE_ROSTER_UPDATE, { laneId: "lane1" }, VoiceRoster],
    [GatewayEvents.SCHEDULED_EVENT_UPDATE, { id: "event1" }, ScheduledEvent],
    [GatewayEvents.INTERACTION_CREATE, { id: "interaction1" }, Interaction],
];

describe("parseGatewayEvent", () => {
    for (const [name, payload, structure] of parserCases) {
        test(`parses ${name}`, () => {
            const parsed = parseGatewayEvent(name, payload as RawGatewayEvent);

            expect(parsed).toBeInstanceOf(structure);
            expect(parsed.raw).toBeDefined();
        });
    }

    test("falls back to a generic GatewayEvent for untyped events", () => {
        const parsed = parseGatewayEvent(GatewayEvents.LANE_REORDER, {
            data: { room: { id: "room1" } },
        } as RawGatewayEvent);

        expect(parsed).toBeInstanceOf(GatewayEvent);
        expect((parsed as GatewayEvent).name).toBe("LANE_REORDER");
        expect((parsed as GatewayEvent).room?.id).toBe("room1");
    });

    test("preserves the raw payload for every parsed structure", () => {
        const payload = { lane: { id: "lane1", name: "general" } };
        const parsed = parseGatewayEvent(GatewayEvents.LANE_UPDATE, payload as RawGatewayEvent);

        expect(parsed.raw).toEqual({ id: "lane1", name: "general" });
    });
});
