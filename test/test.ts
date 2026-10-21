import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
    ActionRowBuilder,
    Attachment,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    Embed,
    EmbedBuilder,
    LIMITS,
    Message,
    MessageBuilder,
    Reaction,
    Sticker,
    User,
    WebhookAPIError,
    WebhookClient,
    WebhookInfo,
    WebhookMessage,
    WebhookMessageBuilder,
    WebhookREST,
} from "../src";
import type { RawEmbed, RawMessage, RawUser } from "../src";
import payloadFixture from "./fixtures/webhook-payload.json";
import responseFixture from "./fixtures/webhook-response.json";

const rawMessage = (responseFixture as unknown as { message: RawMessage }).message;
const fixtureTimestamp = new Date("2026-10-21T20:52:12.242Z");

function createRawUser(overrides: Partial<RawUser> = {}): RawUser {
    return {
        id: "user-id",
        username: "user",
        discriminator: "0001",
        avatar: null,
        displayName: "User",
        isBot: false,
        ...overrides,
    };
}

function createRawMessage(overrides: Partial<RawMessage> = {}): RawMessage {
    return {
        id: "message-id",
        laneId: "lane-id",
        userId: "user-id",
        webhookId: null,
        webhookDeliveryId: null,
        webhookUsername: null,
        webhookAvatarUrl: null,
        content: "hello",
        components: [],
        flags: 0,
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        replyToId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        threadId: null,
        stickerId: null,
        isPublished: false,
        originalMessageId: null,
        publishedToRooms: [],
        User: createRawUser(),
        Attachment: [],
        Embed: [],
        Reaction: [],
        Sticker: null,
        embeds: [],
        Webhook: null,
        author: createRawUser(),
        replyTo: null,
        attachments: [],
        ...overrides,
    };
}

