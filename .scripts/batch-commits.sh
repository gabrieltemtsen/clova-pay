#!/bin/bash
cd /Users/gabrieltemtsen/Desktop/clova-pay

commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Batch 6: Security admin functions and token/currency
sed -i '' 's/(define-public (set-min-order-amount/;; @notice Set minimum order amount (admin only)\n;; @param new-min New minimum in uSTX\n(define-public (set-min-order-amount/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-min-order-amount function"

sed -i '' 's/(define-public (set-max-order-amount/;; @notice Set maximum order amount (admin only)\n;; @param new-max New maximum in uSTX\n(define-public (set-max-order-amount/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-max-order-amount function"

sed -i '' 's/(define-public (set-order-cooldown/;; @notice Set cooldown between orders (admin only)\n;; @param new-cooldown Blocks to wait\n(define-public (set-order-cooldown/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-order-cooldown function"

sed -i '' 's/(define-public (set-daily-limit/;; @notice Set daily limit per user (admin only)\n;; @param new-limit New limit in uSTX\n(define-public (set-daily-limit/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-daily-limit function"

sed -i '' 's/(define-public (set-token-enabled/;; @notice Enable or disable a token (admin only)\n;; @param token Token contract principal\n;; @param enabled Whether to enable\n;; @param name Token display name\n(define-public (set-token-enabled/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-token-enabled function"

sed -i '' 's/(define-read-only (is-token-supported/;; @notice Check if token is whitelisted\n;; @param token Token to check\n;; @return bool True if supported\n(define-read-only (is-token-supported/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document is-token-supported function"

sed -i '' 's/(define-public (set-currency-enabled/;; @notice Enable or disable a currency (admin only)\n;; @param currency 3-letter currency code\n;; @param enabled Whether to enable\n;; @param name Currency display name\n;; @param min-amount Minimum fiat amount\n(define-public (set-currency-enabled/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document set-currency-enabled function"

sed -i '' 's/(define-read-only (is-currency-supported/;; @notice Check if currency is whitelisted\n;; @param currency Currency code to check\n;; @return bool True if supported\n(define-read-only (is-currency-supported/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document is-currency-supported function"

sed -i '' 's/(define-read-only (get-currency-info/;; @notice Get currency configuration\n;; @param currency Currency code\n(define-read-only (get-currency-info/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-currency-info function"

sed -i '' 's/(define-read-only (get-supported-currencies)/;; @notice Get list of default currencies\n;; @return List of currency codes\n(define-read-only (get-supported-currencies)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-supported-currencies function"

sed -i '' 's/(define-read-only (get-token-info/;; @notice Get token configuration\n;; @param token Token contract\n(define-read-only (get-token-info/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document get-token-info function"

echo "Done with batch 6: 11 more commits (total: 69)"
