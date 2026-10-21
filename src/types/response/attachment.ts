export interface RawAttachment {
    id: string;
    url: string;
    filename: string;
    size: number;
    contentType?: string | null;
    width?: number | null;
    height?: number | null;
    [key: string]: unknown;
}
