import { describe, expect, test } from "bun:test";
import {
    BotAPIError,
    BotClient,
    BotIdentity,
    BotREST,
    DEFAULT_API_BASE_URL,
    createContainer,
    isValidContainerPayload,
} from "../src";
import type { FetchLike } from "../src";

interface CapturedRequest {
    url: URL;
    method: string;
    headers: Headers;
    body: unknown;
}

function createREST(responseBody: unknown = { ok: true }) {
    const requests: CapturedRequest[] = [];
    const fetchImpl: FetchLike = async (input, init) => {
        const headers = new Headers(init?.headers);
        let body: unknown = init?.body;

        if (typeof body === "string") {
            try {
                body = JSON.parse(body) as unknown;
            } catch {
                // Keep non-JSON string bodies as-is.
            }
        }

        requests.push({
            url: new URL(String(input)),
            method: init?.method ?? "GET",
            headers,
            body,
        });

        return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };

    return {
        rest: new BotREST({
            token: "Bot sample-token",
            baseUrl: "https://api.example.test/api/v1",
            fetchImpl,
        }),
        requests,
    };
}

describe("BotREST transport", () => {
    test("uses bot auth, keeps paths scoped, and serializes JSON bodies", async () => {
        const identityResponse = {
            user: {
                id: "bot",
                username: "bot",
                avatar: null,
                displayName: "Bot",
            },
            application: { id: "application" },
        };
        const { rest, requests } = createREST(identityResponse);
        const identity = await rest.getMe();

        expect(identity).toBeInstanceOf(BotIdentity);
        expect(identity?.raw).toEqual(identityResponse);
        expect(identity?.user?.id).toBe("bot");
        expect(identity?.application?.id).toBe("application");
        expect(requests[0]?.url.href).toBe("https://api.example.test/api/v1/bots/@me");
        expect(requests[0]?.method).toBe("GET");
        expect(requests[0]?.headers.get("Authorization")).toBe("Bot sample-token");

        await rest.request("/bots/@me", {
            method: "POST",
            body: { hello: "world" },
        });

        expect(requests[1]?.method).toBe("POST");
        expect(requests[1]?.headers.get("Content-Type")).toBe("application/json");
        expect(requests[1]?.body).toEqual({ hello: "world" });

        await expect(rest.request("https://attacker.test/steal")).rejects.toThrow(TypeError);
        await expect(rest.request("../../outside")).rejects.toThrow(TypeError);
    });

    test("encodes identifiers and builds query strings", async () => {
        const { rest, requests } = createREST({ members: [] });

        await rest.getMembers("room/one", {
            limit: 10,
            after: ["a", "b"],
            ignored: undefined,
        });
        await rest.getMessages("lane one", "limit=5");

        expect(requests[0]?.url.pathname).toBe("/api/v1/rooms/room%2Fone/members");
        expect(requests[0]?.url.searchParams.get("limit")).toBe("10");
        expect(requests[0]?.url.searchParams.getAll("after")).toEqual(["a", "b"]);
        expect(requests[0]?.url.searchParams.has("ignored")).toBe(false);
        expect(requests[1]?.url.pathname).toBe("/api/v1/lanes/lane%20one/messages");
        expect(requests[1]?.url.search).toBe("?limit=5");
    });

    test("uses the default API base URL", () => {
        const rest = new BotREST({ token: "token" });

        expect(rest).toBeInstanceOf(BotREST);
        expect(DEFAULT_API_BASE_URL).toBe("https://veiled.lol/api/v1");
    });

    test("rejects invalid configuration", () => {
        expect(() => new BotREST({ token: "" })).toThrow(TypeError);
        expect(() => new BotREST({ token: "Bot" })).toThrow(TypeError);
        expect(() => new BotREST({ token: "token", baseUrl: "not a url" })).toThrow(TypeError);
        expect(() => new BotREST({ token: "token", baseUrl: "ftp://api.example.test" })).toThrow(TypeError);
        expect(() => new BotREST({ token: "token", timeoutMs: 0 })).toThrow(RangeError);
    });
});

describe("Container payloads", () => {
    test("builds and validates CV2 container payloads", () => {
        const components = createContainer({
            title: "Build finished",
            description: "Deployment is live.",
            sections: [
                { divider: true, content: "Status: **ready**" },
            ],
            footer: "veiled.js",
            accentColor: 0x5865f2,
            linkButtons: [{ label: "Open", url: "https://example.com" }],
        });

        expect(isValidContainerPayload(components)).toBe(true);
        expect(components[0]?.type).toBe(17);
        expect(components[0]?.accent_color).toBe(0x5865f2);
        expect(components[0]?.components.map((component) => component.type)).toEqual([
            10,
            10,
            14,
            10,
            14,
            10,
            1,
        ]);
    });

    test("validates text, links, and invalid roots", () => {
        expect(() => createContainer({ title: "x".repeat(4001) })).toThrow(RangeError);
        expect(() => createContainer({
            title: "Bad link",
            linkButtons: [{ label: "Bad", url: "javascript:alert(1)" }],
        })).toThrow(TypeError);
        expect(isValidContainerPayload([{ type: 1, components: [] }])).toBe(false);
    });
});

