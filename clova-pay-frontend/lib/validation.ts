export interface ValidationError {
    field: string;
    message: string;
}

export function validateSTXAmount(amount: string, min = 1, max = 100000): string | null {
    const num = parseFloat(amount);
    if (isNaN(num)) return "Amount must be a number";
    if (num < min) return `Minimum amount is ${min} STX`;
    if (num > max) return `Maximum amount is ${max} STX`;
    return null;
}

export function validateBankAccount(accountNumber: string): string | null {
    if (!/^\d+$/.test(accountNumber)) return "Account number must contain only digits";
    if (accountNumber.length < 8 || accountNumber.length > 20) return "Account number must be between 8 and 20 digits";
    return null;
}

export function validateBankCode(bankCode: string): string | null {
    if (!bankCode) return "Bank code is required";
    if (bankCode.length < 3) return "Invalid bank code";
    return null;
}
