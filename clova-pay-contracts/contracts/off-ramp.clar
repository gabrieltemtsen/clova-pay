;; ============================================
;; ClovaPay Off-Ramp Contract v1.0.0
;; ============================================
;; 
;; @title Off-Ramp Escrow Contract
;; @author ClovaPay Team
;; @notice Escrow contract for crypto-to-fiat conversions via Paycrest bridge
;; @dev Supports both STX and SIP-010 tokens for deposits
;; @version 1.0.0
;; @license MIT
;;
;; Features:
;; - STX and SIP-010 token deposits
;; - Escrow management with status tracking
;; - Rate limiting and security controls
;; - Multi-currency fiat support (NGN, KES, GHS)
;; - Admin controls for configuration
;;
;; ============================================

;; Import SIP-010 trait for fungible token support
(use-trait sip010-trait .sip010-trait.sip010-trait)

;; ============================================
;; Constants
;; ============================================

;; Contract deployer set as initial owner
(define-constant CONTRACT_OWNER tx-sender)

;; ----------------------------------------
;; Error Codes (u100-u199 range)
;; ----------------------------------------
;; u100: Caller is not authorized to perform this action
(define-constant ERR_NOT_AUTHORIZED (err u100))
;; u101: Amount is invalid (zero or negative)
(define-constant ERR_INVALID_AMOUNT (err u101))
;; u102: Order with given ID does not exist
(define-constant ERR_ORDER_NOT_FOUND (err u102))
;; u103: Order is not in pending status
(define-constant ERR_ORDER_NOT_PENDING (err u103))
;; u104: User does not have enough balance
(define-constant ERR_INSUFFICIENT_BALANCE (err u104))
;; u105: Order has already been confirmed
(define-constant ERR_ALREADY_CONFIRMED (err u105))
;; u106: STX or token transfer failed
(define-constant ERR_TRANSFER_FAILED (err u106))
;; u107: Token is not in the whitelist
(define-constant ERR_TOKEN_NOT_SUPPORTED (err u107))
;; u108: Amount is below minimum order limit
(define-constant ERR_AMOUNT_TOO_LOW (err u108))
;; u109: Amount exceeds maximum order limit
(define-constant ERR_AMOUNT_TOO_HIGH (err u109))
;; u110: User must wait before creating another order
(define-constant ERR_COOLDOWN_ACTIVE (err u110))
;; u111: User has exceeded their daily volume limit
(define-constant ERR_DAILY_LIMIT_EXCEEDED (err u111))

;; Fee rate in basis points (100 = 1%)
(define-constant FEE_DENOMINATOR u10000)

;; ----------------------------------------
;; Order Status Constants
;; ----------------------------------------
;; Status flow: PENDING -> PROCESSING -> CONFIRMED
;;              PENDING -> CANCELLED (user cancels)
;;              PENDING|PROCESSING -> REFUNDED (admin refunds)
;; Order created, awaiting admin processing
(define-constant STATUS_PENDING u0)
;; Admin has started fiat settlement via Paycrest
(define-constant STATUS_PROCESSING u1)
;; Fiat payment completed, order finalized
(define-constant STATUS_CONFIRMED u2)
;; User cancelled before processing
(define-constant STATUS_CANCELLED u3)
;; Admin refunded due to settlement failure
(define-constant STATUS_REFUNDED u4)

;; ============================================
;; Data Variables
;; ============================================

;; @notice Current admin who can manage orders
(define-data-var admin principal CONTRACT_OWNER)
;; @notice Fee rate in basis points (100 = 1%)
(define-data-var fee-rate uint u100) ;; 1% default
;; @notice Address that receives collected fees
(define-data-var treasury principal CONTRACT_OWNER)
;; @notice Auto-incrementing order ID counter
(define-data-var order-nonce uint u0)
;; @notice Running total of fees collected
(define-data-var total-fees-collected uint u0)
;; @notice Emergency pause flag to halt operations
(define-data-var paused bool false)

;; Track total escrowed STX for accounting
;; @notice Total STX currently held in escrow
(define-data-var total-escrowed uint u0)

;; ============================================
;; Security: Order Limits & Rate Limiting
;; ============================================

