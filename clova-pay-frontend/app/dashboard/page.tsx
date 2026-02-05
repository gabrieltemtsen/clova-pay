"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/stacks";
import { Wallet } from "lucide-react";
import CreateOrderForm from "@/components/CreateOrderForm";
import OrderHistory from "@/components/OrderHistory";
import DashboardStats from "@/components/DashboardStats";

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
                            <CreateOrderForm />
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <DashboardStats />
                            <OrderHistory />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
