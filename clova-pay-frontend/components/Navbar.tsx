"use client";

import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/stacks";
import Link from "next/link";
import { Wallet, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const { isConnected, address, connectWallet, disconnectWallet } = useWallet();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">CP</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent">
                            ClovaPay
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="#features"
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Features
                        </Link>
                        <Link
                            href="#currencies"
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            Currencies
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="text-gray-300 hover:text-white transition-colors"
                        >
                            How It Works
                        </Link>
                    </div>

                    {/* Wallet Button */}
                    <div className="flex items-center gap-4">
                        {isConnected ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/dashboard"
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                                >
                                    <Wallet className="w-4 h-4" />
                                    {truncateAddress(address || "")}
                                </Link>
                                <button
                                    onClick={disconnectWallet}
                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                    title="Disconnect"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                <Wallet className="w-4 h-4" />
                                <span className="hidden sm:inline">Connect Wallet</span>
                                <span className="sm:hidden">Connect</span>
                            </button>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 text-gray-400 hover:text-white"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/10">
                        <div className="flex flex-col gap-4">
                            <Link
                                href="#features"
                                className="text-gray-300 hover:text-white transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Features
                            </Link>
                            <Link
                                href="#currencies"
                                className="text-gray-300 hover:text-white transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Currencies
                            </Link>
                            <Link
                                href="#how-it-works"
                                className="text-gray-300 hover:text-white transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                How It Works
                            </Link>
                            {isConnected && (
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2 text-orange-400"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Wallet className="w-4 h-4" />
                                    Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
