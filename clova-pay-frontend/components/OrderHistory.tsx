"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, RefreshCcw, ArrowUpRight } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { fetchOrders } from "@/lib/api";
import { Order, OrderStatus } from "@/lib/types";

const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: React.ElementType; label: string }> = {
    PENDING: { color: "text-yellow-400 bg-yellow-400/10", icon: Clock, label: "Pending" },
    PROCESSING: { color: "text-blue-400 bg-blue-400/10", icon: RefreshCcw, label: "Processing" },
    SETTLED: { color: "text-green-400 bg-green-400/10", icon: CheckCircle, label: "Settled" },
    CONFIRMED: { color: "text-green-400 bg-green-400/10", icon: CheckCircle, label: "Completed" },
    CANCELLED: { color: "text-red-400 bg-red-400/10", icon: XCircle, label: "Cancelled" },
    REFUNDED: { color: "text-gray-400 bg-gray-400/10", icon: ArrowUpRight, label: "Refunded" },
    FAILED: { color: "text-red-400 bg-red-400/10", icon: XCircle, label: "Failed" }
};

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
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Order History
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
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <History className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-500 text-sm">No orders yet</p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                        const StatusIcon = status.icon;

                        return (
                            <div key={order.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <span>Sell {(parseInt(order.amount) / 1000000).toFixed(2)} STX</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                                                #{order.stacksOrderId}
                                            </span>
                                        </p>
                                        <div className="text-sm text-gray-400 mt-1">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {status.label}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-3 border-t border-white/5">
                                    <span className="text-gray-400">
                                        Fiat
                                    </span>
                                    <span className="text-white font-medium">
                                        {/* Assuming fiatAmount is cents/kobo */}
                                        ≈ {(parseInt(order.fiatAmount) / 100).toLocaleString()} {order.fiatCurrency}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
