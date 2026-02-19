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
    // Determine the exchange rate (API or mock)
    // For now, we hardcode or fetch from an endpoint if one exists.
    // ClovaPay backend needs a rate proxy from Clova Pay Africa.
    // TODO: Expose /rates endpoint in backend via ClovaAfricaService.

    // Mock for now to unblock
    const mockRates: Record<string, string> = {
        'STX-NGN': '1500',
        'STX-KES': '150',
        'STX-GHS': '15',
        'STX-UGX': '3800',
        'STX-TZS': '2600',
    }
    const key = `${token}-${fiat}`;

    return {
        token,
        fiat,
        rate: mockRates[key] || '0',
    };
}
