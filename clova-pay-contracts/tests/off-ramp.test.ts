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
const wallet3 = accounts.get("wallet_3")!;

// Mock token contract for SIP-010 tests
const mockTokenContract = "mock-sip010-token";

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

/**
 * Creates a 64-byte buffer for Paycrest reference
 * @param ref - Reference string to encode
 * @returns Uint8Array of 64 bytes
 */
const createPaycrestRef = (ref: string) => {
  const buffer = new Uint8Array(64);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(ref);
  buffer.set(encoded.slice(0, 64));
  return buffer;
};

// Helper to advance blocks
const advanceBlocks = (count: number) => {
  for (let i = 0; i < count; i++) {
    simnet.mineEmptyBlock();
  }
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

  // --- Read-Only Functions ---
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

    it("should return contract version", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-contract-version",
        [],
        deployer
      );
      expect(result.result).toBeAscii("1.1.0");
    });

    it("should return order expiry", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-expiry",
        [],
        deployer
      );
      expect(result.result).toBeUint(1008);
    });

    it("should return total escrowed", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );
      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should return total fees collected", () => {
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
  });

  // --- Order Creation ---
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

      expect(block.result).toBeOk(Cl.uint(1));

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

      expect(block.result).toBeErr(Cl.uint(101));
    });

    it("should increment order nonce", () => {
      const bankHash = createBankHash("test-nonce");

      const beforeNonce = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-nonce",
        [],
        deployer
      );
      const startNonce = Number(beforeNonce.result.value);

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

  // --- Order Cancellation ---
  describe("Order Cancellation", () => {
    it("should allow user to cancel their pending order", () => {
      const bankHash = createBankHash("cancel-test");

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

      const cancelBlock = simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(1)],
        wallet2
      );

      expect(cancelBlock.result).toBeErr(Cl.uint(100));
    });
  });

  // --- Admin Functions ---
  describe("Admin Functions", () => {
    it("should allow admin to mark order as processing", () => {
      const bankHash = createBankHash("processing-test");

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

      const block = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(1)],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(100));
    });
  });

  // --- Configuration ---
  describe("Configuration", () => {
    it("should allow admin to update fee rate", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-fee-rate",
        [Cl.uint(200)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

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
        [Cl.uint(600)],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(101));
    });

    it("should allow admin to pause contract", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-paused",
        [Cl.bool(true)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-paused",
        [],
        deployer
      );
      expect(result.result).toBeBool(true);
    });

    it("should reject order creation when paused", () => {
      simnet.callPublicFn(
        "off-ramp",
        "set-paused",
        [Cl.bool(true)],
        deployer
      );

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

      expect(block.result).toBeErr(Cl.uint(100));
    });

    it("should allow admin to set order expiry", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-order-expiry",
        [Cl.uint(500)],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));
    });
  });

  // --- Security: Order Limits ---
  describe("Security: Order Limits", () => {
    it("should reject orders below minimum amount", () => {
      const bankHash = createBankHash("min-test");

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(500000),
          Cl.uint(2500),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(108));
    });

    it("should allow admin to set min order amount", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-min-order-amount",
        [Cl.uint(500000)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set max order amount", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-max-order-amount",
        [Cl.uint(50000000000)],
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

      expect(block.result).toBeErr(Cl.uint(100));
    });
  });

  // --- Security: Cooldown & Daily Limits ---
  describe("Security: Cooldown & Daily Limits", () => {
    beforeEach(() => {
      // Reset cooldown to default for these tests
      simnet.callPublicFn(
        "off-ramp",
        "set-order-cooldown",
        [Cl.uint(6)],
        deployer
      );
    });

    it("should allow admin to set cooldown", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-order-cooldown",
        [Cl.uint(10)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set daily limit", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-daily-limit",
        [Cl.uint(50000000000)],
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

      expect(block.result).toBeErr(Cl.uint(100));
    });

    it("should enforce cooldown between orders", () => {
      const bankHash = createBankHash("cooldown-test");

      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(110));
    });

    it("should enforce daily volume limit", () => {
      const bankHash = createBankHash("daily-limit-test");
      
      simnet.callPublicFn(
        "off-ramp",
        "set-daily-limit",
        [Cl.uint(10000000000)], // 10,000 STX
        deployer
      );

      for (let i = 0; i < 4; i++) {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(2000000000),
            Cl.uint(10000),
            Cl.stringAscii("NGN"),
            Cl.buffer(bankHash),
          ],
          wallet1
        );
        expect(block.result).toBeOk(Cl.uint(i + 1));
      }

      const block5 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(2000000000),
          Cl.uint(10000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block5.result).toBeErr(Cl.uint(111));
    });

    it("should reset daily limit after blocks pass", () => {
      const bankHash = createBankHash("reset-test");
      
      simnet.callPublicFn(
        "off-ramp",
        "set-daily-limit",
        [Cl.uint(10000000000)], // 10,000 STX
        deployer
      );

      simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(9000000000),
          Cl.uint(45000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const block1 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(2000000000),
          Cl.uint(10000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );
      expect(block1.result).toBeErr(Cl.uint(111));

      advanceBlocks(145);

      const block2 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(2000000000),
          Cl.uint(10000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );
      expect(block2.result).toBeOk(Cl.uint(2));
    });
  });

  // --- Token Support ---
  describe("Token Support", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(mockTokenContract),
          Cl.bool(true),
          Cl.stringAscii("MOCK"),
        ],
        deployer
      );
    });

    it("should allow admin to enable a token", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(deployer),
          Cl.bool(true),
          Cl.stringAscii("USDC"),
        ],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to disable a token", () => {
      simnet.callPublicFn(
        "off-ramp",
        "set-token-enabled",
        [
          Cl.principal(wallet1),
          Cl.bool(true),
          Cl.stringAscii("sBTC"),
        ],
        deployer
      );

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
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "is-token-supported",
        [Cl.principal(mockTokenContract)],
        deployer
      );

      expect(result.result).toBeBool(true);
    });

    it("should create token order successfully", () => {
      const bankHash = createBankHash("token-order-test");

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order-token",
        [
          Cl.principal(mockTokenContract),
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeOk(Cl.uint(1));

      const tokenOrder = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-token",
        [Cl.uint(1)],
        deployer
      );

      expect(tokenOrder.result).toBeSome(Cl.tuple({
        token: Cl.principal(mockTokenContract)
      }));
    });

    it("should reject token order for unsupported token", () => {
      const bankHash = createBankHash("unsupported-test");
      const unsupportedToken = "unsupported-token";

      const block = simnet.callPublicFn(
        "off-ramp",
        "create-order-token",
        [
          Cl.principal(unsupportedToken),
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(107));
    });

    it("should track token order in user orders list", () => {
      const bankHash = createBankHash("user-token-test");

      simnet.callPublicFn(
        "off-ramp",
        "create-order-token",
        [
          Cl.principal(mockTokenContract),
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const userOrders = simnet.callReadOnlyFn(
        "off-ramp",
        "get-user-orders",
        [Cl.principal(wallet1)],
        deployer
      );

      const orderIds = (userOrders.result as any).value["order-ids"].value;
      expect(orderIds).toContainEqual(Cl.uint(1));
    });
  });

  // --- Multi-Currency Support ---
  describe("Multi-Currency Support", () => {
    it("should support all major African currencies", () => {
      const currencies = ["NGN", "KES", "GHS", "UGX", "TZS"];
      const bankHash = createBankHash("currency-test");

      currencies.forEach((currency, index) => {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(10000000),
            Cl.uint(50000 * (index + 1)),
            Cl.stringAscii(currency),
            Cl.buffer(bankHash),
          ],
          wallet1
        );

        expect(block.result).toBeOk(Cl.uint(index + 1));
      });
    });

    it("should allow admin to configure currency-specific minimums", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-currency-enabled",
        [
          Cl.stringAscii("NGN"),
          Cl.bool(true),
          Cl.stringAscii("Nigerian Naira"),
          Cl.uint(1000)
        ],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-currency-info",
        [Cl.stringAscii("NGN")],
        deployer
      );

      expect(result.result).toBeSome(Cl.tuple({
        enabled: Cl.bool(true),
        name: Cl.stringAscii("Nigerian Naira"),
        "min-amount": Cl.uint(1000)
      }));
    });

    it("should return supported currencies list", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-supported-currencies",
        [],
        deployer
      );

      const currencies = (result.result as any).value;
      expect(currencies).toContainEqual(Cl.stringAscii("NGN"));
      expect(currencies).toContainEqual(Cl.stringAscii("KES"));
      expect(currencies).toContainEqual(Cl.stringAscii("GHS"));
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should return none for non-existent order", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order",
        [Cl.uint(999999)],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should reject duplicate confirmation", () => {
      const bankHash = createBankHash("dup-confirm-test");
      const paycrestRef = createPaycrestRef("DUP-REF-123");

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

      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(105));
    });

    it("should return false for non-expired fresh order", () => {
      const bankHash = createBankHash("expiry-test");

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

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "is-order-expired",
        [Cl.uint(orderId)],
        deployer
      );
      expect(result.result).toBeBool(false);
    });
  });

  // --- Accounting & Escrow ---
  describe("Accounting & Escrow", () => {
    it("should track escrowed amount", () => {
      const bankHash = createBankHash("escrow-track-test");
      const amount = 10000000;

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

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );

      expect(result.result.type).toBe(ClarityType.UInt);
    });

    it("should allow admin to withdraw fees", () => {
      const bankHash = createBankHash("fee-withdraw-test");
      const paycrestRef = createPaycrestRef("FEE-TEST-REF");

      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
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

      const block = simnet.callPublicFn(
        "off-ramp",
        "withdraw-fees",
        [Cl.uint(10000)],
        deployer
      );

      expect(block.result).toBeOk(Cl.uint(10000));
    });

    it("should maintain escrow balance invariant", () => {
      const bankHash = createBankHash("invariant-test");

      const initialEscrow = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );

      const amount = 10000000;
      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(amount),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      const afterCreate = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );

      expect(Number(afterCreate.result.value)).toBe(
        Number(initialEscrow.result.value) + amount
      );

      simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(orderId)],
        wallet1
      );

      const afterCancel = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-escrowed",
        [],
        deployer
      );

      expect(Number(afterCancel.result.value)).toBe(Number(initialEscrow.result.value));
    });
  });

  // --- Multi-Admin Functions ---
  describe("Multi-Admin Support", () => {
    it("should return initial admin count of 1", () => {
      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin-count",
        [],
        deployer
      );
      expect(result.result).toBeUint(1);
    });

    it("should allow owner to add new admin", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));

      const count = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin-count",
        [],
        deployer
      );
      expect(count.result).toBeUint(2);
    });

    it("should correctly identify authorized admin", () => {
      simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "is-authorized-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result.result).toBeBool(true);
    });

    it("should reject non-owner from adding admin", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet2)],
        wallet1
      );
      expect(block.result).toBeErr(Cl.uint(100));
    });

    it("should reject adding existing admin", () => {
      simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(block.result).toBeErr(Cl.uint(112));
    });

    it("should allow owner to remove admin", () => {
      simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "remove-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));

      const count = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin-count",
        [],
        deployer
      );
      expect(count.result).toBeUint(1);
    });

    it("should prevent removing the last admin", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "remove-admin",
        [Cl.principal(deployer)],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(114));
    });

    it("should allow multiple admins to perform admin functions", () => {
      simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const bankHash = createBankHash("multi-admin-test");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet2
      );

      const orderId = (order.result as any).value.value;

      const block = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        wallet1
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });
  });

  // --- Time-Locked Admin Transfer ---
  describe("Time-Locked Admin Transfer", () => {
    it("should allow owner to initiate admin transfer", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should return pending admin after initiation", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      const result = simnet.callReadOnlyFn(
        "off-ramp",
        "get-pending-admin",
        [],
        deployer
      );
      expect(result.result).toBeSome(Cl.principal(wallet1));

      const unlockBlock = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin-transfer-unlock-block",
        [],
        deployer
      );
      expect(unlockBlock.result.type).toBe(ClarityType.UInt);
    });

    it("should reject immediate completion (timelock not elapsed)", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "complete-admin-transfer",
        [],
        wallet1
      );
      expect(block.result).toBeErr(Cl.uint(116));
    });

    it("should allow completion after timelock", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      advanceBlocks(150);

      const block = simnet.callPublicFn(
        "off-ramp",
        "complete-admin-transfer",
        [],
        wallet1
      );
      expect(block.result).toBeOk(Cl.bool(true));

      const admin = simnet.callReadOnlyFn(
        "off-ramp",
        "get-admin",
        [],
        deployer
      );
      expect(admin.result).toBePrincipal(wallet1);
    });

    it("should allow owner to cancel pending transfer", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "cancel-admin-transfer",
        [],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));

      const pending = simnet.callReadOnlyFn(
        "off-ramp",
        "get-pending-admin",
        [],
        deployer
      );
      expect(pending.result.type).toBe(ClarityType.OptionalNone);
    });

    it("should reject cancel when no transfer pending", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "cancel-admin-transfer",
        [],
        deployer
      );
      expect(block.result).toBeErr(Cl.uint(115));
    });

    it("should allow multiple pending transfers (overwrite)", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet2)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));

      const pending = simnet.callReadOnlyFn(
        "off-ramp",
        "get-pending-admin",
        [],
        deployer
      );
      expect(pending.result).toBeSome(Cl.principal(wallet2));
    });

    it("should preserve admin privileges during transfer window", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "set-fee-rate",
        [Cl.uint(150)],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should allow completion only by pending admin", () => {
      simnet.callPublicFn(
        "off-ramp",
        "initiate-admin-transfer",
        [Cl.principal(wallet1)],
        deployer
      );

      advanceBlocks(150);

      const block = simnet.callPublicFn(
        "off-ramp",
        "complete-admin-transfer",
        [],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(100));
    });
  });

  // --- Order Expiry ---
  describe("Order Expiry", () => {
    it("should allow admin to set order expiry", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-order-expiry",
        [Cl.uint(500)],
        deployer
      );
      expect(block.result).toBeOk(Cl.bool(true));

      const expiry = simnet.callReadOnlyFn(
        "off-ramp",
        "get-order-expiry",
        [],
        deployer
      );
      expect(expiry.result).toBeUint(500);
    });

    it("should allow anyone to expire stale orders", () => {
      const bankHash = createBankHash("stale-order-test");

      simnet.callPublicFn(
        "off-ramp",
        "set-order-expiry",
        [Cl.uint(10)],
        deployer
      );

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      advanceBlocks(15);

      const block = simnet.callPublicFn(
        "off-ramp",
        "expire-order",
        [Cl.uint(orderId)],
        wallet2
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should reject expire-order for non-expired order", () => {
      const bankHash = createBankHash("no-expire-test");

      simnet.callPublicFn(
        "off-ramp",
        "set-order-expiry",
        [Cl.uint(100)],
        deployer
      );

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

      const block = simnet.callPublicFn(
        "off-ramp",
        "expire-order",
        [Cl.uint(orderId)],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(117));
    });

    it("should prevent expiring non-pending orders", () => {
      const bankHash = createBankHash("expire-confirmed-test");
      const paycrestRef = createPaycrestRef("EXPIRE-CONFIRMED");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "expire-order",
        [Cl.uint(orderId)],
        wallet2
      );

      expect(block.result).toBeErr(Cl.uint(103));
    });
  });

  // --- Partial Refunds ---
  describe("Partial Refunds", () => {
    it("should allow admin to partial refund processing order", () => {
      const bankHash = createBankHash("partial-refund-test");
      const paycrestRef = createPaycrestRef("PARTIAL-REF-123");

      const createBlock = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (createBlock.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "partial-refund",
        [
          Cl.uint(orderId),
          Cl.uint(6000000),
          Cl.buffer(paycrestRef),
          Cl.stringAscii("Bridge timeout after partial settlement"),
        ],
        deployer
      );

      expect(block.result).toBeOk(Cl.bool(true));
    });

    it("should reject partial refund on pending order", () => {
      const bankHash = createBankHash("partial-pending-test");
      const paycrestRef = createPaycrestRef("PARTIAL-FAIL-REF");

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

      const block = simnet.callPublicFn(
        "off-ramp",
        "partial-refund",
        [
          Cl.uint(orderId),
          Cl.uint(3000000),
          Cl.buffer(paycrestRef),
          Cl.stringAscii("Test failure"),
        ],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(103));
    });

    it("should reject partial refund with settled >= order amount", () => {
      const bankHash = createBankHash("partial-invalid-amt");
      const paycrestRef = createPaycrestRef("PARTIAL-INVALID");

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

      simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "partial-refund",
        [
          Cl.uint(orderId),
          Cl.uint(5000000),
          Cl.buffer(paycrestRef),
          Cl.stringAscii("Invalid amount"),
        ],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(101));
    });

    it("should handle partial refund with zero settled amount", () => {
      const bankHash = createBankHash("partial-zero-test");
      const paycrestRef = createPaycrestRef("ZERO-REF");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "partial-refund",
        [
          Cl.uint(orderId),
          Cl.uint(0),
          Cl.buffer(paycrestRef),
          Cl.stringAscii("Zero settlement"),
        ],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(101));
    });

    it("should calculate correct fee on partial settlement", () => {
      const bankHash = createBankHash("partial-fee-test");
      const paycrestRef = createPaycrestRef("FEE-CALC-REF");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      const feesBefore = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-fees",
        [],
        deployer
      );

      simnet.callPublicFn(
        "off-ramp",
        "partial-refund",
        [
          Cl.uint(orderId),
          Cl.uint(6000000),
          Cl.buffer(paycrestRef),
          Cl.stringAscii("Partial settlement"),
        ],
        deployer
      );

      const feesAfter = simnet.callReadOnlyFn(
        "off-ramp",
        "get-total-fees",
        [],
        deployer
      );

      const feeIncrease = Number(feesAfter.result.value) - Number(feesBefore.result.value);
      expect(feeIncrease).toBe(60000);
    });
  });

  // --- Batch Operations ---
  describe("Batch Operations", () => {
    it("should batch mark multiple orders as processing", () => {
      const bankHash1 = createBankHash("batch-test-1");
      const bankHash2 = createBankHash("batch-test-2");
      const bankHash3 = createBankHash("batch-test-3");

      const order1 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [Cl.uint(5000000), Cl.uint(25000), Cl.stringAscii("NGN"), Cl.buffer(bankHash1)],
        wallet1
      );
      const order2 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [Cl.uint(6000000), Cl.uint(30000), Cl.stringAscii("KES"), Cl.buffer(bankHash2)],
        wallet1
      );
      const order3 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [Cl.uint(7000000), Cl.uint(35000), Cl.stringAscii("GHS"), Cl.buffer(bankHash3)],
        wallet2
      );

      const orderId1 = (order1.result as any).value.value;
      const orderId2 = (order2.result as any).value.value;
      const orderId3 = (order3.result as any).value.value;

      const block = simnet.callPublicFn(
        "off-ramp",
        "batch-mark-processing",
        [Cl.list([Cl.uint(orderId1), Cl.uint(orderId2), Cl.uint(orderId3)])],
        deployer
      );

      expect(block.result).toBeOk(Cl.uint(3));
    });

    it("should reject batch operations from non-admin", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "batch-mark-processing",
        [Cl.list([Cl.uint(1), Cl.uint(2)])],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100));
    });

    it("should reject empty batch", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "batch-mark-processing",
        [Cl.list([])],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(101));
    });

    it("should handle batch with some invalid orders", () => {
      const bankHash = createBankHash("batch-mixed-test");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [Cl.uint(5000000), Cl.uint(25000), Cl.stringAscii("NGN"), Cl.buffer(bankHash)],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      const block = simnet.callPublicFn(
        "off-ramp",
        "batch-mark-processing",
        [Cl.list([Cl.uint(orderId), Cl.uint(99999)])],
        deployer
      );

      expect(block.result).toBeOk(Cl.uint(1));
    });
  });

  // --- Stress Tests ---
  describe("Stress Tests", () => {
    it("should handle maximum orders per user (50)", () => {
      const bankHash = createBankHash("max-orders-test");

      for (let i = 0; i < 50; i++) {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(10000000),
            Cl.uint(50000),
            Cl.stringAscii("NGN"),
            Cl.buffer(bankHash),
          ],
          wallet1
        );
        expect(block.result).toBeOk(Cl.uint(i + 1));
      }

      const block51 = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      expect(block51.result).toBeErr(Cl.uint(106));
    });

    it("should handle multiple users creating orders simultaneously", () => {
      const bankHash = createBankHash("multi-user-test");
      const users = [wallet1, wallet2, deployer];

      users.forEach((user, index) => {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(10000000),
            Cl.uint(50000),
            Cl.stringAscii("NGN"),
            Cl.buffer(bankHash),
          ],
          user
        );
        expect(block.result).toBeOk(Cl.uint(index + 1));
      });

      for (let i = 1; i <= users.length; i++) {
        const order = simnet.callReadOnlyFn(
          "off-ramp",
          "get-order",
          [Cl.uint(i)],
          deployer
        );
        expect(order.result.type).toBe(ClarityType.OptionalSome);
      }
    });

    it("should handle interleaved operations", () => {
      const bankHash = createBankHash("interleaved-test");
      const paycrestRef = createPaycrestRef("INTERLEAVED-REF");

      const orders = [];
      for (let i = 0; i < 5; i++) {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(10000000),
            Cl.uint(50000),
            Cl.stringAscii("NGN"),
            Cl.buffer(bankHash),
          ],
          wallet1
        );
        orders.push((block.result as any).value.value);
      }

      simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orders[0])],
        deployer
      );

      simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(orders[1])],
        wallet1
      );

      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orders[2]), Cl.buffer(paycrestRef)],
        deployer
      );

      for (let i = 3; i < 5; i++) {
        const order = simnet.callReadOnlyFn(
          "off-ramp",
          "get-order",
          [Cl.uint(orders[i])],
          deployer
        );
        expect(order.result.type).toBe(ClarityType.OptionalSome);
      }
    });
  });

  // --- Security & Access Control ---
  describe("Security & Access Control", () => {
    it("should prevent unauthorized fee withdrawal", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "withdraw-fees",
        [Cl.uint(1000000)],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100));
    });

    it("should prevent withdrawing more than collected fees", () => {
      const bankHash = createBankHash("fee-overdraft-test");
      const paycrestRef = createPaycrestRef("OVERDRAFT-REF");

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet1
      );

      const orderId = (order.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "confirm-order",
        [Cl.uint(orderId), Cl.buffer(paycrestRef)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "withdraw-fees",
        [Cl.uint(1000000000)],
        deployer
      );

      expect(block.result).toBeErr(Cl.uint(104));
    });

    it("should prevent non-admin from setting treasury", () => {
      const block = simnet.callPublicFn(
        "off-ramp",
        "set-treasury",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100));
    });
  });

  // --- Comprehensive State Validation ---
  describe("Comprehensive State Validation", () => {
    it("should maintain user order list integrity", () => {
      const bankHash = createBankHash("list-integrity-test");
      const orders = [];

      for (let i = 0; i < 5; i++) {
        const block = simnet.callPublicFn(
          "off-ramp",
          "create-order",
          [
            Cl.uint(10000000),
            Cl.uint(50000),
            Cl.stringAscii("NGN"),
            Cl.buffer(bankHash),
          ],
          wallet1
        );
        orders.push((block.result as any).value.value);
      }

      const userOrders = simnet.callReadOnlyFn(
        "off-ramp",
        "get-user-orders",
        [Cl.principal(wallet1)],
        deployer
      );

      const orderIds = (userOrders.result as any).value["order-ids"].value;
      expect(orderIds.length).toBe(5);

      simnet.callPublicFn(
        "off-ramp",
        "cancel-order",
        [Cl.uint(orders[2])],
        wallet1
      );

      const updatedOrders = simnet.callReadOnlyFn(
        "off-ramp",
        "get-user-orders",
        [Cl.principal(wallet1)],
        deployer
      );

      const updatedIds = (updatedOrders.result as any).value["order-ids"].value;
      expect(updatedIds.length).toBe(5);
      expect(updatedIds).toContainEqual(Cl.uint(orders[2]));
    });

    it("should maintain consistent state across admin changes", () => {
      const bankHash = createBankHash("admin-state-test");

      simnet.callPublicFn(
        "off-ramp",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const order = simnet.callPublicFn(
        "off-ramp",
        "create-order",
        [
          Cl.uint(10000000),
          Cl.uint(50000),
          Cl.stringAscii("NGN"),
          Cl.buffer(bankHash),
        ],
        wallet2
      );

      const orderId = (order.result as any).value.value;

      simnet.callPublicFn(
        "off-ramp",
        "remove-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      const block = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        wallet1
      );

      expect(block.result).toBeErr(Cl.uint(100));

      const deployerBlock = simnet.callPublicFn(
        "off-ramp",
        "mark-processing",
        [Cl.uint(orderId)],
        deployer
      );

      expect(deployerBlock.result).toBeOk(Cl.bool(true));
    });
  });
});
