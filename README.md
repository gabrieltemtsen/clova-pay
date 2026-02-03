# ClovaPay 🌍💰

**Crypto-to-Fiat Off-Ramp for Africa** — Convert STX and tokens to local currency directly to your bank account.

[![Built on Stacks](https://img.shields.io/badge/Built%20on-Stacks-5546FF?logo=stacks)](https://stacks.co)
[![Clarity](https://img.shields.io/badge/Clarity-Smart%20Contracts-orange)](https://clarity-lang.org)
[![Code4STX](https://img.shields.io/badge/Code4STX-Participant-green)](https://code4stx.com)

---

## 🎯 Problem

Millions of Africans hold crypto but struggle to convert it to local currency. Current solutions are:
- **Expensive** — 5-10% fees on P2P platforms
- **Slow** — Hours or days to find buyers
- **Risky** — Fraud and scams on peer exchanges
- **Limited** — Few options for Stacks ecosystem users

## ✅ Solution

ClovaPay provides instant, low-fee crypto-to-fiat conversion for the Stacks ecosystem:

| Feature | Description |
|---------|-------------|
| **1% Fee** | Lowest fees in the market |
| **Instant** | Funds in your bank within minutes |
| **Secure** | Smart contract escrow protects both parties |
| **Multi-Token** | Supports STX and SIP-010 tokens |
| **African Focus** | NGN, KES, GHS, UGX, TZS supported |

---

## 🏗️ Architecture

```
┌──────────────┐    ┌─────────────┐    ┌────────────┐    ┌──────────┐
│   Frontend   │───▶│   Stacks    │───▶│  Backend   │───▶│ Paycrest │
│   (Next.js)  │    │  Contract   │    │  (NestJS)  │    │   (EVM)  │
└──────────────┘    └─────────────┘    └────────────┘    └──────────┘
                          │                   │                │
                     Lock STX/Tokens     Listen Events    Settle Fiat
                          │                   │                │
                          ▼                   ▼                ▼
                      Escrow             Order Mgmt        Bank Transfer
```

**Hybrid Bridge Design:**
1. User locks STX/tokens in the Stacks smart contract
2. Backend listens for contract events and calls Paycrest API
3. Paycrest settles fiat to user's bank account
4. Backend confirms order, releasing escrow fees

---

## 📁 Project Structure

```
clova-pay/
├── clova-pay-contracts/     # Clarity smart contracts
│   ├── contracts/
│   │   ├── off-ramp.clar    # Main escrow contract
│   │   └── sip010-trait.clar # SIP-010 token trait
│   └── tests/               # Vitest test suite
│
├── clova-pay-frontend/      # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   └── context/             # Wallet context
│
└── clova-pay-backend/       # NestJS API (coming soon)
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Clarinet](https://github.com/hirosystems/clarinet) 2.0+

### Smart Contracts

```bash
cd clova-pay-contracts

# Check contracts
clarinet check

# Run tests
npm install
npm test
```

### Frontend

```bash
cd clova-pay-frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

---

## 📋 Smart Contract Functions

### User Functions
| Function | Description |
|----------|-------------|
| `create-order` | Lock STX and create off-ramp order |
| `create-order-token` | Lock SIP-010 tokens for off-ramp |
| `cancel-order` | Cancel pending order & get refund |

### Admin Functions
| Function | Description |
|----------|-------------|
| `confirm-order` | Confirm order after fiat settlement |
| `mark-processing` | Mark order as being processed |
| `force-refund` | Refund failed orders |
| `set-token-enabled` | Whitelist SIP-010 tokens |

### Read-Only Functions
| Function | Description |
|----------|-------------|
| `get-order` | Get order details |
| `get-user-orders` | Get user's order history |
| `is-token-supported` | Check if token is whitelisted |

---

## 🌍 Supported Currencies

| Currency | Country | Symbol |
|----------|---------|--------|
| NGN | 🇳🇬 Nigeria | ₦ |
| KES | 🇰🇪 Kenya | KSh |
| GHS | 🇬🇭 Ghana | ₵ |
| UGX | 🇺🇬 Uganda | USh |
| TZS | 🇹🇿 Tanzania | TSh |

---

## 🔐 Security

- **Escrow Model** — Funds locked until fiat confirmed
- **Admin Controls** — Pause, fee limits, token whitelist
- **Tested** — Comprehensive test suite (18+ tests)
- **Clarity** — Decidable language prevents exploits

---

## 🛣️ Roadmap

- [x] **Phase 1** — Smart contract & frontend foundation
- [x] **Phase 2** — SIP-010 token support
- [ ] **Phase 3** — NestJS backend & Paycrest integration
- [ ] **Phase 4** — Mainnet deployment
- [ ] **Phase 5** — Mobile app

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- [Stacks](https://stacks.co) — Bitcoin L2
- [Paycrest](https://paycrest.io) — Fiat settlement
- [Code4STX](https://code4stx.com) — Builder program

---

*Built with ❤️ for African crypto users*
