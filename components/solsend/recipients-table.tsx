'use client'

import { ExternalLink, Loader2, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  explorerTxUrl,
  type Network,
  type Recipient,
  type RecipientStatus,
  shortAddress,
  type TokenKind,
} from '@/lib/solana'

const STATUS_STYLES: Record<RecipientStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'bg-accent text-foreground' },
  invalid: { label: 'Invalid', className: 'bg-destructive/15 text-destructive' },
  duplicate: { label: 'Duplicate', className: 'bg-warning/15 text-warning' },
  processing: { label: 'Processing', className: 'bg-primary/10 text-primary' },
  confirmed: { label: 'Confirmed', className: 'bg-primary/15 text-primary' },
  failed: { label: 'Failed', className: 'bg-destructive/15 text-destructive' },
}

function StatusBadge({ recipient }: { recipient: Recipient }) {
  const style = STATUS_STYLES[recipient.status]
  return (
    <span
      title={recipient.error}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        style.className,
      )}
    >
      {recipient.status === 'processing' ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {style.label}
    </span>
  )
}

export function RecipientsTable({
  recipients,
  token,
  network,
  locked,
  onRemove,
  onClear,
}: {
  recipients: Recipient[]
  token: TokenKind
  network: Network
  locked: boolean
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const issues = recipients.filter((r) => r.status === 'invalid' || r.status === 'duplicate').length

  return (
    <section aria-labelledby="recipients-table-title" className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 id="recipients-table-title" className="font-medium">
            Payout list
          </h2>
          <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {recipients.length}
          </span>
          {issues > 0 && (
            <span className="text-xs text-warning">
              {issues} {issues === 1 ? 'row' : 'rows'} will be skipped
            </span>
          )}
        </div>
        {recipients.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} disabled={locked}>
            <Trash2 data-icon="inline-start" />
            Clear
          </Button>
        )}
      </div>

      {recipients.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent">
            <Users className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="font-medium">No recipients yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Upload a CSV or paste wallet addresses above to build your payout list.
          </p>
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="w-12 px-5 py-2.5 font-medium">
                  #
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Recipient Wallet
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Token Amount
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="w-12 px-5 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient, index) => (
                <tr key={recipient.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 font-mono">
                    <span className="hidden md:inline" title={recipient.address}>
                      {recipient.address || '—'}
                    </span>
                    <span className="md:hidden" title={recipient.address}>
                      {shortAddress(recipient.address, 6) || '—'}
                    </span>
                    {recipient.error && recipient.status !== 'processing' && (
                      <span className="mt-0.5 block font-sans text-xs text-muted-foreground">
                        {recipient.error}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                    {recipient.amount}{' '}
                    <span className="text-xs text-muted-foreground">{token}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge recipient={recipient} />
                      {recipient.signature && (
                        <a
                          href={explorerTxUrl(recipient.signature, network)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">View transaction on Solana Explorer</span>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemove(recipient.id)}
                      disabled={locked || recipient.status === 'processing'}
                      aria-label={`Remove ${shortAddress(recipient.address)}`}
                    >
                      <X />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