describe("BotREST routes", () => {
    test("covers bot, room, member, and role routes", async () => {
        const { rest, requests } = createREST();

        await rest.getMyRooms();
        await rest.getBotRooms();
        await rest.getGateway();
        await rest.leaveRoom("room1");
        await rest.getRoom("room1");
        await rest.getLanes("room1");
        await rest.getLane("lane1");
        await rest.getLaneCapabilities("lane1");
        await rest.getMembers("room1");
        await rest.getRoomRoles("room1");
        await rest.getRoleMembers("room1", "role1");
        await rest.getMemberRoles("room1", "user1");
        await rest.getMemberPermissions("room1", "user1");
        await rest.createRole("room1", { name: "Helpers" });
        await rest.assignRole("room1", "user1", "role1");
        await rest.removeRole("room1", "user1", "role1");
        await rest.reorderRoles("room1", [{ roleId: "role1", position: 2 }]);
        await rest.updateRole("role1", { name: "Helpers+" });
        await rest.deleteRole("role1");

        expect(requests.map(({ url, method }) => [url.pathname, method])).toEqual([
            ["/api/v1/bots/@me/rooms", "GET"],
            ["/api/v1/bots/@me/rooms", "GET"],
            ["/api/v1/bots/gateway", "GET"],
            ["/api/v1/bots/@me/rooms/room1", "DELETE"],
            ["/api/v1/rooms/room1", "GET"],
            ["/api/v1/rooms/room1/lanes", "GET"],
            ["/api/v1/lanes/lane1", "GET"],
            ["/api/v1/lanes/lane1/capabilities", "GET"],
            ["/api/v1/rooms/room1/members", "GET"],
            ["/api/v1/rooms/room1/roles", "GET"],
            ["/api/v1/rooms/room1/roles/role1/members", "GET"],
            ["/api/v1/rooms/room1/members/user1/roles", "GET"],
            ["/api/v1/rooms/room1/members/user1/permissions", "GET"],
            ["/api/v1/rooms/room1/roles", "POST"],
            ["/api/v1/rooms/room1/members/user1/roles/role1", "PUT"],
            ["/api/v1/rooms/room1/members/user1/roles/role1", "DELETE"],
            ["/api/v1/rooms/room1/roles/reorder", "PUT"],
            ["/api/v1/roles/role1", "PATCH"],
            ["/api/v1/roles/role1", "DELETE"],
        ]);
        expect(requests[13]?.body).toEqual({ name: "Helpers" });
        expect(requests[14]?.body).toEqual({});
        expect(requests[16]?.body).toEqual({ positions: [{ roleId: "role1", position: 2 }] });
    });

    test("covers moderation routes", async () => {
        const { rest, requests } = createREST();

        await rest.kickMember("room1", "user1", "spam");
        await rest.banMember("room1", "user1", { reason: "spam" });
        await rest.unbanMember("room1", "user1");
        await rest.timeoutMember("room1", "user1", 600, "cool off");
        await rest.removeMemberTimeout("room1", "user1");

        expect(requests.map(({ url, method }) => [url.pathname, method])).toEqual([
            ["/api/v1/rooms/room1/members/user1", "DELETE"],
            ["/api/v1/rooms/room1/bans/user1", "PUT"],
            ["/api/v1/rooms/room1/bans/user1", "DELETE"],
            ["/api/v1/rooms/room1/timeouts", "POST"],
            ["/api/v1/rooms/room1/timeouts/user1", "DELETE"],
        ]);
        expect(requests[0]?.body).toEqual({ reason: "spam" });
        expect(requests[1]?.body).toEqual({ reason: "spam" });
        expect(requests[3]?.body).toEqual({
            userId: "user1",
            duration: 600,
            reason: "cool off",
        });
    });

    test("covers message, reaction, pin, and polling routes", async () => {
        const { rest, requests } = createREST();

        await rest.getMessages("lane1", "limit=5");
        await rest.sendMessage("lane1", { content: "hello" });
        await rest.sendTyping("lane1");
        await rest.editMessage("message1", { content: "edited" });
        await rest.deleteMessage("message1");
        await rest.addReaction("message1", "custom:emoji");
        await rest.removeReaction("message1", "custom:emoji");
        await rest.removeUserReaction("message1", "custom:emoji", "user1");
        await rest.getReactions("message1", "custom:emoji", { limit: 5, after: "reaction1" });
        await rest.getPins("lane1");
        await rest.pinMessage("message1");
        await rest.unpinMessage("message1");
        await rest.createPoll("lane1", {
            question: "Favorite?",
            options: ["A", "B"],
            replyToId: "message2",
        });

        expect(requests.map(({ url, method }) => [url.pathname, url.search, method])).toEqual([
            ["/api/v1/lanes/lane1/messages", "?limit=5", "GET"],
            ["/api/v1/lanes/lane1/messages", "", "POST"],
            ["/api/v1/lanes/lane1/typing", "", "POST"],
            ["/api/v1/messages/message1", "", "PATCH"],
            ["/api/v1/messages/message1", "", "DELETE"],
            ["/api/v1/messages/message1/reactions", "", "POST"],
            ["/api/v1/messages/message1/reactions/custom%3Aemoji", "", "DELETE"],
            ["/api/v1/messages/message1/reactions/custom%3Aemoji/users/user1", "", "DELETE"],
            [
                "/api/v1/messages/message1/reactions/custom%3Aemoji",
                "?limit=5&after=reaction1",
                "GET",
            ],
            ["/api/v1/lanes/lane1/pins", "", "GET"],
            ["/api/v1/messages/message1/pin", "", "POST"],
            ["/api/v1/messages/message1/pin", "", "DELETE"],
            ["/api/v1/lanes/lane1/messages", "", "POST"],
        ]);
        expect(requests[1]?.body).toEqual({ content: "hello" });
        expect(requests[5]?.body).toEqual({ emoji: "custom:emoji" });

        const poll = requests[12]?.body as { content: string; replyToId: string };
        expect(poll.replyToId).toBe("message2");
        expect(JSON.parse(poll.content.slice("[POLL_DATA]".length))).toMatchObject({
            question: "Favorite?",
            options: ["A", "B"],
            durationHours: 24,
            allowMultiselect: false,
        });
        expect(() => rest.createPoll("lane1", {
            question: "q",
            options: ["only one"],
        })).toThrow(/2–10 options/);
    });

    test("covers thread routes", async () => {
        const { rest, requests } = createREST();

        await rest.getLaneThreads("lane1", "limit=20");
        await rest.getJoinedThreads("room1");
        await rest.createThread("lane1", { title: "Bug report" });
        await rest.getThread("thread1");
        await rest.updateThread("thread1", { title: "Updated" });
        await rest.deleteThread("thread1");
        await rest.getThreadMessages("thread1", "limit=10");
        await rest.sendThreadMessage("thread1", "hello");
        await rest.getThreadMembers("thread1");
        await rest.addThreadMember("thread1", "user1");
        await rest.removeThreadMember("thread1", "user1");
        await rest.archiveThread("thread1");
        await rest.unarchiveThread("thread1");
        await rest.lockThread("thread1");
        await rest.unlockThread("thread1");
        await rest.pinThread("thread1");
        await rest.publishThread("thread1");

        expect(requests.map(({ url, method }) => [url.pathname, url.search, method])).toEqual([
            ["/api/v1/lanes/lane1/threads", "?limit=20", "GET"],
            ["/api/v1/rooms/room1/threads/joined", "", "GET"],
            ["/api/v1/lanes/lane1/threads", "", "POST"],
            ["/api/v1/threads/thread1", "", "GET"],
            ["/api/v1/threads/thread1", "", "PATCH"],
            ["/api/v1/threads/thread1", "", "DELETE"],
            ["/api/v1/threads/thread1/messages", "?limit=10", "GET"],
            ["/api/v1/threads/thread1/messages", "", "POST"],
            ["/api/v1/threads/thread1/members", "", "GET"],
            ["/api/v1/threads/thread1/members", "", "POST"],
            ["/api/v1/threads/thread1/members/user1", "", "DELETE"],
            ["/api/v1/threads/thread1/archive", "", "POST"],
            ["/api/v1/threads/thread1/unarchive", "", "POST"],
            ["/api/v1/threads/thread1/lock", "", "POST"],
            ["/api/v1/threads/thread1/unlock", "", "POST"],
            ["/api/v1/threads/thread1/pin", "", "POST"],
            ["/api/v1/threads/thread1/publish", "", "POST"],
        ]);
        expect(requests[7]?.body).toEqual({ content: "hello" });
        expect(requests[9]?.body).toEqual({ userId: "user1" });
    });

    test("covers invite and scheduled-event routes", async () => {
        const { rest, requests } = createREST();

        await rest.createInvite("room1", { maxAge: 3600 }, "invite-request-1");
        await rest.getInvite("invite-code");
        await rest.getRoomInvites("room1");
        await rest.updateInvite("invite-code", { maxAge: 7200 });
        await rest.revokeInvite("invite-code");
        await rest.getScheduledEvents("room1", "limit=10");
        await rest.getScheduledEvent("event1");
        await rest.createScheduledEvent("room1", { name: "Release", laneId: "lane1" });
        await rest.updateScheduledEvent("event1", { name: "Updated" }, "SERIES");
        await rest.cancelScheduledEvent("event1");
        await rest.setEventRsvp("event1", "GOING");
        await rest.removeEventRsvp("event1");

        expect(requests.map(({ url, method }) => [url.pathname, url.search, method])).toEqual([
            ["/api/v1/rooms/room1/invites", "", "POST"],
            ["/api/v1/invites/invite-code", "", "GET"],
            ["/api/v1/rooms/room1/invites", "", "GET"],
            ["/api/v1/invites/invite-code", "", "PATCH"],
            ["/api/v1/invites/invite-code", "", "DELETE"],
            ["/api/v1/rooms/room1/events", "?limit=10", "GET"],
            ["/api/v1/events/event1", "", "GET"],
            ["/api/v1/rooms/room1/events", "", "POST"],
            ["/api/v1/events/event1", "?scope=SERIES", "PATCH"],
            ["/api/v1/events/event1", "?scope=OCCURRENCE", "DELETE"],
            ["/api/v1/events/event1/rsvp", "", "PUT"],
            ["/api/v1/events/event1/rsvp", "", "DELETE"],
        ]);
        expect(requests[0]?.headers.get("Idempotency-Key")).toBe("invite-request-1");
        expect(requests[10]?.body).toEqual({ status: "GOING" });
    });

    test("sends container messages and file-backed containers", async () => {
        const requests: CapturedRequest[] = [];
        let uploadCount = 0;
        const fetchImpl: FetchLike = async (input, init) => {
            const url = new URL(String(input));
            const headers = new Headers(init?.headers);
            let body: unknown = init?.body;

            if (typeof body === "string") {
                try {
                    body = JSON.parse(body) as unknown;
                } catch {
                    // Keep non-JSON string bodies as-is.
                }
            }

            requests.push({
                url,
                method: init?.method ?? "GET",
                headers,
                body,
            });

            if (url.pathname.endsWith("/uploads/staged")) {
                uploadCount += 1;
                return new Response(JSON.stringify({ id: `upload_${uploadCount}` }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ id: "message1" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        };
        const rest = new BotREST({ token: "token", fetchImpl });

        await rest.sendContainer("lane1", {
            title: "Hello",
            description: "Container body",
        }, { replyToId: "message0" });
        const result = await rest.sendContainerWithFiles("lane1", {
            title: "Files",
        }, [
            new Uint8Array([1, 2, 3]),
            {
                data: new Uint8Array([4, 5, 6]),
                filename: "report.txt",
                contentType: "text/plain",
            },
        ]);

        expect(requests[0]?.url.pathname).toBe("/api/v1/lanes/lane1/messages");
        expect(requests[0]?.body).toMatchObject({
            replyToId: "message0",
            components: [{ type: 17 }],
        });
        expect(requests[1]?.body).toBeInstanceOf(FormData);
        expect(requests[2]?.body).toBeInstanceOf(FormData);
        expect(requests[3]?.body).toMatchObject({
            components: [{ type: 17 }],
            stagedUploadIds: ["upload_1", "upload_2"],
        });
        expect(result.uploads.map((upload) => upload?.id)).toEqual(["upload_1", "upload_2"]);
    });

    test("covers voice, upload, webhook, and interaction routes", async () => {
        const { rest, requests } = createREST();

        await rest.getVoiceStates("lane1");
        await rest.joinVoice("lane1", "session1");
        await rest.leaveVoice("lane1");
        await rest.getVoiceIceServers("lane1");
        await rest.getVoiceTurnCredentials();
        await rest.stageUpload(new Uint8Array([1, 2, 3]), {
            filename: "report.txt",
            contentType: "text/plain",
            description: "Report",
        });
        await rest.getLaneWebhooks("lane1");
        await rest.getWebhook("webhook1");
        await rest.createWebhook("lane1", { name: "Notify" });
        await rest.updateWebhook("webhook1", { name: "Updated" });
        await rest.resetWebhookToken("webhook1");
        await rest.deleteWebhook("webhook1");
        await rest.respondToInteraction("interaction1", { type: "defer" });
        await rest.respondToCommandInteraction("interaction2", { type: "reply", content: "hi" });
        await rest.getCommandInteractionAttachment("interaction2", "attachment1");

        expect(requests.map(({ url, method }) => [url.pathname, url.search, method])).toEqual([
            ["/api/v1/lanes/lane1/voice-states", "", "GET"],
            ["/api/v1/voice/join", "", "POST"],
            ["/api/v1/voice/leave", "", "POST"],
            ["/api/v1/voice/ice-servers", "?laneId=lane1", "GET"],
            ["/api/v1/voice/turn-credentials", "", "GET"],
            ["/api/v1/uploads/staged", "", "POST"],
            ["/api/v1/lanes/lane1/webhooks", "", "GET"],
            ["/api/v1/webhooks/webhook1", "", "GET"],
            ["/api/v1/lanes/lane1/webhooks", "", "POST"],
            ["/api/v1/webhooks/webhook1", "", "PATCH"],
            ["/api/v1/webhooks/webhook1/token", "", "POST"],
            ["/api/v1/webhooks/webhook1", "", "DELETE"],
            ["/api/v1/interactions/interaction1/callback", "", "POST"],
            ["/api/v1/interactions/commands/interaction2/callback", "", "POST"],
            [
                "/api/v1/interactions/commands/interaction2/attachments/attachment1",
                "",
                "GET",
            ],
        ]);
        expect(requests[1]?.body).toEqual({ laneId: "lane1", sessionId: "session1" });
        expect(requests[5]?.body).toBeInstanceOf(FormData);
        expect((requests[5]?.body as FormData).get("description")).toBe("Report");
        expect(requests[12]?.body).toEqual({ type: "defer" });
    });
});

describe("BotREST errors", () => {
    test("maps API failures to BotAPIError", async () => {
        const fetchImpl: FetchLike = async () => new Response(
            JSON.stringify({ error: "rate limited" }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": "2",
                },
            },
        );
        const rest = new BotREST({ token: "token", fetchImpl });

        try {
            await rest.getMe();
            throw new Error("Expected request to fail");
        } catch (error) {
            expect(error).toBeInstanceOf(BotAPIError);
            expect((error as BotAPIError).status).toBe(429);
            expect((error as BotAPIError).message).toBe("rate limited");
            expect((error as BotAPIError).retryAfter).toBe(2);
            expect((error as BotAPIError).details).toEqual({ error: "rate limited" });
        }
    });

    test("maps network failures to BotAPIError", async () => {
        const fetchImpl: FetchLike = async () => {
            const error = new Error("timed out");
            error.name = "TimeoutError";
            throw error;
        };
        const rest = new BotREST({ token: "token", fetchImpl });

        try {
            await rest.getMe();
            throw new Error("Expected request to fail");
        } catch (error) {
            expect(error).toBeInstanceOf(BotAPIError);
            expect((error as BotAPIError).status).toBe(0);
            expect((error as BotAPIError).message).toContain("timed out");
        }
    });

    test("handles empty responses", async () => {
        const fetchImpl: FetchLike = async () => new Response(null, { status: 204 });
        const rest = new BotREST({ token: "token", fetchImpl });

        await expect(rest.deleteMessage("message1")).resolves.toBeNull();
    });

    test("rejects malformed success payloads", async () => {
        const fetchImpl: FetchLike = async () => new Response("not json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
        const rest = new BotREST({ token: "token", fetchImpl });

        try {
            await rest.getMe();
            throw new Error("Expected request to fail");
        } catch (error) {
            expect(error).toBeInstanceOf(BotAPIError);
            expect((error as BotAPIError).status).toBe(200);
            expect((error as BotAPIError).message).toContain("invalid JSON");
        }
    });
});

describe("BotClient REST", () => {
    test("exposes the same REST client through rest and api", async () => {
        const { rest, requests } = createREST();
        const client = new BotClient({
            token: "secret",
            apiBaseUrl: "https://api.example.test/api/v1",
            fetchImpl: async (input, init) => {
                const url = new URL(String(input));
                requests.push({
                    url,
                    method: init?.method ?? "GET",
                    headers: new Headers(init?.headers),
                    body: init?.body,
                });
                return new Response(JSON.stringify({ user: { id: "bot" } }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            },
        });

        expect(client.api).toBe(client.rest);
        await client.rest.getMe();

        expect(requests[0]?.headers.get("Authorization")).toBe("Bot secret");
        expect(rest).toBeInstanceOf(BotREST);
    });
});
