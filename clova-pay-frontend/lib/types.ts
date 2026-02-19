export enum OrderStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SETTLED = "SETTLED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
    FAILED = "FAILED"
}

export type SupportedCurrency = 'NGN';

// Backend compatible Order interface
export interface Order {
    id: string;
    stacksOrderId: number;
    sender: string;
    amount: string;     // BigInt as string
    fee: string;
    fiatAmount: string; // BigInt as string (minor units)
    fiatCurrency: string;
    status: OrderStatus;
    createdAt: string;
}
