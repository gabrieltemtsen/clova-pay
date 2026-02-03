#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 4: Read-only functions
sed -i '' 's/(define-read-only (get-order/;; @notice Get order details by ID\n;; @param order-id Order ID to look up\n;; @return Optional order tuple\n(define-read-only (get-order/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-order function"

sed -i '' 's/(define-read-only (get-user-orders/;; @notice Get all order IDs for a user\n;; @param user Principal to look up\n(define-read-only (get-user-orders/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-user-orders function"

sed -i '' 's/(define-read-only (get-fee-rate)/;; @notice Get current fee rate in basis points\n;; @return uint Fee rate (100 = 1%)\n(define-read-only (get-fee-rate)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-fee-rate function"

sed -i '' 's/(define-read-only (get-admin)/;; @notice Get current admin address\n;; @return principal Current admin\n(define-read-only (get-admin)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-admin function"

sed -i '' 's/(define-read-only (get-treasury)/;; @notice Get treasury address for fees\n;; @return principal Treasury address\n(define-read-only (get-treasury)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-treasury function"

sed -i '' 's/(define-read-only (get-order-nonce)/;; @notice Get current order count\n;; @return uint Total orders created\n(define-read-only (get-order-nonce)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-order-nonce function"

sed -i '' 's/(define-read-only (get-total-fees)/;; @notice Get total fees collected\n;; @return uint Total fees in uSTX\n(define-read-only (get-total-fees)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-total-fees function"

sed -i '' 's/(define-read-only (get-total-escrowed)/;; @notice Get total amount in escrow\n;; @return uint Total escrowed uSTX\n(define-read-only (get-total-escrowed)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-total-escrowed function"

sed -i '' 's/(define-read-only (get-paused)/;; @notice Check if contract is paused\n;; @return bool True if paused\n(define-read-only (get-paused)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-paused function"

sed -i '' 's/(define-read-only (calculate-fee/;; @notice Calculate fee for given amount\n;; @param amount Amount to calculate fee for\n;; @return uint Fee amount in uSTX\n(define-read-only (calculate-fee/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document calculate-fee function"

sed -i '' 's/(define-read-only (get-contract-balance)/;; @notice Get contract STX balance\n;; @return uint Balance in uSTX\n(define-read-only (get-contract-balance)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-contract-balance function"

sed -i '' 's/(define-read-only (get-min-order-amount)/;; @notice Get minimum order amount\n;; @return uint Minimum in uSTX\n(define-read-only (get-min-order-amount)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-min-order-amount function"

sed -i '' 's/(define-read-only (get-max-order-amount)/;; @notice Get maximum order amount\n;; @return uint Maximum in uSTX\n(define-read-only (get-max-order-amount)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-max-order-amount function"

sed -i '' 's/(define-read-only (get-order-cooldown)/;; @notice Get order cooldown in blocks\n;; @return uint Cooldown blocks\n(define-read-only (get-order-cooldown)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-order-cooldown function"

sed -i '' 's/(define-read-only (get-daily-limit)/;; @notice Get daily limit per user\n;; @return uint Daily limit in uSTX\n(define-read-only (get-daily-limit)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-daily-limit function"

sed -i '' 's/(define-read-only (get-user-rate-limits/;; @notice Get user rate limit data\n;; @param user Principal to look up\n(define-read-only (get-user-rate-limits/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-user-rate-limits function"

echo "Done with batch 4: 16 more commits (total: 47)"
