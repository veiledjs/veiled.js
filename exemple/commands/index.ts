import {
    ActionRowBuilder,
    ButtonBuilder,
    ContainerBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "../../src";
import type { RawContainerPayload } from "../../src";
import { sendContainer } from "../lib/respond";
import { colors } from "../lib/format";
import { coreCommands } from "./core";
import { eventCommands } from "./events";
import { inviteCommands } from "./invites";
import { messageCommands } from "./messages";
import { moderationCommands } from "./moderation";
import { roomCommands } from "./rooms";
import { threadCommands } from "./threads";
import { uploadCommands } from "./uploads";
import { voiceCommands } from "./voice";
import { webhookCommands } from "./webhooks";
import { mergeCommands, withCategory } from "./types";
import type { CommandDefinition, CommandMap } from "./types";

const HELP_PAGE_SIZE = 6;
const MAX_DESCRIPTION_LENGTH = 180;
const HELP_SELECT_ID = "veiled:help:category";
const HELP_HOME_ID = "veiled:help:home";

const categoryLabels: Record<string, string> = {
    core: "Core",
    rooms: "Rooms",
    messages: "Messages",
    moderation: "Moderation",
    threads: "Threads",
    invites: "Invites",
    events: "Events",
    webhooks: "Webhooks",
    voice: "Voice",
    uploads: "Uploads",
    utility: "Utilities",
};

const allCommands = mergeCommands(
    withCategory(coreCommands, "core"),
    withCategory(roomCommands, "rooms"),
    withCategory(messageCommands, "messages"),
    withCategory(moderationCommands, "moderation"),
    withCategory(threadCommands, "threads"),
    withCategory(inviteCommands, "invites"),
    withCategory(eventCommands, "events"),
    withCategory(webhookCommands, "webhooks"),
    withCategory(voiceCommands, "voice"),
    withCategory(uploadCommands, "uploads"),
);

const helpCommand: CommandDefinition = {
    name: "help",
    category: "utility",
    description: "Browse commands with an interactive Components V2 menu.",
    usage: "[command|category]",
    aliases: ["commands"],
    run: async ({ client, laneId, messageId, prefix: commandPrefix, args }) => {
        const requested = args.trim().toLowerCase().replace(/^[!./]/, "") || "home";
        const command = resolveCommand(requested);

        if (command && requested !== "home" && requested !== "all") {
            const aliases = command.aliases?.length
                ? command.aliases.map((alias) => `\`${commandPrefix}${alias}\``).join(", ")
                : "none";

            await sendContainer(client, laneId, {
                title: `${commandPrefix}${command.name}`,
                description: command.description,
                sections: [
                    { divider: true, content: `**Usage**\n\`${commandPrefix}${command.usage}\`` },
                    { content: `**Category**\n${humanizeCategory(command.category ?? "other")}\n\n**Aliases**\n${aliases}` },
                ],
                footer: `Use ${commandPrefix}help to browse every command`,
                accentColor: colors.brand,
            }, { replyToId: messageId });

            return;
        }

        const category = requested === "all" || getCategories().includes(requested)
            ? requested
            : "home";

        await client.rest.sendMessage(laneId, {
            components: createHelpComponents(commandPrefix, category, 0),
            ...(messageId ? { replyToId: messageId } : {}),
        });
    },
};

export const commands: CommandMap = {
    ...allCommands,
    help: helpCommand,
};

const aliases = new Map<string, string>();

for (const command of Object.values(commands)) {
    for (const alias of command.aliases ?? []) {
        if (!commands[alias]) aliases.set(alias, command.name);
    }
}

export function resolveCommand(name: string): CommandDefinition | undefined {
    return commands[name] ?? commands[aliases.get(name) ?? ""];
}

export interface HelpControl {
    category: string;
    page: number;
}

export function parseHelpControl(customId: string | null, values: unknown = []): HelpControl | null {
    if (customId === HELP_SELECT_ID) {
        const selected = Array.isArray(values) && typeof values[0] === "string"
            ? values[0]
            : "home";

        return { category: selected, page: 0 };
    }

    if (customId === HELP_HOME_ID) {
        return { category: "home", page: 0 };
    }

    const match = /^veiled:help:page:([a-z0-9_-]{1,80}):(\d{1,8})(?::(?:previous|next|current))?$/i.exec(customId ?? "");

    return match ? { category: match[1] ?? "home", page: Number(match[2] ?? 0) } : null;
}

export function createHelpComponents(
    prefix: string,
    selected = "home",
    requestedPage = 0,
): RawContainerPayload[] {
    const categories = getCategories();
    const category = selected === "home" || selected === "all" || categories.includes(selected)
        ? selected
        : "home";

    if (category === "home") {
        const summaries = categories.map((value) => {
            const count = commandEntries(value).length;
            return `**${humanizeCategory(value)}** · ${count} ${count === 1 ? "command" : "commands"}`;
        });

        return [new ContainerBuilder()
            .setAccentColor(colors.brand)
            .addTitle("veiled.js help")
            .addDescription("Browse commands by category. Pick a category below, or open all commands.")
            .addSeparator()
            .addTextDisplay(summaries.join("\n"))
            .addTextDisplay(`Use \`${prefix}help <command>\` for usage and aliases.`)
            .addSeparator()
            .addTextDisplay(`-# ${Object.keys(commands).length} commands loaded`)
            .addActionRow(selectRow("home", categories))
            .toJSON()];
    }

    const entries = commandEntries(category).sort((left, right) => left.name.localeCompare(right.name));
    const pageCount = Math.max(1, Math.ceil(entries.length / HELP_PAGE_SIZE));
    const page = Math.min(Math.max(0, Number.isInteger(requestedPage) ? requestedPage : 0), pageCount - 1);
    const pageEntries = entries.slice(page * HELP_PAGE_SIZE, (page + 1) * HELP_PAGE_SIZE);
    const title = category === "all" ? "All commands" : humanizeCategory(category);
    const content = pageEntries.length
        ? pageEntries.map((command) => commandLine(command, prefix)).join("\n\n")
        : "No commands are available in this category.";

    return [new ContainerBuilder()
        .setAccentColor(colors.brand)
        .addTitle(`veiled.js · ${title}`)
        .addDescription(`${entries.length} ${entries.length === 1 ? "command" : "commands"} · Page ${page + 1} of ${pageCount}`)
        .addSeparator()
        .addTextDisplay(content)
        .addSeparator()
        .addTextDisplay(`-# Use ${prefix}help <command> for details.`)
        .addActionRow(selectRow(category, categories))
        .addActionRow(pageControls(category, page, pageCount))
        .toJSON()];
}

function commandLine(command: CommandDefinition, prefix: string): string {
    const description = command.description
        .replace(/\s+/g, " ")
        .slice(0, MAX_DESCRIPTION_LENGTH);

    return `**${prefix}${command.name}** — ${description}\n-# Usage: \`${prefix}${command.usage}\``;
}

function selectRow(category: string, categories: string[]): ActionRowBuilder {
    const select = new StringSelectMenuBuilder(HELP_SELECT_ID)
        .setPlaceholder("Choose a command category")
        .addOptions(
            new StringSelectMenuOptionBuilder("Help home", "home").setDefault(category === "home"),
            new StringSelectMenuOptionBuilder("All commands", "all").setDefault(category === "all"),
            ...categories.map((value) => new StringSelectMenuOptionBuilder(
                humanizeCategory(value).slice(0, 100),
                value,
            ).setDefault(category === value)),
        );

    return new ActionRowBuilder().addSelectMenu(select);
}

function pageControls(category: string, page: number, pageCount: number): ActionRowBuilder {
    const safeCategory = category.replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || "all";

    return new ActionRowBuilder().addButtons(
        ButtonBuilder.secondary("Home", HELP_HOME_ID),
        ButtonBuilder.secondary(
            "Previous",
            `veiled:help:page:${safeCategory}:${Math.max(0, page - 1)}:previous`,
        ).setDisabled(page <= 0),
        ButtonBuilder.secondary(
            `Page ${page + 1}/${pageCount}`,
            `veiled:help:page:${safeCategory}:${page}:current`,
        ).setDisabled(),
        ButtonBuilder.secondary(
            "Next",
            `veiled:help:page:${safeCategory}:${Math.min(pageCount - 1, page + 1)}:next`,
        ).setDisabled(page >= pageCount - 1),
    );
}

function commandEntries(category: string): CommandDefinition[] {
    return Object.values(commands).filter((command) =>
        category === "all" || (command.category ?? "other") === category);
}

function getCategories(): string[] {
    const categories = new Set(
        Object.values(commands)
            .map((command) => command.category)
            .filter((category): category is string => typeof category === "string" && category.length > 0),
    );

    return [...categories].sort((left, right) =>
        humanizeCategory(left).localeCompare(humanizeCategory(right)));
}

function humanizeCategory(value: string): string {
    return categoryLabels[value]
        ?? (value.split(/[-_\s]+/)
            .filter(Boolean)
            .map((word) => word[0]?.toUpperCase() + word.slice(1))
            .join(" ") || "Other");
}
