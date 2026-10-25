import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import {
  type ExecutionResult,
  type Network,
  type Recipient,
  TOKEN_DECIMALS,
  type TokenKind,
  USDC_MINT,
} from '@/lib/solana'

export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112'
export const MULTIHOPPER_MAX_DESTINATIONS = 20

export type WalletSigner = {
  publicKey: PublicKey
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>
}

type DestinationShare = { wallet: string; amountRaw: string }

type PreparedTxs = {
  keeperFundingTx?: string | null
  routeInitTxs?: Array<string | { base64: string }> | null
  orchestratorInitTx?: string | null
  sessionInitTxs?: Array<string | { base64: string }> | null
  dispersionInitTxs?: Array<string | { base64: string }> | null
  recentBlockhash?: string
  lastValidBlockHeight?: number
  resume?: { nothingToDo?: boolean }
}

type TransferRecord = {
  id: number
  status?: string
  destinations?: Array<{
    wallet: string
    amountRaw?: string
    status?: string
    payoutSignature?: string | null
  }>
}

type MhErrorBody = { error?: { message?: string; code?: string }; message?: string }

function asBase64(item: string | { base64: string }) {
  return typeof item === 'string' ? item : item.base64
}

function fromBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function amountTokensFromRaw(raw: bigint, decimals: number) {
  const base = BigInt(`1${'0'.repeat(decimals)}`)
  const whole = raw / base
  const fraction = (raw % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}

function serializeSigned(tx: Transaction | VersionedTransaction) {
  if (tx instanceof Transaction) {
    return tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  }
  return tx.serialize()
}

function decodePreparedTx(base64: string, legacy: boolean) {
  const bytes = fromBase64(base64)
  return legacy ? Transaction.from(bytes) : VersionedTransaction.deserialize(bytes)
}

async function mhFetch<T>(
  network: Network,
  path: string,
  init?: { method?: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const method = init?.method ?? (init?.body ? 'POST' : 'GET')
  const response = await fetch(`/api/multihopper/${path}?network=${network}`, {
    method,
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(init?.body ?? {}),
  })
  const json = (await response.json()) as T & MhErrorBody
  if (!response.ok) {
    throw new Error(json.error?.message ?? json.message ?? `MultiHopper request failed (${response.status})`)
  }
  return json
}

async function signSendConfirm({
  connection,
  signer,
  base64,
  legacy,
  blockhash,
  lastValidBlockHeight,
}: {
  connection: Connection
  signer: WalletSigner
  base64: string
  legacy: boolean
  blockhash?: string
  lastValidBlockHeight?: number
}) {
  const prepared = decodePreparedTx(base64, legacy)
  const signed = await signer.signTransaction(prepared)
  const signature = await connection.sendRawTransaction(serializeSigned(signed), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })
  if (blockhash && lastValidBlockHeight) {
    const { value } = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    if (value.err) throw new Error('MultiHopper transaction failed on-chain')
  } else {
    await connection.confirmTransaction(signature, 'confirmed')
  }
  return signature
}

async function broadcastGroup(
  items: Array<string | { base64: string }> | null | undefined,
  legacy: boolean,
  ctx: {
    connection: Connection
    signer: WalletSigner
    blockhash?: string
    lastValidBlockHeight?: number
  },
) {
  const signatures: string[] = []
  for (const item of items ?? []) {
    signatures.push(
      await signSendConfirm({
        ...ctx,
        base64: asBase64(item),
        legacy,
      }),
    )
  }
  return signatures
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))
  return groups
}

export function buildMultiSendPayload({
  sourceOwner,
  token,
  network,
  recipients,
}: {
  sourceOwner: string
  token: TokenKind
  network: Network
  recipients: Recipient[]
}) {
  const decimals = TOKEN_DECIMALS[token]
  const destinations: DestinationShare[] = recipients.map((recipient) => ({
    wallet: recipient.address,
    amountRaw: toRawAmount(recipient.amount, decimals),
  }))
  const amountRaw = destinations.reduce((sum, item) => sum + BigInt(item.amountRaw), BigInt(0))

  return {
    tokenMint: token === 'SOL' ? NATIVE_SOL_MINT : USDC_MINT[network],
    amountRaw: amountRaw.toString(),
    amountTokens: amountTokensFromRaw(amountRaw, decimals),
    tokenDecimals: decimals,
    tokenSymbol: token,
    sourceOwner,
    hops: 3,
    arrivalSeconds: 600,
    destinations,
  }
}

