import type { RawRecord } from "../util/structure";

export abstract class Structure<T = RawRecord> {
    public readonly raw: T;

    protected constructor(raw: T) {
        this.raw = raw;
    }

    public toJSON(): T {
        return this.raw;
    }
}
