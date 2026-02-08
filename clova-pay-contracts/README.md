# ClovaPay Smart Contracts

Clarity smart contracts for the ClovaPay off-ramp platform on Stacks blockchain.

## Contract: off-ramp.clar

The off-ramp contract handles crypto-to-fiat conversions through the Paycrest bridge.

### Version
v1.1.0

### Features
- STX and SIP-010 token deposits
- Escrow management with status tracking
- Rate limiting and security controls
- Multi-currency fiat support (NGN, KES, GHS, UGX, TZS)
- Multi-admin support with time-locked transfers
- Partial refunds for failed settlements
- Batch operations for efficiency
- Order expiry and auto-refund

### Order Status Flow
```
PENDING (0) → PROCESSING (1) → CONFIRMED (2)
    ↓              ↓
CANCELLED (3)  REFUNDED (4) / PARTIAL (5)
```

### Key Functions

| Function | Type | Description |
|----------|------|-------------|
| `create-order` | Public | Create new off-ramp order |
| `cancel-order` | Public | Cancel pending order |
| `mark-processing` | Admin | Mark order as processing |
| `confirm-order` | Admin | Confirm completed order |
| `force-refund` | Admin | Refund failed order |
| `partial-refund` | Admin | Partial refund for failed settlements |
| `batch-mark-processing` | Admin | Process multiple orders |
| `expire-order` | Public | Expire stale orders |

### Testing

```bash
npm install
npm test
```

### Deployment

```bash
clarinet check
clarinet deploy
```

## License
MIT
