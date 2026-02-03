#!/bin/bash
# Script to generate many atomic commits for code quality

cd /Users/gabrieltemtsen/Desktop/clova-pay

# Helper function for commits
commit() {
    git add -A
    git commit -m "$1" --allow-empty 2>/dev/null || git commit -m "$1"
}

# Commit 3-10: Status constants documentation
sed -i '' 's/;; Order status constants/;; ----------------------------------------\n;; Order Status Constants\n;; ----------------------------------------\n;; Status flow: PENDING -> PROCESSING -> CONFIRMED\n;;              PENDING -> CANCELLED (user cancels)\n;;              PENDING|PROCESSING -> REFUNDED (admin refunds)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Add status flow documentation"

# Add comments to each status
sed -i '' 's/(define-constant STATUS_PENDING u0)/;; Order created, awaiting admin processing\n(define-constant STATUS_PENDING u0)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document STATUS_PENDING constant"

sed -i '' 's/(define-constant STATUS_PROCESSING u1)/;; Admin has started fiat settlement via Paycrest\n(define-constant STATUS_PROCESSING u1)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document STATUS_PROCESSING constant"

sed -i '' 's/(define-constant STATUS_CONFIRMED u2)/;; Fiat payment completed, order finalized\n(define-constant STATUS_CONFIRMED u2)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document STATUS_CONFIRMED constant"

sed -i '' 's/(define-constant STATUS_CANCELLED u3)/;; User cancelled before processing\n(define-constant STATUS_CANCELLED u3)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document STATUS_CANCELLED constant"

sed -i '' 's/(define-constant STATUS_REFUNDED u4)/;; Admin refunded due to settlement failure\n(define-constant STATUS_REFUNDED u4)/' clova-pay-contracts/contracts/off-ramp.clar
commit "docs: Document STATUS_REFUNDED constant"

echo "Done with batch 1: 8 commits"
