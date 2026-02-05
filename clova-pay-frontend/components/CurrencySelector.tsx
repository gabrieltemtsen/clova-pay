"use client";

import { ChevronDown } from "lucide-react";
import { type SupportedCurrency, SUPPORTED_CURRENCIES } from "@/lib/stacks";

interface CurrencySelectorProps {
    value: SupportedCurrency;
    onChange: (value: SupportedCurrency) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as SupportedCurrency)}
                className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
            >
                {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code} className="bg-black text-white">
                        {currency.flag} {currency.code}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                <ChevronDown className="h-4 w-4" />
            </div>
        </div>
    );
}
