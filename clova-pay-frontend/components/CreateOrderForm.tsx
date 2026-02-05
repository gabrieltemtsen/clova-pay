"use client";

import { useState } from "react";
import { openContractCall } from "@stacks/connect";
import { uintCV, stringAsciiCV, bufferCV } from "@stacks/transactions";
import { useWallet } from "@/context/WalletContext";
import { CONTRACT_ADDRESS, CONTRACT_NAME, hashBankDetails, network, type SupportedCurrency } from "@/lib/stacks";
import { validateSTXAmount, validateBankAccount, validateBankCode, type ValidationError } from "@/lib/validation";
import { CurrencySelector } from "./CurrencySelector";
import { Building2, AlertCircle } from "lucide-react";

export function CreateOrderForm() {
    const { isConnected, address } = useWallet();
    const [amount, setAmount] = useState("");
    const [fiatAmount, setFiatAmount] = useState("");
    const [currency, setCurrency] = useState<SupportedCurrency>("NGN");
    const [bankCode, setBankCode] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        if (!isConnected || !address) {
            setErrors([{ field: "wallet", message: "Please connect your wallet first" }]);
            return;
        }

        // Validate
        const amountError = validateSTXAmount(amount);
        const bankError = validateBankAccount(accountNumber);
        const codeCodeError = validateBankCode(bankCode);

        const newErrors: ValidationError[] = [];
        if (amountError) newErrors.push({ field: "amount", message: amountError });
        if (bankError) newErrors.push({ field: "accountNumber", message: bankError });
        if (codeCodeError) newErrors.push({ field: "bankCode", message: codeCodeError });

        if (newErrors.length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            // Hash bank details
            const bankHash = await hashBankDetails({
                bankCode,
                accountNumber,
                accountName,
            });

            // Convert amount to microSTX
            const microSTX = Math.floor(parseFloat(amount) * 1_000_000);

            // Convert fiat amount to integer (e.g., cents/kobo)
            // Assuming 2 decimal places for now
            const fiatInt = Math.floor(parseFloat(fiatAmount || "0") * 100);

            await openContractCall({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: "create-order",
                functionArgs: [
                    uintCV(microSTX),
                    uintCV(fiatInt),
                    stringAsciiCV(currency),
                    bufferCV(bankHash),
                ],
                onFinish: (data) => {
                    console.log("Transaction submitted:", data);
                    setIsSubmitting(false);
                    // Reset form or redirect
                    setAmount("");
                    setFiatAmount("");
                    setAccountName("");
                    setAccountNumber("");
                    setBankCode("");
                    alert("Order created successfully! Transaction ID: " + data.txId);
                },
                onCancel: () => {
                    console.log("Transaction cancelled");
                    setIsSubmitting(false);
                },
            });
        } catch (err) {
            console.error(err);
            setErrors([{ field: "submit", message: "Failed to submit transaction" }]);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
                <label className="block text-sm text-gray-400 mb-2">
                    Amount (STX)
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="0.00"
                        step="0.000001"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">STX</span>
                    </div>
                </div>
                {errors.find(e => e.field === "amount") && (
                    <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "amount")?.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                    Fee: 1%
                </p>
            </div>

            {/* Fiat Amount & Currency */}
            <div>
                <label className="block text-sm text-gray-400 mb-2">Expected Fiat Amount</label>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            type="number"
                            value={fiatAmount}
                            onChange={(e) => setFiatAmount(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="w-1/3">
                        <CurrencySelector value={currency} onChange={setCurrency} />
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
                <h3 className="text-sm text-gray-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Bank Details
                </h3>

                <div>
                    <input
                        type="text"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Bank Code (e.g., 011)"
                    />
                    {errors.find(e => e.field === "bankCode") && (
                        <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "bankCode")?.message}</p>
                    )}
                </div>

                <div>
                    <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Account Number"
                    />
                    {errors.find(e => e.field === "accountNumber") && (
                        <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "accountNumber")?.message}</p>
                    )}
                </div>

                <div>
                    <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Account Name"
                    />
                </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                    <p className="font-medium text-orange-400 mb-1">How it works</p>
                    <p>Your STX will be locked in escrow. Once we confirm the fiat has been sent to your bank, the order is completed.</p>
                </div>
            </div>

            {/* Errors */}
            {errors.find(e => e.field === "wallet" || e.field === "submit") && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {errors.find(e => e.field === "wallet" || e.field === "submit")?.message}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting || !isConnected}
                className={`w-full py-4 rounded-xl text-white font-semibold transition-all
                    ${isSubmitting || !isConnected
                        ? "bg-gray-700 cursor-not-allowed text-gray-400"
                        : "btn-primary shadow-lg hover:shadow-orange-500/20"
                    }`}
            >
                {isSubmitting ? "Processing..." : "Create Sell Order"}
            </button>
        </form>
    );
}
