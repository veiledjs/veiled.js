import { EmbedBuilder } from "../../src";
import { fieldsEmbed } from "../lib/embeds";
import { colors, truncate } from "../lib/format";
import { reply, sendEmbed } from "../lib/respond";
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
import { mergeCommands } from "./types";
import type { CommandDefinition, CommandMap } from "./types";

const allCommands = mergeCommands(
    coreCommands,
    roomCommands,
    messageCommands,
    moderationCommands,
    threadCommands,
    inviteCommands,
    eventCommands,
    webhookCommands,
    voiceCommands,
    uploadCommands,
);

const helpCommand: CommandDefinition = {
    name: "help",
    description: "Show every command or details for one command.",
    usage: "help [command]",
    aliases: ["commands"],
    run: async ({ client, laneId, prefix: commandPrefix, args }) => {
        const requested = args.trim().toLowerCase().replace(/^[!./]/, "");

        if (requested) {
            const command = resolveCommand(requested);

            if (!command) {
                await reply(client, laneId, `Unknown command: ${requested}`);
                return;
            }

            await sendEmbed(client, laneId, fieldsEmbed(
                `${commandPrefix}${command.name}`,
                [
                    { name: "Description", value: command.description, inline: false },
                    { name: "Usage", value: `\`${commandPrefix}${command.usage}\``, inline: false },
                    { name: "Aliases", value: (command.aliases ?? []).map((alias) => `\`${commandPrefix}${alias}\``).join(", ") || "none", inline: false },
                ],
                colors.brand,
            ));
            return;
        }

        const entries = Object.values(commands).sort((a, b) => a.name.localeCompare(b.name));
        const embeds = chunk(entries, 20).map((chunk, index, chunks) => {
            const embed = new EmbedBuilder()
                .setTitle(index === 0 ? "veiled.js commands" : "veiled.js commands (continued)")
                .setColor(colors.brand)
                .setFooter(`Part ${index + 1}/${chunks.length} • veiled.js example`)
                .setTimestamp();

            if (index === 0) {
                embed.setDescription(`Use \`${commandPrefix}help <command>\` for details.\n${entries.length} commands total.`);
            }

            for (const command of chunk) {
                const aliases = command.aliases?.length
                    ? ` • aliases: ${command.aliases.map((alias) => `\`${alias}\``).join(", ")}`
                    : "";

                embed.addField(
                    `${commandPrefix}${command.name}`,
                    truncate(`${command.description}${aliases}`, 1000),
                    false,
                );
            }

            return embed;
        });

        await reply(client, laneId, "", embeds);
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

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}
