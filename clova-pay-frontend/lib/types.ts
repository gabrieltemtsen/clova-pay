export enum OrderStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SETTLED = "SETTLED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
    FAILED = "FAILED"
}

export type SupportedCurrency = 'NGN' | 'KES' | 'GHS';
