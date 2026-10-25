'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'

export function useSolanaWallet() {
  const {
    publicKey,
    connected,
    connecting,
    disconnect,
    signTransaction,
    signAllTransactions,
    wallet,
    connect: walletConnect,
    select,
  } = useWallet()
  const { setVisible } = useWalletModal()
  const [error, setError] = useState<string | null>(null)

  // Automatyczne polaczenie natychmiast po wybraniu portfela z listy (1 klikniecie)
  useEffect(() => {
    if (wallet && !connected && !connecting) {
      walletConnect().catch((err) => {
        console.error('Wallet auto-connect error:', err)
      })
    }
  }, [wallet, connected, connecting, walletConnect])

  const connect = useCallback(() => {
    setError(null)
    setVisible(true)
  }, [setVisible])

  return {
    address: publicKey?.toBase58() ?? null,
    publicKey: publicKey ?? null,
    connecting: connecting && !connected,
    connected,
    error,
    clearError: () => setError(null),
    connect,
    disconnect: async () => {
      await disconnect().catch(() => {})
    },
    signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T) => {
      if (!signTransaction) throw new Error('Connected wallet cannot sign transactions.')
      return signTransaction(transaction)
    },
    signAllTransactions,
  }
}
