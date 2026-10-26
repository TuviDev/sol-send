# SolSend Architecture & Design Rationale

SolSend serves as a non-custodial middleware connecting web clients to the Solana blockchain and MultiHopper privacy protocol.

---

## 🔄 Data & Execution Flow

1. **User Input**: CSV or Text Area batch recipient input.
2. **Parse & Validate**: Validates Solana PublicKeys and token amounts (`lib/solana.ts`).
3. **Live RPC Balance & Fee Check**: Checks SOL & USDC balances and calculates network rent/fees (`hooks/use-balances.ts`).
4. **SolSend UI Dispatch Trigger**: User approves transfer parameters.
5. **Next.js API Proxy**: Requests routed through `/api/multihopper/*` attaching `MULTIHOPPER_API_KEY`.
6. **MultiHopper REST API**: Communication with MultiHopper servers.
7. **Multi-Stage Transaction Signing Loop**:
   - Sign Keeper Funding Tx (Versioned/Legacy)
   - Sign Route Init, Orchestrator, Session & Dispersion Txs
8. **Confirm Broadcast**: Sends signed payloads back to MultiHopper API.
9. **Polling Loop**: Monitors transfer status (`queued` -> `running` -> `completed`).

---

## 💡 Key Technical Rationale

### 1. Server-Side Proxy (`app/api/multihopper/[...path]/route.ts`)
- **Security**: MultiHopper API keys must remain strictly confidential to prevent key theft and rate limit exhaustion.
- **CORS Mitigation**: Proxying requests through Next.js eliminates cross-origin browser restrictions.

### 2. Multi-Stage Transaction Signing Engine (`lib/multihopper.ts`)
- MultiHopper requires signing multiple transaction stages (Keeper funding, route initialization, session initialization, and dispersion).
- SolSend safely handles both `VersionedTransaction` (v0 with lookup tables) and legacy Solana transactions seamlessly without user friction.

### 3. SSR & Wallet Adapter Hydration Guard
- Solana Wallet Adapters frequently trigger React hydration mismatches during server rendering.
- SolSend implements a strict `mounted` state guard pattern across providers and wallet connect buttons to ensure hydration safety.
