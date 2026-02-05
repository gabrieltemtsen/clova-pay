export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validates STX amount against min/max limits
 * @param amount - string input from form
 * @param min - minimum amount (default 1)
 * @param max - maximum amount (default 100000)
 * @returns Error message or null if valid
 */
export function validateSTXAmount(amount: string, min = 1, max = 100000): string | null {
    const num = parseFloat(amount);
    if (isNaN(num)) return "Amount must be a number";
    if (num < min) return `Minimum amount is ${min} STX`;
    if (num > max) return `Maximum amount is ${max} STX`;
    return null;
}

/**
 * Validates bank account number format
 * @param accountNumber - account number string
 * @returns Error message or null
 */
export function validateBankAccount(accountNumber: string): string | null {
    if (!/^\d+$/.test(accountNumber)) return "Account number must contain only digits";
    if (accountNumber.length < 8 || accountNumber.length > 20) return "Account number must be between 8 and 20 digits";
    return null;
}

/**
 * Validates bank code format
 * @param bankCode - bank code string
 * @returns Error message or null
 */
export function validateBankCode(bankCode: string): string | null {
    if (!bankCode) return "Bank code is required";
    if (bankCode.length < 3) return "Invalid bank code";
    return null;
}
