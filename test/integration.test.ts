import { describe, expect, test } from "bun:test";
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    Message,
    WebhookClient,
    WebhookMessageBuilder,
} from "../src";

const webhookUrl = Bun.env.WEBHOOK_URL;

describe("Webhook integration", () => {
    test.skipIf(!webhookUrl)("sends a real message using every field", async () => {
        if (!webhookUrl) {
            throw new Error("WEBHOOK_URL is required");
        }

        const timestamp = new Date();
        const content = `Webhook integration test ${timestamp.toISOString()}`;
        const title = "Webhook integration test";

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription([
                "**Bold**, *italic*, ~~strikethrough~~, and `inline code`.",
                "",
                "> Blockquote",
                "",
                "- List item one",
                "- List item two",
                "",
                "[Example](https://example.com)",
                "",
                "```ts",
                "const client = new WebhookClient(url);",
                "```",
            ].join("\n"))
            .setUrl("https://example.com")
            .setColor(0x949BA4)
            .setAuthor(
                "Integration Test",
                "https://example.com",
                "https://picsum.photos/seed/integration-author/64/64"
            )
            .setThumbnail("https://picsum.photos/seed/integration-thumbnail/256/256")
            .setImage("https://picsum.photos/seed/integration-image/1200/630")
            .addField(
                "**Inline field A**",
                "**Bold**, *italic*, ~~strikethrough~~, `code`, and [Example](https://example.com).",
                true
            )
            .addField(
                "*Inline field B*",
                "**Bold value** with `inline: true`.",
                true
            )
            .addField(
                "**Non-inline field**",
                "**Bold**\n*Italic*\n~~Strikethrough~~\n`code`\n[Example](https://example.com)\n`inline: false`",
                false
            )
            .setFooter(
                "Automated integration test",
                "https://picsum.photos/seed/integration-footer/64/64"
            )
            .setTimestamp(timestamp);

        const components = new ActionRowBuilder()
            .addLinkButton("View example", "https://example.com")
            .addButton(ButtonBuilder.primary("Primary", "primary-id"))
            .addButton(ButtonBuilder.secondary("Secondary", "secondary-id").setDisabled())
            .addButton(ButtonBuilder.success("Success", "success-id"))
            .addButton(ButtonBuilder.danger("Danger", "danger-id"));

        const client = new WebhookClient(webhookUrl);
        const message = await client.send(
            new WebhookMessageBuilder()
                .setUsername("Webhook Integration Test")
                .setAvatarUrl("https://picsum.photos/seed/integration-avatar/128/128")
                .setContent(content)
                .addEmbed(embed)
                .addActionRow(components)
        );

        expect(message).toBeInstanceOf(Message);
        expect(message.id).toBeTruthy();
        expect(message.content).toBe(content);
        expect(message.embeds).toHaveLength(1);
        expect(message.embeds[0]?.title).toBe(title);
        expect(message.embeds[0]?.author?.name).toBe("Integration Test");
        expect(message.embeds[0]?.footer?.text).toBe("Automated integration test");
        expect(message.embeds[0]?.fields).toHaveLength(3);
    });
});
