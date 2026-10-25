import {
  clusterApiUrl,
  type Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'

export type Network = 'devnet' | 'mainnet-beta'
export type TokenKind = 'SOL' | 'USDC'

export const NETWORK_LABEL: Record<Network, string> = {
  devnet: 'Devnet',
  'mainnet-beta': 'Mainnet',
}

export const USDC_MINT: Record<Network, string> = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
}

export const TOKEN_DECIMALS: Record<TokenKind, number> = { SOL: 9, USDC: 6 }

// MultiHopper multi-destination transfers accept at most 20 wallets per route.
export const BATCH_SIZE: Record<TokenKind, number> = { SOL: 20, USDC: 20 }

export const BASE_FEE_LAMPORTS = 5000 // UI estimate only; MultiHopper quotes the real fee on execute
export const ATA_RENT_LAMPORTS = 2_039_280
export const LAMPORTS_PER_SOL = 1_000_000_000

export function rpcUrl(network: Network) {
  return clusterApiUrl(network)
}

export type Entry = { id: string; address: string; amount: string }

export type RecipientStatus =
  | 'ready'
  | 'invalid'
  | 'duplicate'
  | 'processing'
  | 'confirmed'
  | 'failed'

export type ExecutionResult = {
  status: 'processing' | 'confirmed' | 'failed'
  signature?: string
  error?: string
}

export type Recipient = Entry & {
  status: RecipientStatus
  error?: string
  signature?: string
}

export function isValidAddress(address: string) {
  if (address.length < 32 || address.length > 44) return false
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

export function amountError(amount: string, decimals: number) {
  if (!/^\d+(\.\d+)?$/.test(amount)) return 'Invalid amount'
  const fraction = amount.split('.')[1] ?? ''
  if (fraction.length > decimals) return `Max ${decimals} decimals`
  if (toBaseUnits(amount, decimals) <= BigInt(0)) return 'Amount must be > 0'
  return null
}

function pow10(decimals: number) {
  return BigInt(`1${'0'.repeat(decimals)}`)
}

export function toBaseUnits(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * pow10(decimals) + BigInt(padded || '0')
}

export function fromBaseUnits(value: bigint, decimals: number, maxFraction = decimals) {
  const base = pow10(decimals)
  const whole = value / base
  const fraction = (value % base).toString().padStart(decimals, '0').slice(0, maxFraction)
  const trimmed = fraction.replace(/0+$/, '')
  return `${whole.toLocaleString('en-US')}${trimmed ? `.${trimmed}` : ''}`
}

let idCounter = 0
const nextId = () => `r${Date.now().toString(36)}${(idCounter++).toString(36)}`

export function parseRecipients(text: string, defaultAmount: string): Entry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries: Entry[] = []
  lines.forEach((line, index) => {
    const [address = '', amount = ''] = line
      .split(/[,;\t ]+/)
      .map((part) => part.trim().replace(/^["']|["']$/g, ''))
    const looksLikeHeader = index === 0 && !isValidAddress(address) && !/^\d/.test(amount)
    if (looksLikeHeader) return
    entries.push({ id: nextId(), address, amount: amount || defaultAmount })
  })
  return entries
}

export function deriveRecipients(
  entries: Entry[],
  results: Record<string, ExecutionResult>,
  token: TokenKind,
): Recipient[] {
  const seen = new Set<string>()
  return entries.map((entry) => {
    const result = results[entry.id]
    const isDuplicate = seen.has(entry.address)
    seen.add(entry.address)
    if (result) return { ...entry, ...result }
    if (!isValidAddress(entry.address)) {
      return { ...entry, status: 'invalid', error: 'Invalid wallet address' }
    }
    const error = amountError(entry.amount, TOKEN_DECIMALS[token])
    if (error) return { ...entry, status: 'invalid', error }
    if (isDuplicate) return { ...entry, status: 'duplicate', error: 'Duplicate address' }
    return { ...entry, status: 'ready' }
  })
}

export function estimateCosts(readyCount: number, token: TokenKind) {
  const txCount = Math.ceil(readyCount / BATCH_SIZE[token])
  const networkFeeLamports = BigInt(txCount * BASE_FEE_LAMPORTS)
  const rentLamports = token === 'USDC' ? BigInt(readyCount * ATA_RENT_LAMPORTS) : BigInt(0)
  return { txCount, networkFeeLamports, rentLamports }
}

export type SolanaSigner = {
  publicKey: PublicKey
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>
}

export async function executePayout({
  connection,
  signer,
  network,
  token,
  recipients,
  onUpdate,
}: {
  connection: Connection
  signer: SolanaSigner
  network: Network
  token: TokenKind
  recipients: Recipient[]
  onUpdate: (ids: string[], result: ExecutionResult) => void
}) {
  const payer = signer.publicKey
  const decimals = TOKEN_DECIMALS[token]
  const size = BATCH_SIZE[token]
  const mint = new PublicKey(USDC_MINT[network])
  const sourceAta = token === 'USDC' ? getAssociatedTokenAddressSync(mint, payer) : null

  const batches: { tx: Transaction; ids: string[] }[] = []
  for (let i = 0; i < recipients.length; i += size) {
    const chunk = recipients.slice(i, i + size)
    const tx = new Transaction()
    for (const recipient of chunk) {
      const owner = new PublicKey(recipient.address)
      const amount = toBaseUnits(recipient.amount, decimals)
      if (token === 'SOL') {
        tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: owner, lamports: amount }))
      } else if (sourceAta) {
        const destination = getAssociatedTokenAddressSync(mint, owner, true)
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(payer, destination, owner, mint),
          createTransferCheckedInstruction(sourceAta, mint, destination, payer, amount, decimals),
        )
      }
    }
    batches.push({ tx, ids: chunk.map((r) => r.id) })
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  for (const { tx } of batches) {
    tx.recentBlockhash = blockhash
    tx.feePayer = payer
  }

  const allIds = batches.flatMap((b) => b.ids)
  onUpdate(allIds, { status: 'processing' })

  const signed = await signer.signAllTransactions(batches.map((b) => b.tx))

  let confirmed = 0
  for (let i = 0; i < signed.length; i++) {
    const { ids } = batches[i]
    try {
      const signature = await connection.sendRawTransaction(signed[i].serialize(), {
        preflightCommitment: 'confirmed',
      })
      const { value } = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed',
      )
      if (value.err) throw new Error('Transaction failed on-chain')
      onUpdate(ids, { status: 'confirmed', signature })
      confirmed += ids.length
    } catch (error) {
      onUpdate(ids, {
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 160) : 'Transaction failed',
      })
    }
  }
  return { confirmed, total: allIds.length }
}

export function explorerTxUrl(signature: string, network: Network) {
  const cluster = network === 'devnet' ? '?cluster=devnet' : ''
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

export function shortAddress(address: string, size = 4) {
  if (address.length <= size * 2 + 3) return address
  return `${address.slice(0, size)}…${address.slice(-size)}`
}
