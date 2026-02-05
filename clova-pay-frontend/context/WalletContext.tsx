"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
    isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = "clovapay_wallet_address";

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Check localStorage first
                const storedAddress = localStorage.getItem(STORAGE_KEY);
                if (storedAddress) {
                    setIsConnected(true);
                    setAddress(storedAddress);
                } else {
                    // Try to check with connect library
                    const { isConnected: checkIsConnected } = await import("@stacks/connect");
                    if (checkIsConnected()) {
                        setIsConnected(true);
                    }
                }
            } catch (error) {
                console.error("Failed to check connection:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkConnection();
    }, []);

    const connectWallet = useCallback(async () => {
        try {
            const { connect } = await import("@stacks/connect");

            // Use the new connect function - returns addresses directly
            const response = await connect();

            console.log("Connect response:", response);

            if (response && response.addresses) {
                // Get STX address - prefer testnet for development, mainnet for production
                const stxAddressInfo = response.addresses.find(
                    (addr) => addr.symbol === "STX"
                );

                if (stxAddressInfo) {
                    const stxAddress = stxAddressInfo.address;
                    setIsConnected(true);
                    setAddress(stxAddress);
                    localStorage.setItem(STORAGE_KEY, stxAddress);
                }
            }
        } catch (error) {
            console.error("Failed to connect wallet:", error);
        }
    }, []);

    const disconnectWallet = useCallback(async () => {
        try {
            const { disconnect } = await import("@stacks/connect");
            disconnect();
            setIsConnected(false);
            setAddress(null);
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Failed to disconnect wallet:", error);
        }
    }, []);

    return (
        <WalletContext.Provider
            value={{
                isConnected,
                address,
                connectWallet,
                disconnectWallet,
                isLoading,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}