function createRawEmbed(overrides: Partial<RawEmbed> = {}): RawEmbed {
    return {
        id: "embed-id",
        messageId: "message-id",
        type: "rich",
        url: "",
        title: null,
        description: null,
        siteName: null,
        imageUrl: null,
        thumbnailUrl: null,
        imageAlt: null,
        imageWidth: null,
        imageHeight: null,
        videoUrl: null,
        videoWidth: null,
        videoHeight: null,
        providerName: null,
        providerUrl: null,
        authorName: null,
        authorUrl: null,
        authorIconUrl: null,
        footerText: null,
        footerIconUrl: null,
        fields: [],
        color: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function buildFixtureEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle("Production deploy succeeded")
        .setDescription("Version `1.2.3` is now live.")
        .setUrl("https://example.com/releases/1.2.3")
        .setColor("#949BA4")
        .setAuthor("Veiled CI", "https://example.com", "https://example.com/ci-icon.png")
        .setThumbnail("https://example.com/thumbnail.png")
        .setImage("https://example.com/deployment-preview.png")
        .addField("Environment", "Production", true)
        .addField("Branch", "main", true)
        .addField("Commit", "abc123")
        .setFooter("Veiled Deployments", "https://example.com/footer-icon.png")
        .setTimestamp(fixtureTimestamp);
}

function buildFixtureActionRow(): ActionRowBuilder {
    return new ActionRowBuilder()
        .addLinkButton("View release", "https://example.com/releases/1.2.3");
}

afterEach(() => {
    mock.restore();
});

describe("EmbedBuilder", () => {
    test("serializes only explicitly set values", () => {
        const embed = new EmbedBuilder()
            .setTitle("Title")
            .setDescription("Description");

        expect(embed.toJSON()).toEqual({
            title: "Title",
            description: "Description",
        });
    });

    test("matches the complete payload fixture", () => {
        const fixtureEmbed = payloadFixture.embeds[0];

        if (!fixtureEmbed) throw new Error("Expected the fixture to contain an embed");

        expect(buildFixtureEmbed().toJSON()).toEqual(fixtureEmbed);
    });

    test("normalizes string and numeric colors", () => {
        expect(new EmbedBuilder().setColor("#949ba4").toJSON().color).toBe("#949BA4");
        expect(new EmbedBuilder().setColor("949ba4").toJSON().color).toBe("#949BA4");
        expect(new EmbedBuilder().setColor(0x949ba4).toJSON().color).toBe("#949BA4");
        expect(new EmbedBuilder().setColor(0x000000).toJSON().color).toBe("#000000");
    });

    test("rejects invalid colors", () => {
        expect(() => new EmbedBuilder().setColor("not-a-color")).toThrow(TypeError);
        expect(() => new EmbedBuilder().setColor("#12345")).toThrow(TypeError);
        expect(() => new EmbedBuilder().setColor(-1)).toThrow(RangeError);
        expect(() => new EmbedBuilder().setColor(0x1000000)).toThrow(RangeError);
        expect(() => new EmbedBuilder().setColor(1.5)).toThrow(RangeError);
    });

    test("normalizes timestamps", () => {
        const fromDate = new EmbedBuilder().setTimestamp(fixtureTimestamp).toJSON();
        const fromString = new EmbedBuilder()
            .setTimestamp("2026-10-21T20:52:12.242Z")
            .toJSON();

        expect(fromDate.timestamp).toBe("2026-10-21T20:52:12.242Z");
        expect(fromString.timestamp).toBe("2026-10-21T20:52:12.242Z");
        expect(() => new EmbedBuilder().setTimestamp("not a date")).toThrow(RangeError);
    });

    test("rejects invalid urls", () => {
        const invalidBuilders = [
            () => new EmbedBuilder().setUrl("not a url"),
            () => new EmbedBuilder().setThumbnail("not a url"),
            () => new EmbedBuilder().setImage("not a url"),
            () => new EmbedBuilder().setAuthor("Author", "not a url"),
            () => new EmbedBuilder().setAuthor("Author", "https://example.com", "not a url"),
            () => new EmbedBuilder().setFooter("Footer", "not a url"),
        ];

        for (const build of invalidBuilders) {
            expect(() => build().toJSON()).toThrow(TypeError);
        }
    });

    test("enforces text limits", () => {
        expect(() =>
            new EmbedBuilder().setTitle("a".repeat(LIMITS.embedTitle + 1)).toJSON()
        ).toThrow(RangeError);

        expect(() =>
            new EmbedBuilder()
                .setDescription("a".repeat(LIMITS.embedDescription + 1))
                .toJSON()
        ).toThrow(RangeError);

        expect(() =>
            new EmbedBuilder()
                .setAuthor("a".repeat(LIMITS.embedAuthorName + 1))
                .toJSON()
        ).toThrow(RangeError);

        expect(() =>
            new EmbedBuilder()
                .setFooter("a".repeat(LIMITS.embedFooterText + 1))
                .toJSON()
        ).toThrow(RangeError);
    });

    test("enforces field limits", () => {
        expect(() =>
            new EmbedBuilder()
                .addField("a".repeat(LIMITS.embedFieldName + 1), "value")
                .toJSON()
        ).toThrow(RangeError);

        expect(() =>
            new EmbedBuilder()
                .addField("name", "a".repeat(LIMITS.embedFieldValue + 1))
                .toJSON()
        ).toThrow(RangeError);

        const embed = new EmbedBuilder();

        for (let index = 0; index < LIMITS.embedFields + 1; index++) {
            embed.addField(`Field ${index}`, "value");
        }

        expect(() => embed.toJSON()).toThrow(RangeError);
    });

    test("adds multiple fields", () => {
        const embed = new EmbedBuilder().addFields(
            { name: "One", value: "1" },
            { name: "Two", value: "2", inline: true }
        );

        expect(embed.toJSON().fields).toEqual([
            { name: "One", value: "1" },
            { name: "Two", value: "2", inline: true },
        ]);
    });

    test("returns defensive clones", () => {
        const builder = new EmbedBuilder().setTitle("Original").addField("Name", "Value");
        const first = builder.toJSON();

        first.title = "Mutated";
        if (first.fields?.[0]) {
            first.fields[0].name = "Mutated";
        }

        expect(builder.toJSON().title).toBe("Original");
        expect(builder.toJSON().fields?.[0]?.name).toBe("Name");
    });
});

describe("ButtonBuilder", () => {
    test("builds link buttons", () => {
        expect(ButtonBuilder.link("View", "https://example.com").toJSON()).toEqual({
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: "View",
            url: "https://example.com",
        });
    });

    test("builds interactive buttons", () => {
        const buttons = [
            [ButtonBuilder.primary("Primary", "primary-id"), ButtonStyle.Primary],
            [ButtonBuilder.secondary("Secondary", "secondary-id"), ButtonStyle.Secondary],
            [ButtonBuilder.success("Success", "success-id"), ButtonStyle.Success],
            [ButtonBuilder.danger("Danger", "danger-id"), ButtonStyle.Danger],
        ] as const;

        for (const [builder, style] of buttons) {
            const json = builder.toJSON();
            expect(json.type).toBe(ComponentType.Button);
            expect(json.style).toBe(style);
            expect(json.custom_id).toBeDefined();
            expect(json.url).toBeUndefined();
        }
    });

    test("supports disabled buttons", () => {
        expect(ButtonBuilder.primary("Disabled", "id").setDisabled().toJSON().disabled).toBe(true);
        expect(ButtonBuilder.primary("Enabled", "id").setDisabled(false).toJSON().disabled).toBe(false);
    });

    test("validates link buttons", () => {
        expect(() => ButtonBuilder.link("View", "not a url").toJSON()).toThrow(TypeError);
    });

    test("validates interactive buttons", () => {
        expect(() => ButtonBuilder.primary("View", "").toJSON()).toThrow(TypeError);
        expect(() =>
            ButtonBuilder.primary("View", "a".repeat(LIMITS.buttonCustomId + 1)).toJSON()
        ).toThrow(RangeError);
        expect(() =>
            ButtonBuilder.primary("a".repeat(LIMITS.buttonLabel + 1), "id").toJSON()
        ).toThrow(RangeError);
    });
});

describe("ActionRowBuilder", () => {
    test("builds action rows in order", () => {
        const row = new ActionRowBuilder()
            .addLinkButton("First", "https://example.com/first")
            .addButton(ButtonBuilder.primary("Second", "second-id"));

        expect(row.toJSON()).toEqual({
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Link,
                    label: "First",
                    url: "https://example.com/first",
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Primary,
                    label: "Second",
                    custom_id: "second-id",
                },
            ],
        });
    });

    test("adds multiple buttons at once", () => {
        const row = new ActionRowBuilder().addButtons(
            ButtonBuilder.primary("First", "first-id"),
            ButtonBuilder.secondary("Second", "second-id")
        );

        expect(row.toJSON().components).toHaveLength(2);
    });

    test("rejects empty action rows", () => {
        expect(() => new ActionRowBuilder().toJSON()).toThrow(RangeError);
    });

    test("enforces the button limit", () => {
        const row = new ActionRowBuilder();

        for (let index = 0; index < LIMITS.buttonsPerRow + 1; index++) {
            row.addButton(ButtonBuilder.primary(`Button ${index}`, `button-${index}`));
        }

        expect(() => row.toJSON()).toThrow(RangeError);
    });
});

