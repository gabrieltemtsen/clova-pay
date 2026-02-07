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
;; u112: Admin already exists in the admin list
(define-constant ERR_ADMIN_ALREADY_EXISTS (err u112))
;; u113: Admin not found in the admin list
(define-constant ERR_ADMIN_NOT_FOUND (err u113))
;; u114: Cannot remove the last admin
(define-constant ERR_CANNOT_REMOVE_LAST_ADMIN (err u114))
;; u115: Admin transfer is not pending
(define-constant ERR_NO_PENDING_TRANSFER (err u115))
;; u116: Admin transfer timelock has not elapsed
(define-constant ERR_TRANSFER_LOCKED (err u116))
;; u117: Order has expired
(define-constant ERR_ORDER_EXPIRED (err u117))

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
;; Partial settlement completed (some amount refunded)
(define-constant STATUS_PARTIAL u5)

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

;; ============================================
;; Multi-Admin & Time-Lock Variables
;; ============================================

;; @notice Pending admin for time-locked transfer
(define-data-var pending-admin (optional principal) none)
;; @notice Block height when admin transfer can be completed
(define-data-var admin-transfer-unlock-block uint u0)
;; @notice Number of blocks for admin transfer timelock (~24 hours)
(define-constant ADMIN_TRANSFER_DELAY u144)
;; @notice Count of active admins
(define-data-var admin-count uint u1)
;; @notice Order expiry in blocks (~1 week = 1008 blocks)
(define-data-var order-expiry-blocks uint u1008)

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

;; Supported fiat currencies map
(define-map supported-currencies
  { currency: (string-ascii 3) }
  { enabled: bool, name: (string-ascii 32), min-amount: uint }
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
;; Multi-Admin Map
;; ============================================

;; @notice Map of authorized admins
;; @dev Initial admin (CONTRACT_OWNER) is set in initialization
(define-map admin-list
  { admin: principal }
  { active: bool, added-at: uint }
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

;; Check if caller is admin (supports both legacy admin and multi-admin list)
;; @notice Check if caller is an authorized admin
;; @return bool True if tx-sender is admin
(define-private (is-admin)
  (or 
    (is-eq tx-sender (var-get admin))
    (match (map-get? admin-list { admin: tx-sender })
      admin-data (get active admin-data)
      false
    )
  )
)

;; Check if principal is an authorized admin (read-only version)
;; @notice Check if given principal is admin
;; @param who Principal to check
;; @return bool True if who is admin
(define-read-only (is-authorized-admin (who principal))
  (or 
    (is-eq who (var-get admin))
    (match (map-get? admin-list { admin: who })
      admin-data (get active admin-data)
      false
    )
  )
)

;; Check if caller is the contract owner (only owner can manage admins)
;; @notice Check if caller is contract owner
;; @return bool True if tx-sender is CONTRACT_OWNER
(define-private (is-owner)
  (is-eq tx-sender CONTRACT_OWNER)
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

;; @notice Get minimum order amount
;; @return uint Minimum in uSTX
(define-read-only (get-min-order-amount)
  (var-get min-order-amount)
)

;; @notice Get maximum order amount
;; @return uint Maximum in uSTX
(define-read-only (get-max-order-amount)
  (var-get max-order-amount)
)

;; @notice Get order details by ID
;; @param order-id Order ID to look up
;; @return Optional order tuple
;; @notice Get order cooldown in blocks
;; @return uint Cooldown blocks
(define-read-only (get-order-cooldown)
  (var-get order-cooldown-blocks)
)

;; @notice Get daily limit per user
;; @return uint Daily limit in uSTX
(define-read-only (get-daily-limit)
  (var-get daily-limit-per-user)
)

;; @notice Get user rate limit data
;; @param user Principal to look up
(define-read-only (get-user-rate-limits (user principal))
  (map-get? user-rate-limits { user: user })
)

;; ============================================
;; Order Expiry Functions
;; ============================================

;; @notice Get order expiry period in blocks
;; @return uint Expiry blocks (~1 week default)
(define-read-only (get-order-expiry)
  (var-get order-expiry-blocks)
)

;; @notice Check if an order has expired
;; @param order-id Order to check
;; @return bool True if expired
(define-read-only (is-order-expired (order-id uint))
  (match (map-get? orders { order-id: order-id })
    order-data 
      (and 
        (is-eq (get status order-data) STATUS_PENDING)
        (> block-height (+ (get created-at order-data) (var-get order-expiry-blocks)))
      )
    false
  )
)

;; @notice Get pending admin for time-locked transfer
;; @return Optional principal
(define-read-only (get-pending-admin)
  (var-get pending-admin)
)

;; @notice Get admin transfer unlock block
;; @return uint Block when transfer can complete
(define-read-only (get-admin-transfer-unlock-block)
  (var-get admin-transfer-unlock-block)
)

;; @notice Get count of active admins
;; @return uint Admin count
(define-read-only (get-admin-count)
  (var-get admin-count)
)

;; ============================================
;; Public Functions - User Actions
;; ============================================

;; Create a new off-ramp order
;; Locks STX in escrow until confirmed or cancelled
;; @notice Create a new off-ramp order
;; @param amount STX amount to deposit
;; @param fiat-amount Expected fiat amount
;; @param fiat-currency Target currency (NGN/KES/GHS)
;; @param bank-details-hash Encrypted bank details
;; @return (response uint uint) Order ID or error
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
;; @notice Cancel a pending order (user only)
;; @param order-id Order to cancel
;; @return (response bool uint)
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
      refunded: order-amount,
      block: block-height
    })

    (ok true)
  )
)

