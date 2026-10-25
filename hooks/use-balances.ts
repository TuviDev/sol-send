'use client'

import useSWR from 'swr'
import { type Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { type Network, USDC_MINT } from '@/lib/solana'

export function useBalances(connection: Connection, network: Network, address: string | null) {
  return useSWR(
    address ? ['balances', network, address] : null,
    async () => {
      const owner = new PublicKey(address as string)
      const ata = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT[network]), owner)
      const [lamports, usdc] = await Promise.all([
        connection.getBalance(owner, 'confirmed'),
        connection
          .getTokenAccountBalance(ata, 'confirmed')
          .then((res) => BigInt(res.value.amount))
          .catch(() => BigInt(0)),
      ])
      return { sol: BigInt(lamports), usdc }
    },
    { refreshInterval: 20_000, revalidateOnFocus: true },
  )
}
