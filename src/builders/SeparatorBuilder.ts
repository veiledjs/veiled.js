import { ComponentType } from "../types/payload/component";
import type { RawContainerDivider } from "../types/payload/container";
import { validateSeparatorPayload } from "../util/validate";

export class SeparatorBuilder {
    private readonly data: RawContainerDivider = {
        type: ComponentType.Separator,
        divider: true,
        spacing: 1,
    };

    public constructor(spacing = 1) {
        this.data.spacing = spacing;
    }

    public setSpacing(spacing: number): this {
        this.data.spacing = spacing;
        return this;
    }

    public toJSON(): RawContainerDivider {
        validateSeparatorPayload(this.data);
        return structuredClone(this.data);
    }
}
