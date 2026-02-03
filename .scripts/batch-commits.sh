#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 2: Data variables
sed -i '' 's/(define-data-var admin principal CONTRACT_OWNER)/;; @notice Current admin who can manage orders\n(define-data-var admin principal CONTRACT_OWNER)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document admin data variable"

sed -i '' 's/(define-data-var fee-rate uint u100)/;; @notice Fee rate in basis points (100 = 1%)\n(define-data-var fee-rate uint u100)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document fee-rate data variable"

sed -i '' 's/(define-data-var treasury principal CONTRACT_OWNER)/;; @notice Address that receives collected fees\n(define-data-var treasury principal CONTRACT_OWNER)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document treasury data variable"

sed -i '' 's/(define-data-var order-nonce uint u0)/;; @notice Auto-incrementing order ID counter\n(define-data-var order-nonce uint u0)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document order-nonce data variable"

sed -i '' 's/(define-data-var total-fees-collected uint u0)/;; @notice Running total of fees collected\n(define-data-var total-fees-collected uint u0)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document total-fees-collected variable"

sed -i '' 's/(define-data-var paused bool false)/;; @notice Emergency pause flag to halt operations\n(define-data-var paused bool false)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document paused data variable"

sed -i '' 's/(define-data-var total-escrowed uint u0)/;; @notice Total STX currently held in escrow\n(define-data-var total-escrowed uint u0)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document total-escrowed variable"

# Security variables
sed -i '' 's/(define-data-var min-order-amount uint u1000000)/;; @notice Minimum order amount (1 STX default)\n(define-data-var min-order-amount uint u1000000)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document min-order-amount variable"

sed -i '' 's/(define-data-var max-order-amount uint u100000000000)/;; @notice Maximum order amount (100K STX default)\n(define-data-var max-order-amount uint u100000000000)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document max-order-amount variable"

sed -i '' 's/(define-data-var order-cooldown-blocks uint u6)/;; @notice Blocks to wait between orders (6 blocks ~ 1 hour)\n(define-data-var order-cooldown-blocks uint u6)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document order-cooldown-blocks variable"

sed -i '' 's/(define-data-var daily-limit-per-user uint u10000000000)/;; @notice Daily transaction limit per user (10K STX)\n(define-data-var daily-limit-per-user uint u10000000000)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document daily-limit-per-user variable"

echo "Done with batch 2: 11 more commits (total: 19)"
