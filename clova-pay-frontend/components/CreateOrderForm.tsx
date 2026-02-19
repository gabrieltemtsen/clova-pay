"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { SUPPORTED_CURRENCIES, network, hashBankDetails } from "@/lib/stacks";
import { ArrowDownRight, Building2, AlertCircle, Loader2 } from "lucide-react";
import { fetchRate, verifyRecipient } from "@/lib/api";
import { uintCV, stringAsciiCV, bufferCV, PostConditionMode } from "@stacks/transactions";
import { SupportedCurrency } from "@/lib/types";
import { validateSTXAmount, validateBankAccount, validateBankCode, type ValidationError } from "@/lib/validation";
import { CurrencySelector } from "./CurrencySelector";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'off-ramp';

export default function CreateOrderForm() {
    const { isConnected, address } = useWallet();
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<SupportedCurrency>("NGN");
    const [rate, setRate] = useState("0");
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifyingRecipient, setIsVerifyingRecipient] = useState(false);
    const [recipientVerified, setRecipientVerified] = useState(false);

    // Bank Details State
    const [bankName, setBankName] = useState("");
    const [bankCode, setBankCode] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");

    // Derived/Fiat
    const [fiatAmount, setFiatAmount] = useState("");
    const [errors, setErrors] = useState<ValidationError[]>([]);

    useEffect(() => {
        setRecipientVerified(false);
    }, [bankCode, accountNumber]);

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

    // Update fiat amount when amount or rate changes
    useEffect(() => {
        if (!amount || !rate) {
            setFiatAmount("");
            return;
        }
        const val = parseFloat(amount) * parseFloat(rate);
        setFiatAmount(val.toFixed(2));
    }, [amount, rate]);

    const handleVerifyRecipient = async () => {
        const bankError = validateBankAccount(accountNumber);
        const codeCodeError = validateBankCode(bankCode);
        const verifyErrors: ValidationError[] = [];
        if (bankError) verifyErrors.push({ field: 'accountNumber', message: bankError });
        if (codeCodeError) verifyErrors.push({ field: 'bankCode', message: codeCodeError });
        if (verifyErrors.length > 0) {
            setErrors(verifyErrors);
            return;
        }

        setIsVerifyingRecipient(true);
        try {
            const result = await verifyRecipient(accountNumber, bankCode);
            if (!result.verified || !result.accountName) {
                setErrors([{ field: 'accountName', message: 'Could not verify account details. Please re-check bank code and account number.' }]);
                setRecipientVerified(false);
                return;
            }
            setAccountName(result.accountName);
            setRecipientVerified(true);
        } catch (err) {
            setErrors([{ field: 'accountName', message: `Verification failed: ${(err as Error).message}` }]);
            setRecipientVerified(false);
        } finally {
            setIsVerifyingRecipient(false);
        }
    };

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
            let resolvedAccountName = accountName;
            if (!recipientVerified || !resolvedAccountName) {
                const verified = await verifyRecipient(accountNumber, bankCode);
                if (!verified.verified || !verified.accountName) {
                    throw new Error('Bank account could not be verified');
                }
                resolvedAccountName = verified.accountName;
                setAccountName(verified.accountName);
                setRecipientVerified(true);
            }

            // Hash bank details
            const bankHash = await hashBankDetails({
                bankCode,
                accountNumber,
                accountName: resolvedAccountName,
            });

            // Convert amount to microSTX
            const amountSTX = parseFloat(amount);
            const microSTX = Math.floor(amountSTX * 1_000_000);

            // Fiat amount (cents)
            const rateVal = parseFloat(rate);
            const fiatVal = Math.floor(amountSTX * rateVal * 100);

            // Dynamic import to avoid SSG issues
            const { openContractCall } = await import("@stacks/connect");

            await openContractCall({
                network,
                anchorMode: 1,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: "create-order",
                functionArgs: [
                    uintCV(microSTX),
                    uintCV(fiatVal),
                    stringAsciiCV(currency),
                    bufferCV(bankHash)
                ],
                postConditionMode: PostConditionMode.Allow,
                postConditions: [],
                onFinish: (data) => {
                    console.log("Transaction finished:", data);
                    setIsSubmitting(false);
                    setAmount("");
                    setAccountName("");
                    setAccountNumber("");
                    setBankCode("");
                    setRecipientVerified(false);
                    alert("Order created! Tx: " + data.txId);
                },
                onCancel: () => {
                    console.log("Transaction canceled");
                    setIsSubmitting(false);
                },
            });

        } catch (err) {
            console.error(err);
            setErrors([{ field: "submit", message: "Failed to submit transaction: " + (err as Error).message }]);
            setIsSubmitting(false);
        }
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
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.000001"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm">STX</span>
                        </div>
                    </div>
                    {errors.find(e => e.field === "amount") && (
                        <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "amount")?.message}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                        Rate: 1 STX ≈ {rate} {currency} • Fee: 1%
                    </p>
                </div>

                {/* Fiat Calculation Display */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Expected Fiat Amount</label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <input
                                disabled
                                value={fiatAmount}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
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
                            placeholder="Bank Code (e.g. 057)"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
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
                            placeholder="Account Number"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        {errors.find(e => e.field === "accountNumber") && (
                            <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "accountNumber")?.message}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleVerifyRecipient}
                            disabled={isVerifyingRecipient || !bankCode || !accountNumber}
                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isVerifyingRecipient ? 'Verifying...' : 'Verify account'}
                        </button>
                        {recipientVerified && <span className="text-green-400 text-sm">Account verified ✓</span>}
                    </div>

                    <div>
                        <input
                            type="text"
                            value={accountName}
                            readOnly
                            placeholder="Account Name (auto-filled after verification)"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors"
                        />
                        {errors.find(e => e.field === "accountName") && (
                            <p className="mt-1 text-sm text-red-500">{errors.find(e => e.field === "accountName")?.message}</p>
                        )}
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

                {/* Errors Summary */}
                {errors.find(e => e.field === "wallet" || e.field === "submit") && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {errors.find(e => e.field === "wallet" || e.field === "submit")?.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || calculating || isSubmitting || !isConnected}
                    className="w-full btn-primary py-4 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting || loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Order"}
                </button>
            </form>
        </div>
    );
}