;; Min/Max order amounts in micro-STX (1 STX = 1,000,000 micro-STX)
;; @notice Minimum order amount (1 STX default)
(define-data-var min-order-amount uint u1000000)     ;; 1 STX minimum
;; @notice Maximum order amount (100K STX default)
(define-data-var max-order-amount uint u100000000000) ;; 100,000 STX maximum

;; Cooldown between orders in blocks (~10 min = ~60 blocks)
;; @notice Blocks to wait between orders (6 blocks ~ 1 hour)
(define-data-var order-cooldown-blocks uint u6)      ;; ~1 minute cooldown

;; Daily limit per user in micro-STX (resets every 144 blocks ~24hrs)
;; @notice Daily transaction limit per user (10K STX)
(define-data-var daily-limit-per-user uint u10000000000) ;; 10,000 STX per day

;; ============================================
;; Data Maps
;; ============================================

;; @notice Main orders storage map
;; @dev Stores all order details by order ID
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

;; @notice Tracks order IDs per user (max 50)
(define-map user-orders
  { user: principal }
  { order-ids: (list 50 uint) }
)

;; Supported SIP-010 tokens map
;; @notice Whitelist of supported SIP-010 tokens
(define-map supported-tokens
  { token: principal }
  { enabled: bool, name: (string-ascii 32) }
)

;; Token orders map (tracks token type per order)
;; @notice Maps order ID to token used for deposit
(define-map token-orders
  { order-id: uint }
  { token: principal }
)

;; User rate limiting map (tracks cooldowns and daily volume)
;; @notice Rate limiting data per user
;; @dev Tracks cooldowns and daily volume
(define-map user-rate-limits
  { user: principal }
  { 
    last-order-block: uint,      ;; Block height of last order
    daily-volume: uint,          ;; Volume in current day window
    day-start-block: uint        ;; Block when daily volume started counting
  }
)

;; ============================================
;; Private Helper Functions
;; ============================================

;; Transfer STX from contract to a recipient
;; @notice Transfer STX from contract to recipient
;; @param amount Amount to transfer
;; @param recipient Address to receive funds
(define-private (transfer-from-escrow (amount uint) (recipient principal))
  (as-contract (stx-transfer? amount tx-sender recipient))
)

;; ============================================
;; Gas Optimization Helpers
;; ============================================
;; These helpers reduce gas by:
;; 1. Caching repeated var-get calls into single lookup
;; 2. Inlining common validation patterns
;; 3. Reducing duplicate status comparisons

;; Check if caller is admin (caches var-get)
;; @notice Check if caller is admin
;; @return bool True if tx-sender is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Check if order status allows cancellation/refund
;; @notice Check if order can be cancelled
;; @param order-data Order tuple to check
(define-private (is-order-cancellable (status uint))
  (or (is-eq status STATUS_PENDING) (is-eq status STATUS_PROCESSING))
)

;; Validate order exists and is in valid state for confirmation
;; @notice Check if order can be confirmed
;; @param order-data Order tuple to check
(define-private (is-order-confirmable (status uint))
  (or (is-eq status STATUS_PENDING) (is-eq status STATUS_PROCESSING))
)

;; ============================================
;; Security Validation Helpers
;; ============================================

;; Check if user is within cooldown period
;; @notice Verify user cooldown has elapsed
;; @param user Principal to check
(define-private (check-cooldown (user principal))
  (match (map-get? user-rate-limits { user: user })
    limits (>= block-height (+ (get last-order-block limits) (var-get order-cooldown-blocks)))
    true  ;; No previous order, cooldown passes
  )
)

;; Check and update daily volume (returns new volume if OK, none if exceeded)
;; @notice Check and update daily volume tracking
;; @param user Principal to check
;; @param amount Order amount to add
(define-private (check-and-update-daily-limit (user principal) (amount uint))
  (let
    (
      (day-blocks u144)  ;; ~24 hours in blocks
      (current-limits (default-to 
        { last-order-block: u0, daily-volume: u0, day-start-block: u0 }
        (map-get? user-rate-limits { user: user })
      ))
      (day-start (get day-start-block current-limits))
      (current-volume (get daily-volume current-limits))
      ;; Reset volume if new day
      (is-new-day (> (- block-height day-start) day-blocks))
      (effective-volume (if is-new-day u0 current-volume))
      (new-volume (+ effective-volume amount))
      (new-day-start (if is-new-day block-height day-start))
    )
    ;; Update the map and check limit
    (if (<= new-volume (var-get daily-limit-per-user))
      (begin
        (map-set user-rate-limits
          { user: user }
          { 
            last-order-block: block-height,
            daily-volume: new-volume,
            day-start-block: new-day-start
          }
        )
        (some new-volume)
      )
      none
    )
  )
)

