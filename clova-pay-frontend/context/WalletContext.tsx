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

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userSession, setUserSession] = useState<any>(null);

    // Initialize Stacks connect on client side only
    useEffect(() => {
        const initStacks = async () => {
            try {
                const { AppConfig, UserSession } = await import("@stacks/connect");
                const appConfig = new AppConfig(["store_write", "publish_data"]);
                const session = new UserSession({ appConfig });
                setUserSession(session);

                if (session.isUserSignedIn()) {
                    const userData = session.loadUserData();
                    setIsConnected(true);
                    setAddress(userData.profile.stxAddress?.testnet || userData.profile.stxAddress?.mainnet);
                }
            } catch (error) {
                console.error("Failed to initialize Stacks connect:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initStacks();
    }, []);

    const connectWallet = useCallback(async () => {
        if (!userSession) return;

        try {
            const { showConnect } = await import("@stacks/connect");
            showConnect({
                appDetails: {
                    name: "ClovaPay",
                    icon: window.location.origin + "/logo.svg",
                },
                redirectTo: "/dashboard",
                onFinish: () => {
                    const userData = userSession.loadUserData();
                    setIsConnected(true);
                    setAddress(userData.profile.stxAddress?.testnet || userData.profile.stxAddress?.mainnet);
                    window.location.reload();
                },
                userSession,
            });
        } catch (error) {
            console.error("Failed to connect wallet:", error);
        }
    }, [userSession]);

    const disconnectWallet = useCallback(async () => {
        try {
            const { disconnect } = await import("@stacks/connect");
            disconnect();
            setIsConnected(false);
            setAddress(null);
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
