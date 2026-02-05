export type OrderStatus =
    | "PENDING"
    | "PROCESSING"
    | "CONFIRMED"
    | "CANCELLED"
    | "REFUNDED";

export interface Order {
    id: string;
    amount: number; // in STX
    fiatAmount: number; // in minor units (e.g. cents/kobo)
    currency: string;
    status: OrderStatus;
    timestamp: number;
    txId?: string;
    bankName: string;
    accountNumber: string;
}
