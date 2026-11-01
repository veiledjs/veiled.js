import { BotClient, BotREST } from "../src";
import { allIntents, debugGateway, token } from "./config";

export const bot = new BotClient({
    token,
    intents: allIntents,
    shard: [0, 1],
    debug: debugGateway,
});

const privateMethods = new Set([
    "constructor",
    "resolveUrl",
    "containerComponents",
    "threadAction",
]);

export const methodNames = Object.getOwnPropertyNames(BotREST.prototype)
    .filter((name) => !privateMethods.has(name)
        && typeof (BotREST.prototype as unknown as Record<string, unknown>)[name] === "function")
    .sort();

export const runtime = {
    botUserId: "",
    startedAt: Date.now(),
};