describe("MessageBuilder", () => {
    test("serializes content, embeds, and components", () => {
        const message = new MessageBuilder()
            .setContent("Hello")
            .addEmbed(new EmbedBuilder().setTitle("Title"))
            .addActionRow(buildFixtureActionRow())
            .toJSON();

        expect(message).toEqual({
            content: "Hello",
            embeds: [{ title: "Title" }],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Link,
                            label: "View release",
                            url: "https://example.com/releases/1.2.3",
                        },
                    ],
                },
            ],
        });
    });

    test("enforces the content limit", () => {
        expect(() =>
            new MessageBuilder()
                .setContent("a".repeat(LIMITS.content + 1))
                .toJSON()
        ).toThrow(RangeError);
    });

    test("enforces the embed limit", () => {
        const message = new MessageBuilder();

        for (let index = 0; index < LIMITS.embeds + 1; index++) {
            message.addEmbed(new EmbedBuilder().setTitle(`Embed ${index}`));
        }

        expect(() => message.toJSON()).toThrow(RangeError);
    });

    test("enforces the action row limit", () => {
        const message = new MessageBuilder();

        for (let index = 0; index < LIMITS.actionRows + 1; index++) {
            message.addActionRow(buildFixtureActionRow());
        }

        expect(() => message.toJSON()).toThrow(RangeError);
    });

    test("adds multiple embeds and action rows", () => {
        const message = new MessageBuilder()
            .addEmbeds(
                new EmbedBuilder().setTitle("One"),
                new EmbedBuilder().setTitle("Two")
            )
            .addActionRows(buildFixtureActionRow(), buildFixtureActionRow())
            .toJSON();

        expect(message.embeds).toHaveLength(2);
        expect(message.components).toHaveLength(2);
    });

    test("returns defensive clones", () => {
        const builder = new MessageBuilder().setContent("Original").addEmbed(
            new EmbedBuilder().setTitle("Original")
        );
        const first = builder.toJSON();

        first.content = "Mutated";
        if (first.embeds?.[0]) {
            first.embeds[0].title = "Mutated";
        }

        expect(builder.toJSON().content).toBe("Original");
        expect(builder.toJSON().embeds?.[0]?.title).toBe("Original");
    });
});

