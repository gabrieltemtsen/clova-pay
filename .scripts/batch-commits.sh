#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 3: Maps documentation
sed -i '' 's/(define-map orders/;; @notice Main orders storage map\n;; @dev Stores all order details by order ID\n(define-map orders/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document orders map"

sed -i '' 's/(define-map user-orders/;; @notice Tracks order IDs per user (max 50)\n(define-map user-orders/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document user-orders map"

sed -i '' 's/(define-map supported-tokens/;; @notice Whitelist of supported SIP-010 tokens\n(define-map supported-tokens/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document supported-tokens map"

sed -i '' 's/(define-map token-orders/;; @notice Maps order ID to token used for deposit\n(define-map token-orders/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document token-orders map"

sed -i '' 's/(define-map supported-currencies/;; @notice Whitelist of supported fiat currencies\n(define-map supported-currencies/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document supported-currencies map"

sed -i '' 's/(define-map user-rate-limits/;; @notice Rate limiting data per user\n;; @dev Tracks cooldowns and daily volume\n(define-map user-rate-limits/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document user-rate-limits map"

# Helper functions
sed -i '' 's/(define-private (transfer-from-escrow/;; @notice Transfer STX from contract to recipient\n;; @param amount Amount to transfer\n;; @param recipient Address to receive funds\n(define-private (transfer-from-escrow/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document transfer-from-escrow helper"

sed -i '' 's/(define-private (is-admin)/;; @notice Check if caller is admin\n;; @return bool True if tx-sender is admin\n(define-private (is-admin)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document is-admin helper"

sed -i '' 's/(define-private (is-order-cancellable/;; @notice Check if order can be cancelled\n;; @param order-data Order tuple to check\n(define-private (is-order-cancellable/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document is-order-cancellable helper"

sed -i '' 's/(define-private (is-order-confirmable/;; @notice Check if order can be confirmed\n;; @param order-data Order tuple to check\n(define-private (is-order-confirmable/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document is-order-confirmable helper"

sed -i '' 's/(define-private (check-cooldown/;; @notice Verify user cooldown has elapsed\n;; @param user Principal to check\n(define-private (check-cooldown/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document check-cooldown helper"

sed -i '' 's/(define-private (check-and-update-daily-limit/;; @notice Check and update daily volume tracking\n;; @param user Principal to check\n;; @param amount Order amount to add\n(define-private (check-and-update-daily-limit/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document check-and-update-daily-limit helper"

echo "Done with batch 3: 12 more commits (total: 31)"
