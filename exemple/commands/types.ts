import type { BotClient } from "../../src";

export interface CommandContext {
    client: BotClient;
    prefix: string;
    laneId: string;
    roomId: string;
    messageId: string;
    botUserId: string;
    startedAt: number;
    args: string;
}

export interface CommandDefinition {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    run: (context: CommandContext) => Promise<void>;
}

export type CommandMap = Record<string, CommandDefinition>;

export function defineCommands(...commands: CommandDefinition[]): CommandMap {
    return Object.fromEntries(commands.map((command) => [command.name, command]));
}

export function mergeCommands(...maps: CommandMap[]): CommandMap {
    return Object.assign({}, ...maps);
}
