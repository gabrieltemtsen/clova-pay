"use client";

import { History, CheckCircle, Clock, XCircle, RefreshCcw, ArrowUpRight } from "lucide-react";
import { OrderStatus } from "@/lib/types";
import { MOCK_ORDERS } from "@/lib/mock-data";

const STATUS_CONFIG: Record<OrderStatus, { color: string; icon: React.ElementType; label: string }> = {
    PENDING: { color: "text-yellow-400 bg-yellow-400/10", icon: Clock, label: "Pending" },
    PROCESSING: { color: "text-blue-400 bg-blue-400/10", icon: RefreshCcw, label: "Processing" },
    CONFIRMED: { color: "text-green-400 bg-green-400/10", icon: CheckCircle, label: "Completed" },
    CANCELLED: { color: "text-red-400 bg-red-400/10", icon: XCircle, label: "Cancelled" },
    REFUNDED: { color: "text-gray-400 bg-gray-400/10", icon: ArrowUpRight, label: "Refunded" }
};

export function OrderHistory() {
    return (
        <div className="glass rounded-2xl p-6 h-full">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                Order History
            </h3>

            {MOCK_ORDERS.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <History className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500">No orders yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {MOCK_ORDERS.map((order) => {
                        const status = STATUS_CONFIG[order.status];
                        const StatusIcon = status.icon;

                        return (
                            <div key={order.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <span>Sell {order.amount} STX</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                                                #{order.id}
                                            </span>
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {new Date(order.timestamp).toLocaleDateString()} • {new Date(order.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {status.label}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm pt-3 border-t border-white/5">
                                    <div className="text-gray-400">
                                        {order.bankName} <span className="text-gray-600">•</span> {order.accountNumber}
                                    </div>
                                    <div className="text-white font-medium">
                                        ≈ {(order.fiatAmount / 100).toLocaleString()} {order.currency}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