;; ============================================
;; Read-Only Functions
;; ============================================

;; @notice Get order details by ID
;; @param order-id Order ID to look up
;; @return Optional order tuple
(define-read-only (get-order (order-id uint))
  (map-get? orders { order-id: order-id })
)

;; @notice Get all order IDs for a user
;; @param user Principal to look up
(define-read-only (get-user-orders (user principal))
  (default-to { order-ids: (list) } (map-get? user-orders { user: user }))
)

;; @notice Get current fee rate in basis points
;; @return uint Fee rate (100 = 1%)
(define-read-only (get-fee-rate)
  (var-get fee-rate)
)

;; @notice Get current admin address
;; @return principal Current admin
(define-read-only (get-admin)
  (var-get admin)
)

;; @notice Get treasury address for fees
;; @return principal Treasury address
(define-read-only (get-treasury)
  (var-get treasury)
)

;; @notice Get order details by ID
;; @param order-id Order ID to look up
;; @return Optional order tuple
;; @notice Get current order count
;; @return uint Total orders created
(define-read-only (get-order-nonce)
  (var-get order-nonce)
)

;; @notice Get total fees collected
;; @return uint Total fees in uSTX
(define-read-only (get-total-fees)
  (var-get total-fees-collected)
)

;; @notice Get total amount in escrow
;; @return uint Total escrowed uSTX
(define-read-only (get-total-escrowed)
  (var-get total-escrowed)
)

;; @notice Check if contract is paused
;; @return bool True if paused
(define-read-only (get-paused)
  (var-get paused)
)

;; @notice Calculate fee for given amount
;; @param amount Amount to calculate fee for
;; @return uint Fee amount in uSTX
(define-read-only (calculate-fee (amount uint))
  (/ (* amount (var-get fee-rate)) FEE_DENOMINATOR)
)

;; @notice Get contract STX balance
;; @return uint Balance in uSTX
(define-read-only (get-contract-balance)
  (stx-get-balance (as-contract tx-sender))
)

;; ============================================
;; Security Configuration Getters
;; ============================================

(define-read-only (get-min-order-amount)
  (var-get min-order-amount)
)

(define-read-only (get-max-order-amount)
  (var-get max-order-amount)
)

;; @notice Get order details by ID
;; @param order-id Order ID to look up
;; @return Optional order tuple
(define-read-only (get-order-cooldown)
  (var-get order-cooldown-blocks)
)

(define-read-only (get-daily-limit)
  (var-get daily-limit-per-user)
)

(define-read-only (get-user-rate-limits (user principal))
  (map-get? user-rate-limits { user: user })
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
    ;; Basic validations
    (asserts! (not (var-get paused)) ERR_NOT_AUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> fiat-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= (stx-get-balance caller) amount) ERR_INSUFFICIENT_BALANCE)

    ;; Security checks: amount limits
    (asserts! (>= amount (var-get min-order-amount)) ERR_AMOUNT_TOO_LOW)
    (asserts! (<= amount (var-get max-order-amount)) ERR_AMOUNT_TOO_HIGH)

    ;; Security checks: cooldown between orders
    (asserts! (check-cooldown caller) ERR_COOLDOWN_ACTIVE)

    ;; Security checks: daily volume limit (also updates tracking)
    (asserts! (is-some (check-and-update-daily-limit caller amount)) ERR_DAILY_LIMIT_EXCEEDED)

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
;; OPTIMIZED: Using is-admin helper reduces var-get calls
(define-public (mark-processing (order-id uint))
  (let
    ((order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND)))

    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
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
;; OPTIMIZED: Using is-admin and is-order-confirmable helpers
(define-public (confirm-order (order-id uint) (paycrest-ref (buff 64)))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (fee (get fee order))
      (order-amount (get amount order))
      (net-amount (- order-amount fee))
      (current-treasury (var-get treasury))
    )

    ;; Only admin can confirm - OPTIMIZED: single var-get
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    ;; Cannot confirm already confirmed orders - OPTIMIZED: helper function
    (asserts! (is-order-confirmable (get status order)) ERR_ALREADY_CONFIRMED)

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
;; OPTIMIZED: Using is-admin and is-order-cancellable helpers
(define-public (force-refund (order-id uint) (reason (string-utf8 100)))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (order-sender (get sender order))
      (order-amount (get amount order))
    )

    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (is-order-cancellable (get status order)) ERR_ORDER_NOT_PENDING)

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
;; OPTIMIZED: Using is-admin helper
(define-public (withdraw-fees (amount uint))
  (let
    ((current-treasury (var-get treasury)))
    
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
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
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-updated", new-admin: new-admin })
    (ok true)
  )
)