function toRawAmount(amount: string, decimals: number) {
  const [whole, fraction = ''] = amount.split('.')
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals)
  return (BigInt(whole || '0') * BigInt(`1${'0'.repeat(decimals)}`) + BigInt(padded || '0')).toString()
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTransfer(network: Network, transferId: number) {
  const deadline = Date.now() + 8 * 60 * 1000
  while (Date.now() < deadline) {
    const transfer = await mhFetch<TransferRecord>(network, `transfers/${transferId}`)
    const status = transfer.status ?? ''
    if (status === 'completed' || status === 'failed' || status === 'expired' || status === 'refunded') {
      return transfer
    }
    await sleep(3000)
  }
  throw new Error('Timed out waiting for MultiHopper to finish the payout.')
}

async function deployTransfer({
  connection,
  signer,
  network,
  payload,
}: {
  connection: Connection
  signer: WalletSigner
  network: Network
  payload: ReturnType<typeof buildMultiSendPayload>
}) {
  const created = await mhFetch<{ id?: number; transfer?: TransferRecord }>(network, 'transfers', {
    method: 'POST',
    body: payload,
  })
  const transferId = created.id ?? created.transfer?.id
  if (!transferId) throw new Error('MultiHopper did not return a transfer id.')

  const prepared = await mhFetch<{ transfer?: TransferRecord; preparedTxs: PreparedTxs }>(
    network,
    `transfers/${transferId}/prepare`,
    { method: 'POST' },
  )
  const txs = prepared.preparedTxs
  const ctx = {
    connection,
    signer,
    blockhash: txs.recentBlockhash,
    lastValidBlockHeight: txs.lastValidBlockHeight,
  }

  let keeperFundingSignature: string | undefined
  if (txs.keeperFundingTx) {
    keeperFundingSignature = await signSendConfirm({
      ...ctx,
      base64: txs.keeperFundingTx,
      legacy: false,
    })
    await mhFetch(network, `transfers/${transferId}/confirm-broadcast`, {
      method: 'POST',
      body: {
        routeInitSignatures: [],
        keeperFundingSignature,
      },
    })
  }

  if (!txs.resume?.nothingToDo) {
    const routeInitSignatures = await broadcastGroup(txs.routeInitTxs, false, ctx)
    let orchestratorInitSignature: string | undefined
    if (txs.orchestratorInitTx) {
      orchestratorInitSignature = await signSendConfirm({
        ...ctx,
        base64: txs.orchestratorInitTx,
        legacy: true,
      })
    }
    const sessionInitSignatures = await broadcastGroup(txs.sessionInitTxs, false, ctx)
    const dispersionInitSignatures = await broadcastGroup(txs.dispersionInitTxs, false, ctx)

    await mhFetch(network, `transfers/${transferId}/confirm-broadcast`, {
      method: 'POST',
      body: {
        routeInitSignatures,
        ...(keeperFundingSignature ? { keeperFundingSignature } : {}),
        ...(orchestratorInitSignature ? { orchestratorInitSignature } : {}),
        ...(sessionInitSignatures.length ? { sessionInitSignatures } : {}),
        ...(dispersionInitSignatures.length ? { dispersionInitSignatures } : {}),
      },
    })
  }

  return waitForTransfer(network, transferId)
}

export async function executeMassPayout({
  connection,
  signer,
  network,
  token,
  recipients,
  onUpdate,
}: {
  connection: Connection
  signer: WalletSigner
  network: Network
  token: TokenKind
  recipients: Recipient[]
  onUpdate: (ids: string[], result: ExecutionResult) => void
}) {
  const batches = chunk(recipients, MULTIHOPPER_MAX_DESTINATIONS)
  onUpdate(
    recipients.map((r) => r.id),
    { status: 'processing' },
  )

  let confirmed = 0
  for (const batch of batches) {
    try {
      const payload = buildMultiSendPayload({
        sourceOwner: signer.publicKey.toBase58(),
        token,
        network,
        recipients: batch,
      })
      const transfer = await deployTransfer({ connection, signer, network, payload })
      const paid = new Map(
        (transfer.destinations ?? []).map((destination) => [destination.wallet, destination]),
      )
      const failedOverall = transfer.status !== 'completed'

      for (const recipient of batch) {
        const destination = paid.get(recipient.address)
        const destFailed =
          failedOverall || destination?.status === 'failed' || (!destination?.payoutSignature && failedOverall)
        if (destFailed) {
          onUpdate([recipient.id], {
            status: 'failed',
            error: `MultiHopper status: ${transfer.status ?? 'failed'}`,
          })
        } else {
          onUpdate([recipient.id], {
            status: 'confirmed',
            signature: destination?.payoutSignature ?? undefined,
          })
          confirmed += 1
        }
      }
    } catch (error) {
      onUpdate(
        batch.map((r) => r.id),
        {
          status: 'failed',
          error: error instanceof Error ? error.message.slice(0, 200) : 'MultiHopper payout failed',
        },
      )
    }
  }

  return { confirmed, total: recipients.length }
}
