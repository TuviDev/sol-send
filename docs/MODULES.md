# SolSend Codebase & Module Directory

## Module Summary

| File / Path | Primary Responsibility | Technical Rationale |
| :--- | :--- | :--- |
| **`app/api/multihopper/[...path]/route.ts`** | Next.js API Proxy route handler. | Secures `MULTIHOPPER_API_KEY` on the server and routes requests to Devnet/Mainnet MultiHopper endpoints. |
| **`lib/solana.ts`** | Utilities for Solana address parsing, regex validation, cost estimation, and unit formatting. | Decouples mathematical unit conversion (SOL 9 decimals, USDC 6 decimals) and string validation from UI components. |
| **`lib/multihopper.ts`** | MultiHopper API client SDK & multi-step transaction sign/broadcast orchestrator. | Manages complex async signing sequences (`VersionedTransaction` & Legacy) and status polling loops. |
| **`hooks/use-balances.ts`** | Custom SWR hook for reactive wallet SOL and USDC balance tracking. | Uses RPC polling with automatic revalidation on transaction completion. |
| **`components/solsend/solana-providers.tsx`** | Context provider for Solana RPC connections and wallet adapters. | Configures network switching (Devnet / Mainnet) and wraps wallet auto-connect functionality with hydration guards. |
| **`app/page.tsx`** | Main SolSend application dashboard. | Unifies input parsing, CSV handling, dynamic fee summary, address filtering, and transaction state management into a responsive interface. |

---

## 📄 CSV Import / Export Specifications

### Supported CSV Format
```csv
address,amount
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,0.5
EjMyNzmFchKNxZBWLqA228CeUS48xZSD72wBdb1Bf34u,1.25
Export Format
SolSend exports execution results containing Recipient Address, Amount, Token, Execution Status (Confirmed/Failed), Timestamp, and Explorer Transaction URLs.