(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set treasury new-treasury)
    (print { event: "treasury-updated", new-treasury: new-treasury })
    (ok true)
  )
)

(define-public (set-fee-rate (new-rate uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u500) ERR_INVALID_AMOUNT) ;; Max 5%
    (var-set fee-rate new-rate)
    (print { event: "fee-rate-updated", new-rate: new-rate })
    (ok true)
  )
)

(define-public (set-paused (new-paused bool))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set paused new-paused)
    (print { event: "pause-toggled", paused: new-paused })
    (ok true)
  )
)

;; ============================================
;; Security Configuration (Admin Only)
;; ============================================

(define-public (set-min-order-amount (new-min uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-min u0) ERR_INVALID_AMOUNT)
    (var-set min-order-amount new-min)
    (print { event: "min-order-updated", new-min: new-min })
    (ok true)
  )
)

(define-public (set-max-order-amount (new-max uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-max (var-get min-order-amount)) ERR_INVALID_AMOUNT)
    (var-set max-order-amount new-max)
    (print { event: "max-order-updated", new-max: new-max })
    (ok true)
  )
)

(define-public (set-order-cooldown (new-cooldown uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set order-cooldown-blocks new-cooldown)
    (print { event: "cooldown-updated", new-cooldown: new-cooldown })
    (ok true)
  )
)

(define-public (set-daily-limit (new-limit uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-limit u0) ERR_INVALID_AMOUNT)
    (var-set daily-limit-per-user new-limit)
    (print { event: "daily-limit-updated", new-limit: new-limit })
    (ok true)
  )
)

;; ============================================
;; Token Support Functions
;; ============================================

;; Admin: Enable or disable a SIP-010 token for deposits
;; OPTIMIZED: Using is-admin helper
(define-public (set-token-enabled (token principal) (enabled bool) (name (string-ascii 32)))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (map-set supported-tokens
      { token: token }
      { enabled: enabled, name: name }
    )
    (print { event: "token-updated", token: token, enabled: enabled, name: name })
    (ok true)
  )
)

;; Check if a token is supported
(define-read-only (is-token-supported (token principal))
  (match (map-get? supported-tokens { token: token })
    token-data (get enabled token-data)
    false
  )
)

;; Get token info
(define-read-only (get-token-info (token principal))
  (map-get? supported-tokens { token: token })
)

;; Get the token used for a specific order (none = STX order)
;; @notice Get order details by ID
;; @param order-id Order ID to look up
;; @return Optional order tuple
(define-read-only (get-order-token (order-id uint))
  (map-get? token-orders { order-id: order-id })
)

;; Create an order using a SIP-010 token instead of STX
(define-public (create-order-token
    (token <sip010-trait>)
    (amount uint)
    (fiat-amount uint)
    (fiat-currency (string-ascii 3))
    (bank-details-hash (buff 32)))
  (let
    (
      (token-principal (contract-of token))
      (order-id (+ (var-get order-nonce) u1))
      (fee (calculate-fee amount))
      (caller tx-sender)
    )
    ;; Validations
    (asserts! (not (var-get paused)) ERR_NOT_AUTHORIZED)
    (asserts! (is-token-supported token-principal) ERR_TOKEN_NOT_SUPPORTED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> fiat-amount u0) ERR_INVALID_AMOUNT)

    ;; Transfer tokens to contract (escrow)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))

    ;; Store order (similar to STX order)
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

    ;; Track which token this order uses
    (map-set token-orders
      { order-id: order-id }
      { token: token-principal }
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
      event: "token-order-created",
      order-id: order-id,
      token: token-principal,
      sender: caller,
      amount: amount,
      fee: fee,
      fiat-amount: fiat-amount,
      fiat-currency: fiat-currency
    })

    (ok order-id)
  )
)