;; ============================================
;; Order Expiry Actions
;; ============================================

;; @notice Expire a stale pending order (anyone can call)
;; @param order-id Order to expire
;; @return (response bool uint)
(define-public (expire-order (order-id uint))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (order-sender (get sender order))
      (order-amount (get amount order))
    )

    ;; Order must be pending
    (asserts! (is-eq (get status order) STATUS_PENDING) ERR_ORDER_NOT_PENDING)
    ;; Order must have expired
    (asserts! (> block-height (+ (get created-at order) (var-get order-expiry-blocks))) ERR_ORDER_EXPIRED)

    ;; Refund full amount to sender
    (try! (transfer-from-escrow order-amount order-sender))

    ;; Update escrow tracking
    (var-set total-escrowed (- (var-get total-escrowed) order-amount))

    ;; Update order status to refunded (expired)
    (map-set orders
      { order-id: order-id }
      (merge order { status: STATUS_REFUNDED })
    )

    ;; Emit event
    (print {
      event: "order-expired",
      order-id: order-id,
      sender: order-sender,
      refunded: order-amount,
      expired-by: tx-sender,
      block: block-height
    })

    (ok true)
  )
)

;; ============================================
;; Admin Functions
;; ============================================

;; Mark order as processing (backend picked it up)
;; OPTIMIZED: Using is-admin helper reduces var-get calls
;; @notice Mark order as processing (admin only)
;; @param order-id Order to mark
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
;; @notice Confirm order completion (admin only)
;; @param order-id Order to confirm
;; @param paycrest-ref Paycrest transaction reference
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
;; @notice Force refund an order (admin only)
;; @param order-id Order to refund
;; @param reason Refund reason string
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
      reason: reason,
      block: block-height
    })

    (ok true)
  )
)

;; Partial refund when settlement fails after partial success
;; @notice Partial refund for failed settlements (admin only)
;; @param order-id Order to partially refund
;; @param settled-amount Amount that was successfully settled
;; @param paycrest-ref Paycrest reference for settled portion
;; @param failure-reason Reason for partial failure
(define-public (partial-refund 
    (order-id uint) 
    (settled-amount uint)
    (paycrest-ref (buff 64))
    (failure-reason (string-ascii 64)))
  (let
    (
      (order (unwrap! (get-order order-id) ERR_ORDER_NOT_FOUND))
      (order-sender (get sender order))
      (order-amount (get amount order))
      (fee (calculate-fee settled-amount))
      (refund-amount (- order-amount settled-amount))
      (current-treasury (var-get treasury))
    )

    ;; Only admin can partial refund
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    ;; Only processing orders can be partially refunded
    (asserts! (is-eq (get status order) STATUS_PROCESSING) ERR_ORDER_NOT_PENDING)
    ;; Settled amount must be less than order amount
    (asserts! (< settled-amount order-amount) ERR_INVALID_AMOUNT)
    ;; Settled amount must be > 0
    (asserts! (> settled-amount u0) ERR_INVALID_AMOUNT)

    ;; Transfer settled amount (minus fee) to treasury
    (try! (transfer-from-escrow (- settled-amount fee) current-treasury))
    ;; Refund the remaining amount to sender
    (try! (transfer-from-escrow refund-amount order-sender))

    ;; Update escrow tracking
    (var-set total-escrowed (- (var-get total-escrowed) order-amount))
    ;; Track fees from the settled portion
    (var-set total-fees-collected (+ (var-get total-fees-collected) fee))

    ;; Update order status to partial
    (map-set orders
      { order-id: order-id }
      (merge order { 
        status: STATUS_PARTIAL,
        confirmed-at: (some block-height),
        paycrest-ref: (some paycrest-ref)
      })
    )

    (print {
      event: "order-partial-refund",
      order-id: order-id,
      sender: order-sender,
      settled-amount: settled-amount,
      refund-amount: refund-amount,
      fee: fee,
      paycrest-ref: paycrest-ref,
      reason: failure-reason,
      block: block-height
    })

    (ok true)
  )
)

