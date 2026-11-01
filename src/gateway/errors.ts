export class GatewayError extends Error {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "GatewayError";
    }
}

export class GatewayConnectionError extends GatewayError {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "GatewayConnectionError";
    }
}

export class GatewayAPIError extends GatewayError {
    public readonly status: number;
    public readonly body: string;

    public constructor(status: number, body: string) {
        super(`Gateway request failed with status ${status}`);
        this.name = "GatewayAPIError";
        this.status = status;
        this.body = body;
    }
}

export class GatewayAckTimeoutError extends GatewayError {
    public constructor(message = "Gateway acknowledgement timed out") {
        super(message);
        this.name = "GatewayAckTimeoutError";
    }
}

export class GatewayNotConnectedError extends GatewayError {
    public constructor(message = "Gateway is not connected") {
        super(message);
        this.name = "GatewayNotConnectedError";
    }
}
