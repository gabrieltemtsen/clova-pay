# ClovaPay Frontend

Secure and fast crypto-to-fiat off-ramp for Africa, built on Stacks/Bitcoin.

## Version
v1.1.0

## Features

- **Connect Wallet**: Integrated with Hiro/Leather/Xverse wallets via Stacks.js
- **Create Order**: Seamless form to initiate off-ramp transactions
- **Order Tracking**: Real-time order status updates
- **Currency Support**: Convert STX to NGN, KES, GHS, UGX, TZS
- **Secure Escrow**: Smart contract integration for safe funds handling
- **Responsive Design**: Mobile-first, works on all devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: @stacks/connect, @stacks/transactions
- **Icons**: Lucide React
- **State**: React Context API

## Project Structure

```
clova-pay-frontend/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # User dashboard
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ConnectWallet.tsx  # Wallet connection button
│   ├── OrderForm.tsx      # Create order form
│   └── OrderList.tsx      # Display user orders
├── context/               # React Context providers
│   └── WalletContext.tsx  # Wallet state management
└── lib/                   # Utility functions
    ├── contract.ts        # Contract interaction helpers
    └── stacks.ts          # Stacks network config
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address |
| `NEXT_PUBLIC_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## License
MIT
