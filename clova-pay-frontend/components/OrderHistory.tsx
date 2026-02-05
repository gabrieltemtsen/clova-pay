"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw, AlertCircle } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { fetchOrders, Order } from "@/lib/api";
import { truncateAddress } from "@/lib/stacks";

export default function OrderHistory() {
    const { address } = useWallet();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadOrders = async () => {
        if (!address) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchOrders(address);
            setOrders(data);
        } catch (err) {
            console.error("Failed to load orders", err);
            setError("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // Poll every 30 seconds
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, [address]);

    return (
        <div className="glass rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-400 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Orders
                </h3>
                <button
                    onClick={loadOrders}
                    disabled={loading}
                    className={`p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-200">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    {error}
                </div>
            )}

            <div className="space-y-3">
                {orders.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                            <History className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-gray-500 text-sm">No orders yet</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-white font-medium text-sm">
                                        {parseInt(order.amount) / 1000000} STX
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${order.status === 'CONFIRMED' || order.status === 'SETTLED' ? 'bg-green-500/20 text-green-400' :
                                        order.status === 'FAILED' || order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                            'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                                <span>ID: #{order.stacksOrderId}</span>
                                <span>{order.fiatCurrency}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