describe("WebhookMessageBuilder", () => {
    test("matches the complete webhook payload fixture", () => {
        const message = new WebhookMessageBuilder()
            .setUsername("Veiled Deployments")
            .setAvatarUrl("https://example.com/bot-avatar.png")
            .setContent("Deployment finished successfully.")
            .addEmbed(buildFixtureEmbed())
            .addActionRow(buildFixtureActionRow());

        expect(message.toJSON()).toEqual(payloadFixture);
    });

    test("includes webhook metadata only when set", () => {
        expect(new WebhookMessageBuilder().setContent("Hello").toJSON()).toEqual({
            content: "Hello",
        });

        expect(
            new WebhookMessageBuilder()
                .setUsername("Veiled")
                .setAvatarUrl("https://example.com/avatar.png")
                .toJSON()
        ).toEqual({
            username: "Veiled",
            avatar_url: "https://example.com/avatar.png",
        });
    });

    test("validates webhook metadata", () => {
        expect(() =>
            new WebhookMessageBuilder()
                .setUsername("a".repeat(LIMITS.username + 1))
                .toJSON()
        ).toThrow(RangeError);

        expect(() =>
            new WebhookMessageBuilder()
                .setAvatarUrl("not a url")
                .toJSON()
        ).toThrow(TypeError);
    });

    test("returns defensive clones", () => {
        const builder = new WebhookMessageBuilder().setContent("Original");
        const first = builder.toJSON();

        first.content = "Mutated";

        expect(builder.toJSON().content).toBe("Original");
    });

    test("keeps the WebhookMessage alias", () => {
        expect(WebhookMessage).toBe(WebhookMessageBuilder);
    });
});

