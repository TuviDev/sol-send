'use client'

import { LogOut, Send, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type Network, NETWORK_LABEL, shortAddress } from '@/lib/solana'

const NETWORKS: Network[] = ['devnet', 'mainnet-beta']

export function AppHeader({
  network,
  onNetworkChange,
  address,
  connecting,
  locked,
  onConnect,
  onDisconnect,
}: {
  network: Network
  onNetworkChange: (network: Network) => void
  address: string | null
  connecting: boolean
  locked: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Send className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">SolSend</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            role="radiogroup"
            aria-label="Network"
            className="hidden items-center rounded-lg border bg-card p-0.5 sm:flex"
          >
            {NETWORKS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={network === item}
                disabled={locked}
                onClick={() => onNetworkChange(item)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50',
                  network === item && 'bg-accent text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full',
                    item === 'devnet' ? 'bg-warning' : 'bg-primary',
                  )}
                />
                {NETWORK_LABEL[item]}
              </button>
            ))}
          </div>

          {address ? (
            <div className="flex items-center gap-1">
              <span className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 font-mono text-sm">
                <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                <span className="sr-only">Connected wallet </span>
                {shortAddress(address)}
              </span>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={onDisconnect}
                disabled={locked}
                aria-label="Disconnect wallet"
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={onConnect} disabled={connecting} className="h-9 px-4">
              <Wallet data-icon="inline-start" />
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
