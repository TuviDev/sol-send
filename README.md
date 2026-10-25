# SolSend — Web3 Mass Payout & Privacy Dispatcher on Solana

SolSend is a high-performance mass payout dApp built on Solana, integrated with MultiHopper API for multi-hop route dispatching, transaction batching, and privacy-preserving token distributions.

Developed for the MultiHopper Build & Route Challenge on Superteam Earn.

## Features
- MultiHopper Route Integration: Batches up to 20 destinations per route transaction with automatic fee routing.
- Direct Solana Batching: Fallback option for native execution on Solana mainnet/devnet.
- Multi-Token Support: Native support for SOL and USDC.
- Multi-Wallet Support: Native 1-click integration with Phantom, Solflare, and Backpack wallets.
- Real-time Cost Estimation: Instant calculation of network fees, rent lamports, and total token amounts.
- Live On-Chain Tracking: Direct integration with Solana Explorer for batch transaction verification.
- Secure API Proxy: Next.js server-side route handler proxies requests to MultiHopper API.

## Tech Stack
- Framework: Next.js 16 (App Router & Turbopack)
- Language: TypeScript & React 19
- Blockchain: @solana/web3.js, @solana/spl-token
- Wallets: @solana/wallet-adapter-react
- Styling: Tailwind CSS v4, Lucide Icons

## Quick Start
1. pnpm install
2. Configure .env.local with MULTIHOPPER_API_KEY
3. pnpm dev
4. pnpm build
