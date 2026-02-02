;; ClovaPay Off-Ramp Contract
;; Escrow contract for crypto-to-fiat conversions via Paycrest bridge

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_INVALID_AMOUNT (err u101))
(define-constant ERR_ORDER_NOT_FOUND (err u102))
(define-constant ERR_ORDER_NOT_PENDING (err u103))
(define-constant ERR_INSUFFICIENT_BALANCE (err u104))
(define-constant ERR_ALREADY_CONFIRMED (err u105))
(define-constant ERR_TRANSFER_FAILED (err u106))

;; Fee rate in basis points (100 = 1%)
(define-constant FEE_DENOMINATOR u10000)

;; Order status constants
(define-constant STATUS_PENDING u0)
(define-constant STATUS_PROCESSING u1)
(define-constant STATUS_CONFIRMED u2)
(define-constant STATUS_CANCELLED u3)
(define-constant STATUS_REFUNDED u4)

;; ============================================
;; Data Variables
;; ============================================

(define-data-var admin principal CONTRACT_OWNER)
(define-data-var fee-rate uint u100) ;; 1% default
(define-data-var treasury principal CONTRACT_OWNER)
(define-data-var order-nonce uint u0)
(define-data-var total-fees-collected uint u0)
(define-data-var paused bool false)

;; Track total escrowed STX for accounting
(define-data-var total-escrowed uint u0)

;; ============================================
;; Data Maps
;; ============================================

(define-map orders
  { order-id: uint }
  {
    sender: principal,
    amount: uint,
    fee: uint,
    fiat-amount: uint,
    fiat-currency: (string-ascii 3),
    bank-details-hash: (buff 32),
    status: uint,
    created-at: uint,
    confirmed-at: (optional uint),
    paycrest-ref: (optional (buff 64))
  }
)

(define-map user-orders
  { user: principal }
  { order-ids: (list 50 uint) }
)

;; ============================================
;; Private Helper Functions
;; ============================================

;; Transfer STX from contract to a recipient
(define-private (transfer-from-escrow (amount uint) (recipient principal))
  (as-contract (stx-transfer? amount tx-sender recipient))
)

;; ============================================
;; Read-Only Functions
;; ============================================

(define-read-only (get-order (order-id uint))
  (map-get? orders { order-id: order-id })
)

(define-read-only (get-user-orders (user principal))
  (default-to { order-ids: (list) } (map-get? user-orders { user: user }))
)

(define-read-only (get-fee-rate)
  (var-get fee-rate)
)

(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-treasury)
  (var-get treasury)
)

(define-read-only (get-order-nonce)
  (var-get order-nonce)
)

(define-read-only (get-total-fees)
  (var-get total-fees-collected)
)

(define-read-only (get-total-escrowed)
  (var-get total-escrowed)
)

(define-read-only (get-paused)
  (var-get paused)
)

(define-read-only (calculate-fee (amount uint))
  (/ (* amount (var-get fee-rate)) FEE_DENOMINATOR)
)

(define-read-only (get-contract-balance)
  (stx-get-balance (as-contract tx-sender))
)

;; ============================================
;; Public Functions - User Actions
;; ============================================

;; Create a new off-ramp order
;; Locks STX in escrow until confirmed or cancelled
(define-public (create-order 
    (amount uint) 
    (fiat-amount uint)
    (fiat-currency (string-ascii 3))
    (bank-details-hash (buff 32)))
  (let
    (
      (order-id (+ (var-get order-nonce) u1))
      (fee (calculate-fee amount))
      (caller tx-sender)
    )
    ;; Validations
    (asserts! (not (var-get paused)) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> fiat-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= (stx-get-balance caller) amount) ERR_INSUFFICIENT_BALANCE)

    ;; Transfer STX to contract (escrow) - user sends to contract
    (try! (stx-transfer? amount caller (as-contract tx-sender)))

    ;; Update escrow tracking
    (var-set total-escrowed (+ (var-get total-escrowed) amount))

    ;; Store order
    (map-set orders
      { order-id: order-id }
      {
        sender: caller,
        amount: amount,
        fee: fee,
        fiat-amount: fiat-amount,
        fiat-currency: fiat-currency,
        bank-details-hash: bank-details-hash,
        status: STATUS_PENDING,
        created-at: block-height,
        confirmed-at: none,
        paycrest-ref: none
      }
    )

    ;; Update user's order list
    (match (map-get? user-orders { user: caller })
      existing-data (map-set user-orders
        { user: caller }
        { order-ids: (unwrap! (as-max-len? (append (get order-ids existing-data) order-id) u50) ERR_TRANSFER_FAILED) }
      )
      (map-set user-orders { user: caller } { order-ids: (list order-id) })
    )

    ;; Update nonce
    (var-set order-nonce order-id)

    ;; Emit event
    (print {
      event: "order-created",
      order-id: order-id,
      sender: caller,
      amount: amount,
      fee: fee,
      fiat-amount: fiat-amount,
      fiat-currency: fiat-currency,
      bank-details-hash: bank-details-hash
    })

    (ok order-id)
  )
)

