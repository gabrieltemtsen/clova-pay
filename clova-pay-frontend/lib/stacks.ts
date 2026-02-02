import { STACKS_MAINNET, STACKS_TESTNET, type StacksNetwork } from "@stacks/network";

// Use testnet for development
export const network: StacksNetwork = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
    ? STACKS_MAINNET
    : STACKS_TESTNET;

// Contract deployment address (update after deployment)
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
export const CONTRACT_NAME = "off-ramp";

// Supported fiat currencies with their display info
export const SUPPORTED_CURRENCIES = [
    { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦" },
    { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh" },
    { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭", symbol: "₵" },
    { code: "UGX", name: "Ugandan Shilling", flag: "🇺🇬", symbol: "USh" },
    { code: "TZS", name: "Tanzanian Shilling", flag: "🇹🇿", symbol: "TSh" },
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]["code"];

// Format STX amount (from micro STX)
export function formatSTX(microSTX: number): string {
    return (microSTX / 1_000_000).toFixed(6);
}

// Parse STX amount (to micro STX)
export function parseSTX(stx: string): number {
    return Math.floor(parseFloat(stx) * 1_000_000);
}

// Truncate address for display
export function truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate hash for bank details (client-side only)
export async function hashBankDetails(details: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
}): Promise<Uint8Array> {
    const str = `${details.bankCode}:${details.accountNumber}:${details.accountName}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
}
