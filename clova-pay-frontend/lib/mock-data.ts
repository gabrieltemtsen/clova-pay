import { Order } from "./types";

export const MOCK_ORDERS: Order[] = [
    {
        id: "1",
        amount: 100,
        fiatAmount: 15000000, // 150,000.00
        currency: "NGN",
        status: "CONFIRMED",
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        txId: "0x123...abc",
        bankName: "Guaranty Trust Bank",
        accountNumber: "****1234"
    },
    {
        id: "2",
        amount: 50,
        fiatAmount: 7500000, // 75,000.00
        currency: "NGN",
        status: "PROCESSING",
        timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
        txId: "0x456...def",
        bankName: "Access Bank",
        accountNumber: "****5678"
    },
    {
        id: "3",
        amount: 25,
        fiatAmount: 375000, // 3,750.00
        currency: "KES",
        status: "PENDING",
        timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
        bankName: "M-Pesa",
        accountNumber: "****9012"
    },
    {
        id: "4",
        amount: 200,
        fiatAmount: 30000000, // 300,000.00
        currency: "NGN",
        status: "CANCELLED",
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        bankName: "Zenith Bank",
        accountNumber: "****3456"
    }
];
