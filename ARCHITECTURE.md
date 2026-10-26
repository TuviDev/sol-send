
SolSend Architecture & Design Rationale
SolSend serves as a non-custodial middleware connecting web clients to the Solana blockchain and MultiHopper privacy protocol.

Data & Execution Flow
User Input (CSV / Text Area)
Parse & Validate (lib/solana.ts)
Live RPC Balance & Fee Check (hooks/use-balances.ts)
SolSend UI Dispatch Trigger
Next.js API Proxy (/api/multihopper/*) -> Attaches MULTIHOPPER_API_KEY
MultiHopper REST API
Multi-Stage Transaction Signing Loop:
Sign Keeper Funding Tx (Versioned/Legacy)
Sign Route Init, Orchestrator, Session & Dispersion Txs
Confirm Broadcast to MultiHopper
Polling Loop (Status: queued -> running -> completed)
Key Technical Rationale
1. Server-Side Proxy (app/api/multihopper/[...path]/route.ts)
Security: MultiHopper API keys must remain strictly confidential to prevent key theft and rate limit exhaustion.
CORS Mitigation: Proxying requests through Next.js eliminates cross-origin browser restrictions.
2. Multi-Stage Transaction Signing Engine (lib/multihopper.ts)
MultiHopper requires signing multiple transaction stages (Keeper funding, route initialization, session initialization, and dispersion).
SolSend safely handles both VersionedTransaction (v0 with lookup tables) and legacy Solana transactions seamlessly without user friction.
3. SSR & Wallet Adapter Hydration Guard
Solana Wallet Adapters frequently trigger React hydration mismatches during server rendering.
SolSend implements a strict mounted state guard pattern across providers and wallet connect buttons to ensure hydration safety.
