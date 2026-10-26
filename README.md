
SolSend — Web3 Mass Payout & Privacy Dispatcher
SolSend is an open-source Web3 Mass Payout dApp for the Solana ecosystem, engineered for batch disbursements with built-in transaction privacy powered by MultiHopper API. Built for speed, security, and scalability using Next.js 16 (Turbopack).

Live Demo: https://sol-send-dapp.vercel.app
Built for: MultiHopper Build & Route Challenge (Superteam Earn)

Key Features
MultiHopper Integration: Complete support for MultiHopper's "Build & Route" engine — 3-hop privacy routing to anonymize payout origin.
Mass Payout Engine: Batch transfer Native SOL and USDC to up to 20 recipients per session.
CSV / TXT Import & Export: Drag-and-drop batch upload, full address/amount validation, and execution report export.
Real-time Cost Estimation: Instant calculation of network fees, ATA (Associated Token Account) rent creation costs, and total funding requirements.
Enterprise-Grade Proxy Architecture: API key security via Next.js Route Handlers (never exposes API keys to client browsers).
Wallet Compatibility: Seamless integration with Phantom, Solflare, and Backpack wallets via Solana Wallet Adapter with SSR hydration guards.
Tech Stack
Framework: Next.js 16.4.3 (App Router + Turbopack)
Blockchain: @solana/web3.js, @solana/spl-token
Wallet Support: @solana/wallet-adapter-react, @solana/wallet-adapter-backpack
Styling & UI: Tailwind CSS v4, Lucide React
API Proxy & SDK: MultiHopper REST API v1 (/transfers, /prepare, /confirm-broadcast)
State & Data Fetching: SWR for dynamic balance and RPC polling
Documentation
System Architecture: ARCHITECTURE.md
MultiHopper API Integration Guide: docs/MULTIHOPPER.md
Module Breakdown & Rationale: docs/MODULES.md
License
MIT License — free for open-source extension and community deployment.
