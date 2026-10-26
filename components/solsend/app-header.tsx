"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Network, NETWORK_LABEL, shortAddress } from "@/lib/solana";
import { Button } from "@/components/ui/button";
import { Zap, LogOut } from "lucide-react";

interface AppHeaderProps {
  network: Network;
  setNetwork: (network: Network) => void;
  solBalance: number | null;
  usdcBalance: number | null;
  mounted?: boolean;
}

export function AppHeader({
  network,
  setNetwork,
  solBalance,
  usdcBalance,
  mounted = true,
}: AppHeaderProps) {
  const { connected, publicKey, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Zap className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SolSend</h1>
          <span className="hidden sm:inline-flex px-2 py-0.5 ml-2 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-500/30">
            MultiHopper Powered
          </span>
        </div>

        <div className="flex items-center gap-3">
          {mounted && connected && (
            <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
              <span>{solBalance !== null ? `${solBalance.toFixed(3)} SOL` : '...'}</span>
              <span className="text-slate-400">|</span>
              <span>{usdcBalance !== null ? `${usdcBalance.toFixed(2)} USDC` : '...'}</span>
            </div>
          )}

          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
            className="bg-slate-100 dark:bg-slate-800 text-sm border-0 rounded-md px-3 py-2 outline-none cursor-pointer"
          >
            <option value="devnet">{NETWORK_LABEL['devnet']}</option>
            <option value="mainnet-beta">{NETWORK_LABEL['mainnet-beta']}</option>
          </select>

          {mounted ? (
            <div className="flex items-center gap-2">
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !h-10 !rounded-md transition-colors" />
              {connected && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => disconnect()}
                  title="Disconnect Wallet"
                  className="h-10 w-10 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            <Button disabled className="h-10">Loading...</Button>
          )}
        </div>
      </div>
    </header>
  );
}
