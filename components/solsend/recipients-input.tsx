'use client'

import { useRef, useState } from 'react'
import { ClipboardPaste, Download, FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TokenKind } from '@/lib/solana'

const SAMPLE = `wallet,amount
64Pp6xLVePgswA3BJEFT8C43wDFGnPcX3KwKetHzyYyV,0.05
6e6KLQkn557QvM9bbKVjmhaiiuVKDzMUnUUesJKvLFrX,0.12
5bY7eS6xumupAG5it8udVftZMc4TT3JsizQeiqNWC2iu,0.08
BPt7LiH86DjBQL77ggwQ6ZcG5xzgyPMgsZGzwX9U6jaQ,0.25
FwX2URt5dZ6gFvyki6u9Mn3EV1Mb33f5NYPqU1JbfwqG,0.1
GiGT6hvPu9EUynqaa41Yqtb4NhPvb15kzJu3EHw6ABXd,0.15`

type Mode = 'upload' | 'paste'

export function RecipientsInput({
  token,
  onTokenChange,
  defaultAmount,
  onDefaultAmountChange,
  onAdd,
  locked,
}: {
  token: TokenKind
  onTokenChange: (token: TokenKind) => void
  defaultAmount: string
  onDefaultAmountChange: (value: string) => void
  onAdd: (text: string) => void
  locked: boolean
}) {
  const [mode, setMode] = useState<Mode>('upload')
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    onAdd(await file.text())
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([SAMPLE], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'solsend-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-labelledby="recipients-input-title" className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 id="recipients-input-title" className="font-medium">
            Recipients
          </h2>
          <p className="text-sm text-muted-foreground">
            One wallet per line, optionally followed by an amount.
          </p>
        </div>
        <div className="flex items-center rounded-lg border bg-background p-0.5" role="tablist">
          {(['upload', 'paste'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => setMode(item)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors',
                mode === item && 'bg-accent text-foreground',
              )}
            >
              {item === 'upload' ? (
                <FileUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ClipboardPaste className="size-3.5" aria-hidden="true" />
              )}
              {item === 'upload' ? 'Upload CSV' : 'Paste'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Asset</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1">
              {(['SOL', 'USDC'] as const).map((item) => (
                <label
                  key={item}
                  className={cn(
                    'flex cursor-pointer items-center justify-center rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    token === item && 'bg-accent text-foreground',
                    locked && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="radio"
                    name="token"
                    value={item}
                    checked={token === item}
                    disabled={locked}
                    onChange={() => onTokenChange(item)}
                    className="sr-only"
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="default-amount" className="text-xs font-medium text-muted-foreground">
              Default amount (when a line has none)
            </label>
            <div className="flex h-10 items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
              <input
                id="default-amount"
                inputMode="decimal"
                value={defaultAmount}
                onChange={(e) => onDefaultAmountChange(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
              />
              <span className="pr-3 text-xs font-medium text-muted-foreground">{token}</span>
            </div>
          </div>
        </div>

        {mode === 'upload' ? (
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background px-6 py-10 text-center transition-colors hover:border-primary/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              dragging && 'border-primary bg-primary/5',
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-accent">
              <FileUp className="size-5 text-primary" aria-hidden="true" />
            </span>
            <span className="text-sm">
              <span className="font-medium text-foreground">Click to upload</span>
              <span className="text-muted-foreground"> or drag and drop a CSV</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {fileName ? `Loaded ${fileName}` : 'wallet,amount — .csv or .txt'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor="paste-area" className="sr-only">
              Wallet addresses
            </label>
            <textarea
              id="paste-area"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              spellCheck={false}
              placeholder={'7xKX…AsU, 1.5\n9WzD…WWM, 0.25\nHN7c…YWrH'}
              className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              onClick={() => {
                onAdd(text)
                setText('')
              }}
              disabled={!text.trim()}
              variant="secondary"
              className="h-9 self-end"
            >
              <Plus data-icon="inline-start" />
              Add recipients
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download CSV template
          </button>
          <button
            type="button"
            onClick={() => onAdd(SAMPLE)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample list
          </button>
        </div>
      </div>
    </section>
  )
}
