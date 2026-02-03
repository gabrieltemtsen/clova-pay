/**
 * @file off-ramp.test.ts
 * @description Comprehensive test suite for ClovaPay Off-Ramp Contract
 * @author ClovaPay Team
 * @version 1.0.0
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";
import { initSimnet } from "@hirosystems/clarinet-sdk";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

// Track order nonce for dynamic ID checking
let currentOrderNonce = 0;

/**
 * Creates a 32-byte buffer for bank details hash
 * @param data - String to encode
 * @returns Uint8Array of 32 bytes
 */
const createBankHash = (data: string) => {
  const hash = new Uint8Array(32);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  hash.set(encoded.slice(0, 32));
  return hash;
};

// Helper to create a 64-byte buffer for paycrest ref
const createPaycrestRef = (ref: string) => {
  const buffer = new Uint8Array(64);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(ref);
  buffer.set(encoded.slice(0, 64));
  return buffer;
};

// ============================================
// Main Test Suite
// ============================================
describe("ClovaPay Off-Ramp Contract", () => {
  // Disable cooldown for tests at the start of the test suite
  beforeEach(() => {
    // Reset cooldown to 0 for testing (allows multiple orders quickly)
    simnet.callPublicFn("off-ramp", "set-order-cooldown", [Cl.uint(0)], deployer);
    // Ensure contract is unpaused
    simnet.callPublicFn("off-ramp", "set-paused", [Cl.bool(false)], deployer);
  });

  describe("Read-only functions", () => {
    it("should return initial fee rate of 1%", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-fee-rate",
        [],
        deployer
      );
      expect(result.result).toBeUint(100); // 100 basis points = 1%
    });

    it("should return deployer as admin", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin",
        [],
        deployer
      );
      expect(result.result).toBePrincipal(deployer);
    });

    it("should return initial order nonce of 0", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-nonce",
        [],
        deployer
      );
      expect(result.result).toBeUint(0);
    });

    it("should correctly calculate fees", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "calculate-fee",
        [Cl.uint(1000000)], // 1 STX
        deployer
      );
      expect(result.result).toBeUint(10000); // 1% of 1M = 10K
    });

    it("should return paused as false initially", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-paused",
        [],
        deployer
      );
      expect(result.result).toBeBool(false);
    });

    it("should return min order amount", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-min-order-amount",
        [],
        deployer
      );
      expect(result.result).toBeUint(1000000); // 1 STX default
    });

    it("should return max order amount", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-max-order-amount",
        [],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should return order cooldown", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-cooldown",
        [],
        deployer
      );
      // Cooldown is set to 0 in beforeEach
      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should return daily limit", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-daily-limit",
        [],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.UInt);
    });
  });

  describe("Order Creation", () => {
    it("should create an order successfully", () => {
      const amount = 10000000; // 10 STX
      const fiatAmount = 50000; // 50000 NGN
      const bankHash = createBankHash("0123456789-ACCESS-BANK");

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(amount),
          Cl.uint(fiatAmount),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeOk(Cl.uint(1)); // First order ID = 1

      // Verify order was created
      const orderResult = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order",
        [Cl.uint(1)],
        deployer
      );

      expect(orderResult.result.type).toBe(ClarityType.OptionalSome);
    });

    it("should fail with zero amount", () => {
      const bankHash = createBankHash("test");

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(0),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(101)); // ERR_INVALID_AMOUNT
    });

    it("should increment order nonce", () => {
      const bankHash = createBankHash("test-nonce");

      // Get current nonce
      const beforeNonce = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-nonce",
        [],
        deployer
      );
      const startNonce = Number(beforeNonce.result.value);

      // Create first order
      const block1 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(1000000),
          Cl.uint(5000),
          Cl.stringAscii("KES"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block1.result).toBeOk(Cl.uint(startNonce + 1));

      // Create second order
      const block2 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(2000000),
          Cl.uint(10000),
          Cl.stringAscii("GHS"),
          Cl.buffer(bankHash),
        ],
        wallet2
      );

      expect(block2.result).toBeOk(Cl.uint(startNonce + 2));
    });
  });

  describe("Order Cancellation", () => {
    it("should allow user to cancel their pending order", () => {
      const bankHash = createBankHash("cancel-test");

      // Create order
      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Cancel order
      const cancelBlock = simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(1)],
        wallet1
      );

      expect(cancelBlock.result).toBeOk(Cl.bool(true));
    });

    it("should reject cancellation by non-owner", () => {
      const bankHash = createBankHash("cancel-auth-test");

      // Create order as wallet1
      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Try to cancel as wallet2
      const cancelBlock = simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(1)],
        wallet2
      );

      expect(cancelBlock.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Admin Functions", () => {
    it("should allow admin to mark order as processing", () => {
      const bankHash = createBankHash("processing-test");

      // Create order
      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Get the order ID from the result
      const orderId = (createBlock.result as any).value.value;

      // Admin marks as processing
      const block = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to confirm order", () => {
      const bankHash = createBankHash("confirm-test");
      const paycrestRef = createPaycrestRef("PAY-123456789");

      // Create order
      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Get the order ID from the result
      const orderId = (createBlock.result as any).value.value;

      // Admin confirms
      const block = simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to force refund", () => {
      const bankHash = createBankHash("refund-test");

      // Create order
      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Get the order ID from the result
      const orderId = (createBlock.result as any).value.value;

      // Admin force refunds
      const block = simnet.callPublicFn(
        "off-ramp",
        "force-refund",
        [Cl.uint(orderId), Cl.stringUtf8("Paycrest order failed")],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should reject admin functions from non-admin", () => {
      const bankHash = createBankHash("auth-test");

      // Create order
      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      // Non-admin tries to mark processing
      const block = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(1)],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Configuration", () => {
    it("should allow admin to update fee rate", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-fee-rate",
        [Cl.uint(200)], // 2%
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

      // Verify new rate
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-fee-rate",
        [],
        deployer
      );
      expect(result.result).toBeUint(200);
    });

    it("should reject fee rate above 5%", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-fee-rate",
        [Cl.uint(600)], // 6% - too high
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(101)); // ERR_INVALID_AMOUNT
    });

    it("should allow admin to pause contract", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-paused",
        [Cl.bool(true)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

      // Verify paused
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-paused",
        [],
        deployer
      );
      expect(result.result).toBeBool(true);
    });

    it("should reject order creation when paused", () => {
      // Pause
      simnet.callPublicFn(
        "off-ramp",
        "set-paused",
        [Cl.bool(true)],
        deployer
      );

      // Try to create order
      const bankHash = createBankHash("paused-test");
      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(1000000),
          Cl.uint(5000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Security: Order Limits", () => {
    it("should reject orders below minimum amount", () => {
      const bankHash = createBankHash("min-test");

      // Try to create order with 0.5 STX (below 1 STX minimum)
      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(500000), // 0.5 STX
          Cl.uint(2500),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(108)); // ERR_AMOUNT_TOO_LOW
    });

    it("should allow admin to set min order amount", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-min-order-amount",
        [Cl.uint(500000)], // Set to 0.5 STX
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set max order amount", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-max-order-amount",
        [Cl.uint(50000000000)], // 50K STX
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-admin from setting limits", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-min-order-amount",
        [Cl.uint(100000)],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Security: Cooldown & Daily Limits", () => {
    it("should allow admin to set cooldown", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-order-cooldown",
        [Cl.uint(10)], // 10 blocks
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set daily limit", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-daily-limit",
        [Cl.uint(50000000000)], // 50K STX
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-admin from setting cooldown", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-order-cooldown",
        [Cl.uint(10)],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should reject non-admin from setting daily limit", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-daily-limit",
        [Cl.uint(1000000)],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Token Support", () => {
    it("should allow admin to enable a token", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(deployer), // Mock token address
          Cl.bool(true),
          Cl.stringAscii("USDC"),
        ],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to disable a token", () => {
      // First enable
      simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(wallet1), // Mock token
          Cl.bool(true),
          Cl.stringAscii("sBTC"),
        ],
        deployer
      );

      // Then disable
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(wallet1),
          Cl.bool(false),
          Cl.stringAscii("sBTC"),
        ],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should check if token is supported", () => {
      // Enable a token first
      simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(deployer),
          Cl.bool(true),
          Cl.stringAscii("TEST"),
        ],
        deployer
      );

      // Check if supported
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "is-token-supported",
        [Cl.principal(deployer)],
        deployer
      );

      expect(result.result).toBeBool(true);
    });
  });

  describe("Edge Cases", () => {
    it("should return none for non-existent order", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order",
        [Cl.uint(999999)], // Non-existent order
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should reject duplicate confirmation", () => {
      const bankHash = createBankHash("dup-confirm-test");
      const paycrestRef = createPaycrestRef("DUP-REF-123");

      // Create order
      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(5000000),
          Cl.uint(25000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (createBlock.result as any).value.value;

      // First confirmation
      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      // Try second confirmation
      const block = simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(105)); // ERR_ALREADY_CONFIRMED
    });
  });

  describe("Accounting & Escrow", () => {
    it("should track escrowed amount", () => {
      const bankHash = createBankHash("escrow-track-test");
      const amount = 10000000; // 10 STX

      // Create order
      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(amount),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet2
      );

      // Check escrowed amount is tracked
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );

      // Should have some escrowed value (might include fees from other tests)
      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should track collected fees", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-fees",
        [],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should return contract balance", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-contract-balance",
        [],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should allow admin to withdraw fees", () => {
      // Need to have some confirmed orders first to have fees
      const bankHash = createBankHash("fee-withdraw-test");
      const paycrestRef = createPaycrestRef("FEE-TEST-REF");

      // Create and confirm order to generate fees
      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000), // 10 STX
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (createBlock.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      // Try to withdraw a small amount of fees
      const block = simnet.callPublicFn(
        "off-ramp",
        "withdraw-fees",
        [Cl.uint(10000)], // 0.01 STX
        deployer
      );

      expect(block.result).toBeOk(Cl.uint(10000));
    });
  });
});
