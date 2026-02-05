"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CreateOrderForm } from "@/components/CreateOrderForm";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/stacks";
import {
    Wallet,
    ArrowDownRight,
    History
} from "lucide-react";

export default function Dashboard() {
    const { isConnected, address, connectWallet } = useWallet();
    const router = useRouter();

    // Redirect if not connected
    useEffect(() => {
        if (!isConnected) {
            // Give time for the wallet to reconnect from session
            const timer = setTimeout(() => {
                if (!isConnected) {
                    router.push("/");
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isConnected, router]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Connecting Wallet...</h2>
                    <p className="text-gray-400 mb-6">Please connect your wallet to continue</p>
                    <button
                        onClick={connectWallet}
                        className="btn-primary px-6 py-3 rounded-full text-white font-medium"
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                        <p className="text-gray-400">
                            Connected: <span className="text-orange-400">{truncateAddress(address || "")}</span>
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Convert Form */}
                        <div className="lg:col-span-2">
                            <div className="glass rounded-2xl p-6">
                                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                    <ArrowDownRight className="w-5 h-5 text-orange-500" />
                                    Convert STX to Fiat
                                </h2>

                                <CreateOrderForm />
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Wallet Card */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-sm text-gray-400 mb-2">Your Wallet</h3>
                                <div className="text-3xl font-bold text-white mb-1">0.00 STX</div>
                                <p className="text-sm text-gray-500">≈ $0.00 USD</p>
                            </div>

                            {/* Recent Orders */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    Recent Orders
                                </h3>
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                                        <History className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No orders yet</p>
                                </div>
                            </div>

                            {/* Rate Info */}
                            <div className="glass rounded-2xl p-6">
                                <h3 className="text-sm text-gray-400 mb-3">Current Rates</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">1 STX</span>
                                        <span className="text-white">≈ ₦1,500</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">1 STX</span>
                                        <span className="text-white">≈ KSh 150</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">1 STX</span>
                                        <span className="text-white">≈ ₵15</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