;; Withdraw collected fees
;; OPTIMIZED: Using is-admin helper
;; @notice Withdraw collected fees (admin only)
;; @param amount Amount to withdraw
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

;; @notice Transfer admin role (admin only)
;; @param new-admin New admin address
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set admin new-admin)
    (print { event: "admin-updated", new-admin: new-admin, block: block-height })
    (ok true)
  )
)

;; ============================================
;; Multi-Admin Management (Owner Only)
;; ============================================

;; @notice Add a new admin to the admin list (owner only)
;; @param new-admin Principal to add as admin
(define-public (add-admin (new-admin principal))
  (begin
    (asserts! (is-owner) ERR_NOT_AUTHORIZED)
    ;; Check if already exists
    (asserts! (not (is-authorized-admin new-admin)) ERR_ADMIN_ALREADY_EXISTS)
    
    ;; Add to admin list
    (map-set admin-list
      { admin: new-admin }
      { active: true, added-at: block-height }
    )
    
    ;; Increment admin count
    (var-set admin-count (+ (var-get admin-count) u1))
    
    (print { event: "admin-added", admin: new-admin, block: block-height })
    (ok true)
  )
)

;; @notice Remove an admin from the admin list (owner only)
;; @param admin-to-remove Principal to remove
(define-public (remove-admin (admin-to-remove principal))
  (begin
    (asserts! (is-owner) ERR_NOT_AUTHORIZED)
    ;; Cannot remove contract owner
    (asserts! (not (is-eq admin-to-remove CONTRACT_OWNER)) ERR_NOT_AUTHORIZED)
    ;; Must have at least 1 admin remaining
    (asserts! (> (var-get admin-count) u1) ERR_CANNOT_REMOVE_LAST_ADMIN)
    ;; Must be in admin list
    (asserts! (is-authorized-admin admin-to-remove) ERR_ADMIN_NOT_FOUND)
    
    ;; Deactivate in admin list
    (map-set admin-list
      { admin: admin-to-remove }
      { active: false, added-at: u0 }
    )
    
    ;; Decrement admin count
    (var-set admin-count (- (var-get admin-count) u1))
    
    (print { event: "admin-removed", admin: admin-to-remove, block: block-height })
    (ok true)
  )
)

;; ============================================
;; Time-Locked Admin Transfer
;; ============================================

;; @notice Initiate a time-locked admin transfer (owner only)
;; @param new-primary-admin New primary admin after timelock
(define-public (initiate-admin-transfer (new-primary-admin principal))
  (begin
    (asserts! (is-owner) ERR_NOT_AUTHORIZED)
    
    (var-set pending-admin (some new-primary-admin))
    (var-set admin-transfer-unlock-block (+ block-height ADMIN_TRANSFER_DELAY))
    
    (print { 
      event: "admin-transfer-initiated", 
      pending-admin: new-primary-admin, 
      unlock-block: (+ block-height ADMIN_TRANSFER_DELAY),
      block: block-height 
    })
    (ok true)
  )
)

;; @notice Complete the time-locked admin transfer (new admin only)
(define-public (complete-admin-transfer)
  (let
    (
      (new-admin (unwrap! (var-get pending-admin) ERR_NO_PENDING_TRANSFER))
    )
    ;; Only pending admin can complete
    (asserts! (is-eq tx-sender new-admin) ERR_NOT_AUTHORIZED)
    ;; Timelock must have elapsed
    (asserts! (>= block-height (var-get admin-transfer-unlock-block)) ERR_TRANSFER_LOCKED)
    
    ;; Transfer admin
    (var-set admin new-admin)
    (var-set pending-admin none)
    (var-set admin-transfer-unlock-block u0)
    
    (print { event: "admin-transfer-completed", new-admin: new-admin, block: block-height })
    (ok true)
  )
)

;; @notice Cancel a pending admin transfer (owner only)
(define-public (cancel-admin-transfer)
  (begin
    (asserts! (is-owner) ERR_NOT_AUTHORIZED)
    (asserts! (is-some (var-get pending-admin)) ERR_NO_PENDING_TRANSFER)
    
    (var-set pending-admin none)
    (var-set admin-transfer-unlock-block u0)
    
    (print { event: "admin-transfer-cancelled", block: block-height })
    (ok true)
  )
)

