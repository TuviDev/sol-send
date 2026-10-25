'use client'

import { AlertTriangle, Loader2, Rocket, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fromBaseUnits, type Network, NETWORK_LABEL, TOKEN_DECIMALS, type TokenKind } from '@/lib/solana'

function Row({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="block text-xs text-muted-foreground/70">{hint}</span>}
      </dt>
      <dd className={cn('text-right font-mono text-sm', emphasis && 'font-medium text-foreground')}>
        {value}
      </dd>
    </div>
  )
}

export function SummaryCard({
  token,
  network,
  readyCount,
  totalAmount,
  txCount,
  networkFeeLamports,
  rentLamports,
  requiredLamports,
  balances,
  connected,
  executing,
  progress,
  blocker,
  onConnect,
  onExecute,
}: {
  token: TokenKind
  network: Network
  readyCount: number
  totalAmount: bigint
  txCount: number
  networkFeeLamports: bigint
  rentLamports: bigint
  requiredLamports: bigint
  balances?: { sol: bigint; usdc: bigint }
  connected: boolean
  executing: boolean
  progress: { done: number; total: number }
  blocker: string | null
  onConnect: () => void
  onExecute: () => void
}) {
  const decimals = TOKEN_DECIMALS[token]
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section
      aria-labelledby="summary-title"
      className="flex flex-col self-start rounded-xl border bg-card lg:sticky lg:top-24"
    >
      <div className="border-b px-5 py-4">
        <h2 id="summary-title" className="font-medium">
          Payout summary
        </h2>
        <p className="text-sm text-muted-foreground">{NETWORK_LABEL[network]} · {token}</p>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Total to send</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-balance">
              {fromBaseUnits(totalAmount, decimals, token === 'SOL' ? 6 : 2)}
            </span>
            <span className="text-sm font-medium text-primary">{token}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            to {readyCount} {readyCount === 1 ? 'wallet' : 'wallets'}
          </p>
        </div>

        <dl className="flex flex-col gap-3 border-t pt-4">
          <Row label="Transactions" value={`${txCount}`} hint="Batched transfers" />
          <Row
            label="Est. network fees"
            value={`${fromBaseUnits(networkFeeLamports, 9)} SOL`}
            hint="5,000 lamports per signature"
          />
          {token === 'USDC' && (
            <Row
              label="Token account rent"
              value={`≤ ${fromBaseUnits(rentLamports, 9, 6)} SOL`}
              hint="Only for wallets without a USDC account"
            />
          )}
          <div className="border-t pt-3">
            <Row
              label="Total SOL required"
              value={`${fromBaseUnits(requiredLamports, 9, 6)} SOL`}
              emphasis
            />
          </div>
        </dl>

        {connected && (
          <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden="true" />
              Balance
            </span>
            <span className="font-mono">
              {balances
                ? token === 'SOL'
                  ? `${fromBaseUnits(balances.sol, 9, 4)} SOL`
                  : `${fromBaseUnits(balances.usdc, 6, 2)} USDC · ${fromBaseUnits(balances.sol, 9, 4)} SOL`
                : '…'}
            </span>
          </div>
        )}

        {executing && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing batches</span>
              <span className="font-mono">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Payout progress"
              className="h-1.5 overflow-hidden rounded-full bg-accent"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {blocker && connected && !executing && (
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {blocker}
          </p>
        )}

        {connected ? (
          <Button
            size="lg"
            onClick={onExecute}
            disabled={executing || Boolean(blocker)}
            className="h-11 text-base"
          >
            {executing ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Rocket data-icon="inline-start" />
            )}
            {executing ? 'Executing…' : 'Execute Mass Payout'}
          </Button>
        ) : (
          <Button size="lg" onClick={onConnect} className="h-11 text-base">
            <Wallet data-icon="inline-start" />
            Connect Wallet
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground text-pretty">
          {txCount > 1
            ? `MultiHopper will send this as ${txCount} multi-send routes (max 20 wallets each). Approve each deployment in your wallet.`
            : 'MultiHopper will build a multi-send route from the payout table. Approve the deployment transactions in your wallet.'}
        </p>
      </div>
    </section>
  )
}
