"use client";

import { useWallet } from "@/context/WalletContext";

export default function DashboardStats() {
    const { address } = useWallet();

    return (
        <div className="space-y-6">
            {/* Wallet Card */}
            <div className="glass rounded-2xl p-6">
                <h3 className="text-sm text-gray-400 mb-2">Your Wallet</h3>
                <div className="text-3xl font-bold text-white mb-1">0.00 STX</div>
                <p className="text-sm text-gray-500">≈ $0.00 USD</p>
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
    );
}