describe("Message structure", () => {
    test("parses the full webhook response fixture", () => {
        const message = Message.from(rawMessage);

        expect(message).toBeInstanceOf(Message);
        expect(message.id).toBe("clnyxz0b4tvyiouhsgw2kynz30");
        expect(message.laneId).toBe("czdnf7bbfusprj13d6a6mipxmw");
        expect(message.userId).toBe("c2wnybt2n02drae4s7kmt1kdky");
        expect(message.webhookId).toBe("c7p9nj6q9rjljlbzfwfbrr33r5");
        expect(message.webhookDeliveryId).toBeNull();
        expect(message.webhookUsername).toBe("webhook webhook");
        expect(message.webhookAvatarUrl).toBeNull();
        expect(message.content).toBe("text");
        expect(message.components).toEqual([]);
        expect(message.flags).toBe(0);
        expect(message.isEdited).toBe(false);
        expect(message.isDeleted).toBe(false);
        expect(message.isPinned).toBe(false);
        expect(message.replyToId).toBeNull();
        expect(message.threadId).toBeNull();
        expect(message.stickerId).toBeNull();
        expect(message.isPublished).toBe(false);
        expect(message.originalMessageId).toBeNull();
        expect(message.publishedToRooms).toEqual([]);

        expect(message.user).toBeInstanceOf(User);
        expect(message.user.username).toBe("alataq");
        expect(message.user.discriminator).toBe("7934");
        expect(message.user.displayName).toBe("Alataq");

        expect(message.author).toBeInstanceOf(User);
        expect(message.author.username).toBe("webhook webhook");
        expect(message.author.displayName).toBe("webhook webhook");
        expect(message.author.avatarUrl).toBeNull();
        expect(message.author.bot).toBe(true);
        expect(message.author.isWebhook).toBe(true);
        expect(message.author.webhookId).toBe("c7p9nj6q9rjljlbzfwfbrr33r5");

        expect(message.webhook).toBeInstanceOf(WebhookInfo);
        expect(message.webhook?.id).toBe("c7p9nj6q9rjljlbzfwfbrr33r5");
        expect(message.webhook?.name).toBe("webhook webhook");
        expect(message.webhook?.avatarUrl).toBeNull();

        expect(message.embeds).toHaveLength(1);
        const embed = message.embeds[0];

        if (!embed) throw new Error("Expected an embed");

        expect(embed).toBeInstanceOf(Embed);
        expect(embed.id).toBe("cfx7g32aqx0v07gev9ajm2tdca");
        expect(embed.messageId).toBe("clnyxz0b4tvyiouhsgw2kynz30");
        expect(embed.type).toBe("rich");
        expect(embed.url).toBe("");
        expect(embed.title).toBe("test");
        expect(embed.description).toBe("Test");
        expect(embed.color).toBeNull();
        expect(embed.fields).toEqual([]);
        expect(embed.author).toBeNull();
        expect(embed.thumbnail).toBeNull();
        expect(embed.image).toBeNull();
        expect(embed.video).toBeNull();
        expect(embed.provider).toBeNull();
        expect(embed.footer).toBeNull();
        expect(embed.createdAt).toBeInstanceOf(Date);
        expect(embed.createdAt.toISOString()).toBe("2026-10-21T20:52:12.240Z");

        expect(message.attachments).toEqual([]);
        expect(message.reactions).toEqual([]);
        expect(message.sticker).toBeNull();
        expect(message.replyTo).toBeNull();

        expect(message.createdAt).toBeInstanceOf(Date);
        expect(message.updatedAt).toBeInstanceOf(Date);
        expect(message.createdAt.toISOString()).toBe("2026-10-21T20:52:12.242Z");
        expect(message.updatedAt.toISOString()).toBe("2026-10-21T20:52:12.240Z");
        expect(message.raw).toBe(rawMessage);
    });

    test("prefers lowercase embeds when both relations are populated", () => {
        const message = Message.from(createRawMessage({
            embeds: [createRawEmbed({ title: "Lowercase" })],
            Embed: [createRawEmbed({ title: "Uppercase" })],
        }));

        expect(message.embeds[0]?.title).toBe("Lowercase");
    });

    test("falls back to legacy uppercase relation fields", () => {
        const legacyEmbed = createRawEmbed({ title: "Legacy embed" });
        const legacyAttachment = {
            id: "attachment-id",
            url: "https://example.com/file.png",
            filename: "file.png",
            size: 1024,
        };

        const message = Message.from(createRawMessage({
            embeds: [],
            Embed: [legacyEmbed],
            attachments: [],
            Attachment: [legacyAttachment],
        }));

        expect(message.embeds).toHaveLength(1);
        expect(message.embeds[0]?.title).toBe("Legacy embed");
        expect(message.attachments).toHaveLength(1);
        expect(message.attachments[0]?.filename).toBe("file.png");
    });

    test("falls back to User when author is missing", () => {
        const raw = {
            ...createRawMessage(),
            author: undefined,
        } as unknown as RawMessage;

        const message = Message.from(raw);

        expect(message.author.username).toBe(raw.User.username);
        expect(message.author.id).toBe(raw.User.id);
    });

    test("parses nested replies recursively", () => {
        const child = createRawMessage({ id: "child-id" });
        const parent = createRawMessage({
            id: "parent-id",
            replyToId: "child-id",
            replyTo: child,
        });

        const message = Message.from(parent);

        expect(message.replyToId).toBe("child-id");
        expect(message.replyTo).toBeInstanceOf(Message);
        expect(message.replyTo?.id).toBe("child-id");
        expect(message.replyTo?.replyTo).toBeNull();
    });

    test("maps embed author, media, provider, footer, and fields", () => {
        const raw = createRawEmbed({
            url: "https://example.com/embed",
            title: "Title",
            description: "Description",
            siteName: "Site",
            authorName: "Author",
            authorUrl: "https://example.com/author",
            authorIconUrl: "https://example.com/author.png",
            thumbnailUrl: "https://example.com/thumbnail.png",
            imageUrl: "https://example.com/image.png",
            imageAlt: "Alt text",
            imageWidth: 640,
            imageHeight: 480,
            videoUrl: "https://example.com/video.mp4",
            videoWidth: 1280,
            videoHeight: 720,
            providerName: "Provider",
            providerUrl: "https://example.com/provider",
            footerText: "Footer",
            footerIconUrl: "https://example.com/footer.png",
            fields: [
                { name: "Field", value: "Value" },
                { name: "Inline", value: "Yes", inline: true },
            ],
            color: "#123456",
        });

        const embed = Embed.from(raw);

        expect(embed.url).toBe("https://example.com/embed");
        expect(embed.title).toBe("Title");
        expect(embed.description).toBe("Description");
        expect(embed.siteName).toBe("Site");
        expect(embed.color).toBe("#123456");
        expect(embed.author).toEqual({
            name: "Author",
            url: "https://example.com/author",
            iconUrl: "https://example.com/author.png",
        });
        expect(embed.thumbnail).toEqual({
            url: "https://example.com/thumbnail.png",
            alt: "Alt text",
            width: 640,
            height: 480,
        });
        expect(embed.image).toEqual({
            url: "https://example.com/image.png",
            alt: "Alt text",
            width: 640,
            height: 480,
        });
        expect(embed.video).toEqual({
            url: "https://example.com/video.mp4",
            width: 1280,
            height: 720,
        });
        expect(embed.provider).toEqual({
            name: "Provider",
            url: "https://example.com/provider",
        });
        expect(embed.footer).toEqual({
            text: "Footer",
            iconUrl: "https://example.com/footer.png",
        });
        expect(embed.fields).toEqual([
            { name: "Field", value: "Value", inline: false },
            { name: "Inline", value: "Yes", inline: true },
        ]);
    });

    test("maps attachments, reactions, and stickers", () => {
        const rawAttachment = {
            id: "attachment-id",
            url: "https://example.com/file.png",
            filename: "file.png",
            size: 2048,
            contentType: "image/png",
            width: 800,
            height: 600,
        };

        const message = Message.from(createRawMessage({
            attachments: [rawAttachment],
            Attachment: [rawAttachment],
            Reaction: [{ count: 2, emoji: "fire" }],
            Sticker: { id: "sticker-id" },
        }));

        expect(message.attachments).toHaveLength(1);
        expect(message.attachments[0]).toBeInstanceOf(Attachment);
        expect(message.attachments[0]?.contentType).toBe("image/png");
        expect(message.attachments[0]?.width).toBe(800);
        expect(message.attachments[0]?.height).toBe(600);
        expect(message.attachments[0]?.raw).toBe(rawAttachment);

        expect(message.reactions).toHaveLength(1);
        expect(message.reactions[0]).toBeInstanceOf(Reaction);
        expect(message.reactions[0]?.raw).toEqual({ count: 2, emoji: "fire" });

        expect(message.sticker).toBeInstanceOf(Sticker);
        expect(message.sticker?.raw).toEqual({ id: "sticker-id" });
    });
});

