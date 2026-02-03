#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 7: Test improvements
# Add file header
sed -i '' '1s/^/\/**\n * @file off-ramp.test.ts\n * @description Comprehensive test suite for ClovaPay Off-Ramp Contract\n * @author ClovaPay Team\n * @version 1.0.0\n *\/\n/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add test file header with JSDoc"

# Add section comments
sed -i '' 's/describe("ClovaPay Off-Ramp Contract", () => {/\/\/ ============================================\n\/\/ Main Test Suite\n\/\/ ============================================\ndescribe("ClovaPay Off-Ramp Contract", () => {/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add main test suite section comment"

# Document helper functions
sed -i '' 's/\/\/ Helper to create a 32-byte buffer for bank details hash/\/**\n * Creates a 32-byte buffer for bank details hash\n * @param data - String to encode\n * @returns Uint8Array of 32 bytes\n *\//' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add JSDoc for createBankHash helper"

sed -i '' 's/\/\/ Helper to create a 64-byte buffer for paycrest ref/\/**\n * Creates a 64-byte buffer for Paycrest reference\n * @param ref - Reference string to encode\n * @returns Uint8Array of 64 bytes\n *\//' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add JSDoc for createPaycrestRef helper"

# Add section comments to test groups
sed -i '' 's/describe("Read-only functions"/\/\/ --- Read-Only Functions ---\n  describe("Read-only functions"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for read-only tests"

sed -i '' 's/describe("Order Creation"/\/\/ --- Order Creation ---\n  describe("Order Creation"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for order creation tests"

sed -i '' 's/describe("Order Cancellation"/\/\/ --- Order Cancellation ---\n  describe("Order Cancellation"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for cancellation tests"

sed -i '' 's/describe("Admin Functions"/\/\/ --- Admin Functions ---\n  describe("Admin Functions"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for admin tests"

sed -i '' 's/describe("Configuration"/\/\/ --- Configuration ---\n  describe("Configuration"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for config tests"

sed -i '' 's/describe("Security: Order Limits"/\/\/ --- Security: Order Limits ---\n  describe("Security: Order Limits"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for order limits tests"

sed -i '' 's/describe("Security: Cooldown/\/\/ --- Security: Cooldown \& Daily Limits ---\n  describe("Security: Cooldown/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for cooldown tests"

sed -i '' 's/describe("Token Support"/\/\/ --- Token Support ---\n  describe("Token Support"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for token tests"

sed -i '' 's/describe("Edge Cases"/\/\/ --- Edge Cases ---\n  describe("Edge Cases"/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for edge case tests"

sed -i '' 's/describe("Accounting/\/\/ --- Accounting \& Escrow ---\n  describe("Accounting/' clova-pay-contracts/tests/off-ramp.test.ts
commit "docs: Add section comment for accounting tests"

echo "Done with batch 7: 14 more commits (total: 83)"
