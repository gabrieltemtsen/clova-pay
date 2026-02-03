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

// Helper to create a 32-byte buffer for bank details hash
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
});