describe("User and WebhookInfo structures", () => {
    test("maps bot and webhook user flags", () => {
        const user = User.from(createRawUser({
            bot: true,
            isBot: true,
            isWebhook: true,
            webhookId: "webhook-id",
        }));

        expect(user.bot).toBe(true);
        expect(user.isWebhook).toBe(true);
        expect(user.webhookId).toBe("webhook-id");
    });

    test("defaults missing user values", () => {
        const raw = {
            id: "user-id",
            username: "user",
            avatar: null,
            displayName: "User",
        } as unknown as RawUser;

        const user = User.from(raw);

        expect(user.discriminator).toBeNull();
        expect(user.bot).toBe(false);
        expect(user.isWebhook).toBe(false);
        expect(user.webhookId).toBeNull();
    });

    test("maps webhook info", () => {
        const info = WebhookInfo.from({
            id: "webhook-id",
            name: "Webhook",
            avatarUrl: "https://example.com/avatar.png",
        });

        expect(info.id).toBe("webhook-id");
        expect(info.name).toBe("Webhook");
        expect(info.avatarUrl).toBe("https://example.com/avatar.png");
    });
});

describe("WebhookREST", () => {
    test("posts raw payloads to the configured url", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify(responseFixture), { status: 200 })
        );
        const rest = new WebhookREST(new URL("https://example.com/webhook?wait=true"));
        const result = await rest.execute({ content: "Hello" });

        expect(result.message.id).toBe(rawMessage.id);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        expect(call[0]).toBeInstanceOf(URL);
        expect(call[1]?.method).toBe("POST");
        expect(JSON.parse(String(call[1]?.body))).toEqual({ content: "Hello" });
    });
});

