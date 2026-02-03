#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 5: Public functions
sed -i '' 's/(define-public (create-order/;; @notice Create a new off-ramp order\n;; @param amount STX amount to deposit\n;; @param fiat-amount Expected fiat amount\n;; @param fiat-currency Target currency (NGN\/KES\/GHS)\n;; @param bank-details-hash Encrypted bank details\n;; @return (response uint uint) Order ID or error\n(define-public (create-order/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document create-order function"

sed -i '' 's/(define-public (create-order-with-token/;; @notice Create order with SIP-010 token\n;; @param token Token contract principal\n;; @param amount Token amount to deposit\n(define-public (create-order-with-token/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document create-order-with-token function"

sed -i '' 's/(define-public (cancel-order/;; @notice Cancel a pending order (user only)\n;; @param order-id Order to cancel\n;; @return (response bool uint)\n(define-public (cancel-order/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document cancel-order function"

sed -i '' 's/(define-public (mark-processing/;; @notice Mark order as processing (admin only)\n;; @param order-id Order to mark\n(define-public (mark-processing/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document mark-processing function"

sed -i '' 's/(define-public (confirm-order/;; @notice Confirm order completion (admin only)\n;; @param order-id Order to confirm\n;; @param paycrest-ref Paycrest transaction reference\n(define-public (confirm-order/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document confirm-order function"

sed -i '' 's/(define-public (force-refund/;; @notice Force refund an order (admin only)\n;; @param order-id Order to refund\n;; @param reason Refund reason string\n(define-public (force-refund/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document force-refund function"

sed -i '' 's/(define-public (withdraw-fees/;; @notice Withdraw collected fees (admin only)\n;; @param amount Amount to withdraw\n(define-public (withdraw-fees/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document withdraw-fees function"

sed -i '' 's/(define-public (set-admin/;; @notice Transfer admin role (admin only)\n;; @param new-admin New admin address\n(define-public (set-admin/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-admin function"

sed -i '' 's/(define-public (set-treasury/;; @notice Update treasury address (admin only)\n;; @param new-treasury New treasury address\n(define-public (set-treasury/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-treasury function"

sed -i '' 's/(define-public (set-fee-rate/;; @notice Update fee rate (admin only, max 5%)\n;; @param new-fee-rate New rate in basis points\n(define-public (set-fee-rate/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-fee-rate function"

sed -i '' 's/(define-public (set-paused/;; @notice Toggle emergency pause (admin only)\n;; @param is-paused New pause state\n(define-public (set-paused/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-paused function"

echo "Done with batch 5: 11 more commits (total: 58)"