;; Cancel a pending order (user only)
(define-public (cancel-order (order-id uint))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (order-sender (get sender order))
      (order-amount (get amount order))
    )

    ;; Only sender can cancel
    (asserts! (is-eq tx-sender order-sender) ERR_NOT_AUTHORIZED)
    ;; Only pending orders can be cancelled
    (asserts! (is-eq (get status order) STATUS_PENDING) ERR_ORDER_NOT_PENDING)

    ;; Refund full amount to sender
    (try! (transfer-from-escrow order-amount order-sender))

    ;; Update escrow tracking
    (var-set total-escrowed (- (var-get total-escrowed) order-amount))

    ;; Update order status
    (map-set orders
      { order-id: order-id }
      (merge order { status: STATUS_CANCELLED })
    )

    ;; Emit event
    (print {
      event: "order-cancelled",
      order-id: order-id,
      sender: order-sender,
      refunded: order-amount
    })

    (ok true)
  )
)

;; ============================================
;; Admin Functions
;; ============================================

;; Mark order as processing (backend picked it up)
(define-public (mark-processing (order-id uint))
  (let
    ((order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND)))

    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (get status order) STATUS_PENDING) ERR_ORDER_NOT_PENDING)

    (map-set orders
      { order-id: order-id }
      (merge order { status: STATUS_PROCESSING })
    )

    (print {
      event: "order-processing",
      order-id: order-id
    })

    (ok true)
  )
)

;; Confirm order after Paycrest settlement
(define-public (confirm-order (order-id uint) (paycrest-ref (buff 64)))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (fee (get fee order))
      (order-amount (get amount order))
      (net-amount (- order-amount fee))
      (current-treasury (var-get treasury))
    )

    ;; Only admin can confirm
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    ;; Cannot confirm already confirmed orders
    (asserts! (or (is-eq (get status order) STATUS_PENDING) (is-eq (get status order) STATUS_PROCESSING)) ERR_ALREADY_CONFIRMED)

    ;; Transfer net amount to treasury (backend liquidity pool replenishment)
    (try! (transfer-from-escrow net-amount current-treasury))

    ;; Update escrow tracking (remove the confirmed amount)
    (var-set total-escrowed (- (var-get total-escrowed) order-amount))

    ;; Keep fee in contract for later withdrawal
    (var-set total-fees-collected (+ (var-get total-fees-collected) fee))

    ;; Update order
    (map-set orders
      { order-id: order-id }
      (merge order { 
        status: STATUS_CONFIRMED,
        confirmed-at: (some block-height),
        paycrest-ref: (some paycrest-ref)
      })
    )

    ;; Emit event
    (print {
      event: "order-confirmed",
      order-id: order-id,
      sender: (get sender order),
      net-amount: net-amount,
      fee: fee,
      paycrest-ref: paycrest-ref
    })

    (ok true)
  )
)

;; Force refund (admin only - for failed Paycrest orders)
(define-public (force-refund (order-id uint) (reason (string-utf8 100)))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (order-sender (get sender order))
      (order-amount (get amount order))
    )

    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (or (is-eq (get status order) STATUS_PENDING) (is-eq (get status order) STATUS_PROCESSING)) ERR_ORDER_NOT_PENDING)

    ;; Refund full amount
    (try! (transfer-from-escrow order-amount order-sender))

    ;; Update escrow tracking
    (var-set total-escrowed (- (var-get total-escrowed) order-amount))

    ;; Update status
    (map-set orders
      { order-id: order-id }
      (merge order { status: STATUS_REFUNDED })
    )

    (print {
      event: "order-refunded",
      order-id: order-id,
      sender: order-sender,
      refunded: order-amount,
      reason: reason
    })

    (ok true)
  )
)

;; Withdraw collected fees
(define-public (withdraw-fees (amount uint))
  (let
    ((current-treasury (var-get treasury)))
    
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= amount (var-get total-fees-collected)) ERR_INSUFFICIENT_BALANCE)

    (try! (transfer-from-escrow amount current-treasury))
    (var-set total-fees-collected (- (var-get total-fees-collected) amount))

    (print {
      event: "fees-withdrawn",
      amount: amount,
      recipient: current-treasury
    })

    (ok amount)
  )
)

;; ============================================
;; Admin Configuration
;; ============================================

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-updated", new-admin: new-admin })
    (ok true)
  )
)

(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set treasury new-treasury)
    (print { event: "treasury-updated", new-treasury: new-treasury })
    (ok true)
  )
)

(define-public (set-fee-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u500) ERR_INVALID_AMOUNT) ;; Max 5%
    (var-set fee-rate new-rate)
    (print { event: "fee-rate-updated", new-rate: new-rate })
    (ok true)
  )
)

(define-public (set-paused (new-paused bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR_NOT_AUTHORIZED)
    (var-set paused new-paused)
    (print { event: "pause-toggled", paused: new-paused })
    (ok true)
  )
)
