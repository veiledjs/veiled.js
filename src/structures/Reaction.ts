import type { RawReaction } from "../types/response/reaction";

export class Reaction {
    public readonly raw: RawReaction;

    private constructor(raw: RawReaction) {
        this.raw = raw;
    }

    public static from(raw: RawReaction): Reaction {
        return new Reaction(raw);
    }
}
