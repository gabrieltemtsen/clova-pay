import { Order, OrderStatus } from "@/lib/types";

export interface OfframpRate {
    token: string;
    fiat: string;
    rate: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchOrders(address: string): Promise<Order[]> {
    const res = await fetch(`${API_URL}/orders?sender=${address}`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
}

export async function fetchRate(token: string, fiat: string): Promise<OfframpRate> {
    // TODO: expose a backend /rates proxy from Clova Africa service.
    const mockRates: Record<string, string> = {
        'STX-NGN': '1500',
    }
    const key = `${token}-${fiat}`;

    return {
        token,
        fiat,
        rate: mockRates[key] || '0',
    };
}

export async function verifyRecipient(accountNumber: string, bankCode: string): Promise<{ verified: boolean; accountName: string; accountNumber: string; bankCode: string; }> {
    const res = await fetch(`${API_URL}/orders/verify-recipient`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountNumber, bankCode }),
    });

    if (!res.ok) throw new Error('Recipient verification failed');
    return res.json();
}
