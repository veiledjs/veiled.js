export interface GatewayAckResult {
    success: boolean;
    error?: string;
}

export type GatewayAckCallback = (result: GatewayAckResult) => void;
