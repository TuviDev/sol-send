import useSWR from 'swr';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Network, USDC_MINT, LAMPORTS_PER_SOL } from '@/lib/solana';

export function useBalances(address: string | null, network: Network, customConnection?: Connection) {
  const { data, mutate, isLoading } = useSWR(
    address ? ['balances', address, network] : null,
    async () => {
      if (!address) return { sol: null, usdc: null };
      const connection = customConnection || new Connection(
        network === 'mainnet-beta'
          ? (process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com')
          : (process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com'),
        'confirmed'
      );

      try {
        const pubkey = new PublicKey(address);
        const solLamports = await connection.getBalance(pubkey);
        const sol = solLamports / LAMPORTS_PER_SOL;

        let usdc: number | null = 0;
        try {
          const usdcMint = new PublicKey(USDC_MINT[network]);
          const ata = getAssociatedTokenAddressSync(usdcMint, pubkey);
          const tokenBalance = await connection.getTokenAccountBalance(ata);
          usdc = tokenBalance.value.uiAmount ?? 0;
        } catch {
          usdc = 0;
        }

        return { sol, usdc };
      } catch {
        return { sol: null, usdc: null };
      }
    },
    { refreshInterval: 10000, revalidateOnFocus: true }
  );

  return {
    sol: data?.sol ?? null,
    usdc: data?.usdc ?? null,
    isLoading,
    mutate,
  };
}
