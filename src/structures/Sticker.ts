import type { RawSticker } from "../types/response/sticker";

export class Sticker {
    public readonly raw: RawSticker;

    private constructor(raw: RawSticker) {
        this.raw = raw;
    }

    public static from(raw: RawSticker): Sticker {
        return new Sticker(raw);
    }
}
