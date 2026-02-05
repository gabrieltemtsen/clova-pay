import { useWallet } from "@/context/WalletContext";
import { SUPPORTED_CURRENCIES, network } from "@/lib/stacks";
import { ArrowDownRight, AlertCircle, Building2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchRate } from "@/lib/api";
import { uintCV, stringAsciiCV, PostConditionMode } from "@stacks/transactions";
import { SupportedCurrency } from "@/lib/types";

export default function CreateOrderForm() {
    const { address } = useWallet();
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<SupportedCurrency>(SUPPORTED_CURRENCIES[0].code);
    const [rate, setRate] = useState("0");
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);

    // Bank Details State
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");

    useEffect(() => {
        const loadRate = async () => {
            setCalculating(true);
            try {
                const data = await fetchRate('STX', currency);
                setRate(data.rate);
            } catch (e) {
                console.error(e);
            } finally {
                setCalculating(false);
            }
        };
        loadRate();
    }, [currency]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !bankName || !accountNumber || !accountName) return;

        // Create bank details hash (simple string for now, in prod should be hash)
        // Format: BANK|ACCOUNT|NAME
        const bankDetails = `${bankName}|${accountNumber}|${accountName}`;

        // Calculate Fiat Amount: Amount * Rate
        // Note: Contracts expects integer with 2 decimals for fiat (cents) if using standard
        // But our contract treats fiat-amount as uint. Let's assume rate is standard integer.
        // Rate from API is string like "1500".
        // If STX amount is 100 (entered by user), contract expects u100000000 (microSTX).
        // Fiat amount logic: (AmountSTX * Rate).
        const amountSTX = parseFloat(amount);
        const rateVal = parseFloat(rate);
        const fiatAmount = Math.floor(amountSTX * rateVal);

        const functionArgs = [
            uintCV(Math.floor(amountSTX * 1000000)), // amount-ustx
            uintCV(fiatAmount),                      // fiat-amount
            stringAsciiCV(currency),                 // currency
            stringAsciiCV(bankDetails)               // bank-details-hash
        ];

        // Contract details from env
        const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
        const contractName = 'off-ramp';

        const { openContractCall } = await import("@stacks/connect");

        await openContractCall({
            network,
            anchorMode: 1, // Any
            contractAddress,
            contractName,
            functionName: "create-order",
            functionArgs,
            postConditionMode: PostConditionMode.Allow, // Check permissions in prod
            postConditions: [],
            onFinish: (data) => {
                console.log("Transaction finished:", data);
                // Optionally show success message or redirect
                setAmount("");
                setBankName("");
                setAccountNumber("");
                setAccountName("");
            },
            onCancel: () => {
                console.log("Transaction canceled");
            },
        });
    };


    return (
        <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-orange-500" />
                Convert STX to Fiat
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">
                        Amount (STX)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Balance: 0.00 STX • Fee: 1%
                    </p>
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">
                        Receive Currency
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                    >
                        {SUPPORTED_CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-black">
                                {c.flag} {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                    <h3 className="text-sm text-gray-400 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Bank Details
                    </h3>

                    <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />

                    <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Account Number"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />

                    <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account Name"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                        <p className="font-medium text-orange-400 mb-1">How it works</p>
                        <p>Your STX will be locked in escrow. Once we confirm the fiat has been sent to your bank, the order is completed.</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || calculating}
                    className="w-full btn-primary py-4 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Order"}
                </button>
            </form>
        </div>
    );
}
