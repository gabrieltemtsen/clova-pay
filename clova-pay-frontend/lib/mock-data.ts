import { Order, OrderStatus } from "./types";

export const MOCK_ORDERS: Order[] = [
    {
        id: "1",
        stacksOrderId: 1,
        sender: "ST1...",
        amount: "100000000", // 100 STX
        fee: "1000000",
        fiatAmount: "15000000", // 150,000.00
        fiatCurrency: "NGN",
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: "2",
        stacksOrderId: 2,
        sender: "ST1...",
        amount: "50000000", // 50 STX
        fee: "500000",
        fiatAmount: "7500000", // 75,000.00
        fiatCurrency: "NGN",
        status: OrderStatus.PROCESSING,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
        id: "3",
        stacksOrderId: 3,
        sender: "ST1...",
        amount: "25000000", // 25 STX
        fee: "250000",
        fiatAmount: "375000", // 3,750.00
        fiatCurrency: "KES",
        status: OrderStatus.PENDING,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
        id: "4",
        stacksOrderId: 4,
        sender: "ST1...",
        amount: "200000000", // 200 STX
        fee: "2000000",
        fiatAmount: "30000000", // 300,000.00
        fiatCurrency: "NGN",
        status: OrderStatus.CANCELLED,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    }
];
