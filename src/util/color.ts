const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

export function normalizeColor(color: string | number): string {
    if (typeof color === "number") {
        if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
            throw new RangeError("Color must be an integer between 0x000000 and 0xFFFFFF");
        }

        return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
    }

    const match = HEX_COLOR.exec(color.trim());

    if (!match?.[1]) {
        throw new TypeError(`Invalid color: ${color}`);
    }

    return `#${match[1].toUpperCase()}`;
}
