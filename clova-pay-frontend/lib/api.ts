import { Order, OrderStatus } from "@/lib/types";

export interface PaycrestRate {
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

export async function fetchRate(token: string, fiat: string): Promise<PaycrestRate> {
    // Determine the exchange rate (API or mock)
    // For now, we hardcode or fetch from an endpoint if one exists.
    // ClovaPay backend needs a rate proxy or we assume client-side or predefined.
    // Let's assume there's a rate endpoint or just mock it here for now as backend doesn't publicly expose Paycrest rates yet except via internal service.
    // Actually PaycrestService in backend has getRate but it's not exposed in Controller yet.
    // TODO: Expose /rates endpoint in backend using PaycrestService.

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
