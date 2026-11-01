import { ComponentType } from "../types/payload/component";
import type { RawContainerTextDisplay } from "../types/payload/container";
import { validateTextDisplayPayload } from "../util/validate";

export class TextDisplayBuilder {
    private readonly data: RawContainerTextDisplay = {
        type: ComponentType.TextDisplay,
        content: " ",
    };

    public constructor(content = " ") {
        this.data.content = content;
    }

    public setContent(content: string): this {
        this.data.content = content;
        return this;
    }

    public toJSON(): RawContainerTextDisplay {
        validateTextDisplayPayload(this.data);
        return structuredClone(this.data);
    }
}
