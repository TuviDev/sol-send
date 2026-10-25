'use client'

import { useMemo, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { CheckCircle2, X } from 'lucide-react'
import { AppHeader } from './app-header'
import { RecipientsInput } from './recipients-input'
import { RecipientsTable } from './recipients-table'
import { SummaryCard } from './summary-card'
import { useAppNetwork } from './solana-providers'
import { useSolanaWallet } from '@/hooks/use-solana-wallet'
import { useBalances } from '@/hooks/use-balances'
import { executeMassPayout } from '@/lib/multihopper'
import {
  deriveRecipients,
  type Entry,
  estimateCosts,
  type ExecutionResult,
  parseRecipients,
  TOKEN_DECIMALS,
  toBaseUnits,
  type TokenKind,
} from '@/lib/solana'

type Notice = { tone: 'success' | 'error'; message: string }

export function PayoutApp() {
  const wallet = useSolanaWallet()
  const { network, setNetwork } = useAppNetwork()
  const { connection } = useConnection()
  const [token, setToken] = useState<TokenKind>('SOL')
  const [defaultAmount, setDefaultAmount] = useState('0.1')
  const [entries, setEntries] = useState<Entry[]>([])
  const [results, setResults] = useState<Record<string, ExecutionResult>>({})
  const [executing, setExecuting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const { data: balances, mutate: refreshBalances } = useBalances(connection, network, wallet.address)

  const recipients = useMemo(
    () => deriveRecipients(entries, results, token),
    [entries, results, token],
  )
  const ready = recipients.filter((r) => r.status === 'ready')
  const decimals = TOKEN_DECIMALS[token]
  const totalAmount = ready.reduce((sum, r) => sum + toBaseUnits(r.amount, decimals), BigInt(0))
  const { txCount, networkFeeLamports, rentLamports } = estimateCosts(ready.length, token)
  const requiredLamports =
    networkFeeLamports + rentLamports + (token === 'SOL' ? totalAmount : BigInt(0))

  const processed = recipients.filter((r) => r.status === 'confirmed' || r.status === 'failed')
  const inFlight = recipients.filter((r) => r.status === 'processing').length

  let blocker: string | null = null
  if (ready.length === 0) blocker = 'Add at least one valid recipient to continue.'
  else if (balances && balances.sol < requiredLamports) blocker = 'Insufficient SOL balance for this payout.'
  else if (balances && token === 'USDC' && balances.usdc < totalAmount)
    blocker = 'Insufficient USDC balance for this payout.'

  function addRecipients(text: string) {
    const parsed = parseRecipients(text, defaultAmount)
    if (parsed.length === 0) {
      setNotice({ tone: 'error', message: 'No wallet addresses found in that input.' })
      return
    }
    setEntries((prev) => [...prev, ...parsed])
    setNotice(null)
  }

  function clearAll() {
    setEntries([])
    setResults({})
    setNotice(null)
  }

  async function execute() {
    if (!wallet.publicKey || blocker) return
    setExecuting(true)
    setNotice(null)
    try {
      const { confirmed, total } = await executeMassPayout({
        connection,
        signer: { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction },
        network,
        token,
        recipients: ready,
        onUpdate: (ids, result) =>
          setResults((prev) => {
            const next = { ...prev }
            for (const id of ids) next[id] = result
            return next
          }),
      })
      setNotice(
        confirmed === total
          ? { tone: 'success', message: `Payout complete — ${confirmed} recipients paid.` }
          : { tone: 'error', message: `${confirmed} of ${total} transfers confirmed. Check failed rows.` },
      )
    } catch (error) {
      const ids = new Set(ready.map((r) => r.id))
      setResults((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.has(id))))
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Payout was cancelled.',
      })
    } finally {
      setExecuting(false)
      refreshBalances()
    }
  }

  const walletError = wallet.error

  return (
    <div className="min-h-screen">
      <AppHeader
        network={network}
        onNetworkChange={setNetwork}
        address={wallet.address}
        connecting={wallet.connecting}
        locked={executing}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Mass payouts &amp; airdrops on Solana
          </h1>
          <p className="max-w-2xl text-muted-foreground text-pretty">
            Send SOL or USDC to hundreds of wallets in a handful of batched transactions. Upload a
            list, review it, and sign once.
          </p>
        </div>

        {(notice || walletError) && (
          <div
            role="status"
            className={
              notice?.tone === 'success' && !walletError
                ? 'mb-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary'
                : 'mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
            }
          >
            {notice?.tone === 'success' && !walletError && (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <p className="flex-1">{walletError ?? notice?.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => (walletError ? wallet.clearError() : setNotice(null))}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <RecipientsInput
              token={token}
              onTokenChange={setToken}
              defaultAmount={defaultAmount}
              onDefaultAmountChange={setDefaultAmount}
              onAdd={addRecipients}
              locked={executing}
            />
            <RecipientsTable
              recipients={recipients}
              token={token}
              network={network}
              locked={executing}
              onRemove={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
              onClear={clearAll}
            />
          </div>

          <SummaryCard
            token={token}
            network={network}
            readyCount={ready.length}
            totalAmount={totalAmount}
            txCount={txCount}
            networkFeeLamports={networkFeeLamports}
            rentLamports={rentLamports}
            requiredLamports={requiredLamports}
            balances={balances}
            connected={Boolean(wallet.address)}
            executing={executing}
            progress={{ done: processed.length, total: processed.length + inFlight }}
            blocker={blocker}
            onConnect={wallet.connect}
            onExecute={execute}
          />
        </div>
      </main>
    </div>
  )
}
