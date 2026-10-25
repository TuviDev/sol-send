"use client";

import React, { FC, ReactNode, createContext, useContext, useState, useMemo, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";

import "@solana/wallet-adapter-react-ui/styles.css";

export type SolanaNetwork = "devnet" | "mainnet-beta";

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
}

const NetworkContext = createContext<NetworkContextType>({
  network: "devnet",
  setNetwork: () => {},
});

export const useAppNetwork = () => useContext(NetworkContext);

interface SolanaProvidersProps {
  children: ReactNode;
  initialNetwork?: SolanaNetwork;
}

export const SolanaProviders: FC<SolanaProvidersProps> = ({
  children,
  initialNetwork = "devnet",
}) => {
  const [network, setNetwork] = useState<SolanaNetwork>(initialNetwork);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint = useMemo(() => {
    if (network === "mainnet-beta") {
      return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || clusterApiUrl("mainnet-beta");
    }
    return process.env.NEXT_PUBLIC_DEVNET_RPC_URL || clusterApiUrl("devnet");
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={true}>
          <WalletModalProvider>
            {mounted ? children : null}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
};