describe("WebhookClient", () => {
    test("rejects invalid webhook urls", () => {
        expect(() => new WebhookClient("not a url")).toThrow("Invalid url");
    });

    test("throws when sending without a url", async () => {
        await expect(new WebhookClient().send("Hello")).rejects.toThrow("Webhook url not set");
    });

    test("sends string messages and parses the response", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify(responseFixture), { status: 200 })
        );
        const client = new WebhookClient("https://example.com/webhook?foo=bar");

        const message = await client.send("Hello");

        expect(message).toBeInstanceOf(Message);
        expect(message.id).toBe(rawMessage.id);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        const [input, init] = call;
        const url = input instanceof URL ? input : new URL(String(input));
        const headers = new Headers(init?.headers);

        expect(url.searchParams.get("foo")).toBe("bar");
        expect(url.searchParams.get("wait")).toBe("true");
        expect(url.searchParams.get("preview")).toBe("true");
        expect(init?.method).toBe("POST");
        expect(headers.get("content-type")).toBe("application/json");
        expect(JSON.parse(String(init?.body))).toEqual({ content: "Hello" });
    });

    test("sends builder messages", async () => {
        const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify(responseFixture), { status: 200 })
        );
        const client = new WebhookClient("https://example.com/webhook");
        const builder = new WebhookMessageBuilder()
            .setUsername("Veiled")
            .setAvatarUrl("https://example.com/avatar.png")
            .setContent("Hello");

        await client.send(builder);

        const call = fetchSpy.mock.calls[0];

        if (!call) throw new Error("Expected fetch to be called");

        expect(JSON.parse(String(call[1]?.body))).toEqual({
            content: "Hello",
            username: "Veiled",
            avatar_url: "https://example.com/avatar.png",
        });
    });

    test("throws WebhookAPIError for non-success responses", async () => {
        spyOn(globalThis, "fetch").mockResolvedValue(
            new Response("bad request", { status: 400 })
        );
        const client = new WebhookClient("https://example.com/webhook");

        try {
            await client.send("Hello");
            throw new Error("Expected send to fail");
        } catch (error) {
            expect(error).toBeInstanceOf(WebhookAPIError);

            const apiError = error as WebhookAPIError;
            expect(apiError.name).toBe("WebhookAPIError");
            expect(apiError.status).toBe(400);
            expect(apiError.body).toBe("bad request");
        }
    });
});