;; @notice Update treasury address (admin only)
;; @param new-treasury New treasury address
(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set treasury new-treasury)
    (print { event: "treasury-updated", new-treasury: new-treasury })
    (ok true)
  )
)

;; @notice Update fee rate (admin only, max 5%)
;; @param new-fee-rate New rate in basis points
(define-public (set-fee-rate (new-rate uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-rate u500) ERR_INVALID_AMOUNT) ;; Max 5%
    (var-set fee-rate new-rate)
    (print { event: "fee-rate-updated", new-rate: new-rate })
    (ok true)
  )
)

;; @notice Toggle emergency pause (admin only)
;; @param is-paused New pause state
(define-public (set-paused (new-paused bool))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set paused new-paused)
    (print { event: "pause-toggled", paused: new-paused, block: block-height })
    (ok true)
  )
)

;; @notice Set order expiry period (admin only)
;; @param new-expiry New expiry in blocks
(define-public (set-order-expiry (new-expiry uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-expiry u0) ERR_INVALID_AMOUNT)
    (var-set order-expiry-blocks new-expiry)
    (print { event: "order-expiry-updated", new-expiry: new-expiry, block: block-height })
    (ok true)
  )
)

;; ============================================
;; Security Configuration (Admin Only)
;; ============================================

;; @notice Set minimum order amount (admin only)
;; @param new-min New minimum in uSTX
(define-public (set-min-order-amount (new-min uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-min u0) ERR_INVALID_AMOUNT)
    (var-set min-order-amount new-min)
    (print { event: "min-order-updated", new-min: new-min })
    (ok true)
  )
)

;; @notice Set maximum order amount (admin only)
;; @param new-max New maximum in uSTX
(define-public (set-max-order-amount (new-max uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (asserts! (> new-max (var-get min-order-amount)) ERR_INVALID_AMOUNT)
    (var-set max-order-amount new-max)
    (print { event: "max-order-updated", new-max: new-max })
    (ok true)
  )
)

;; @notice Set cooldown between orders (admin only)
;; @param new-cooldown Blocks to wait
(define-public (set-order-cooldown (new-cooldown uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (var-set order-cooldown-blocks new-cooldown)
    (print { event: "cooldown-updated", new-cooldown: new-cooldown })
    (ok true)
  )
)

;; @notice Set daily limit per user (admin only)
;; @param new-limit New limit in uSTX
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
;; @notice Enable or disable a token (admin only)
;; @param token Token contract principal
;; @param enabled Whether to enable
;; @param name Token display name
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
;; @notice Check if token is whitelisted
;; @param token Token to check
;; @return bool True if supported
(define-read-only (is-token-supported (token principal))
  (match (map-get? supported-tokens { token: token })
    token-data (get enabled token-data)
    false
  )
)

;; ============================================
;; Currency Support Functions
;; ============================================

;; Admin: Enable or disable a fiat currency
(define-public (set-currency-enabled 
    (currency (string-ascii 3)) 
    (enabled bool) 
    (name (string-ascii 32))
    (min-amount uint))
  (begin
    (asserts! (is-admin) ERR_NOT_AUTHORIZED)
    (map-set supported-currencies
      { currency: currency }
      { enabled: enabled, name: name, min-amount: min-amount }
    )
    (print { event: "currency-updated", currency: currency, enabled: enabled, name: name })
    (ok true)
  )
)

;; Check if a currency is supported
(define-read-only (is-currency-supported (currency (string-ascii 3)))
  (match (map-get? supported-currencies { currency: currency })
    currency-data (get enabled currency-data)
    true  ;; Default: all currencies accepted if not explicitly disabled
  )
)

;; Get currency info
(define-read-only (get-currency-info (currency (string-ascii 3)))
  (map-get? supported-currencies { currency: currency })
)

;; Get list of currently active currencies (Nigerian Naira, Kenyan Shilling, Ghanaian Cedi)
(define-read-only (get-supported-currencies)
  (list "NGN" "KES" "GHS")
)

;; Get token info
;; @notice Get token configuration
;; @param token Token contract
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
;; @notice Create a new off-ramp order
;; @param amount STX amount to deposit
;; @param fiat-amount Expected fiat amount
;; @param fiat-currency Target currency (NGN/KES/GHS)
;; @param bank-details-hash Encrypted bank details
;; @return (response uint uint) Order ID or error
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

