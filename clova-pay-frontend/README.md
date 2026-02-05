# ClovaPay Frontend

Secure and fast crypto-to-fiat off-ramp for Africa, built on Stacks/Bitcoin.

## Features

- **Connect Wallet**: Integrated with Hiro/Leather/Xverse wallets via Stacks.js
- **Create Order**: Seamless form to initiate off-ramp transactions
- **Currency Support**: Convert STX to NGN, KES, GHS, UGX, TZS
- **Secure Escrow**: Smart contract integration for safe funds handling

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: @stacks/connect, @stacks/transactions
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Smart Contract Integration

The frontend interacts with the `off-ramp` contract deployed on Stacks. ensure `NEXT_PUBLIC_CONTRACT_ADDRESS` is set in your `.env` file.
