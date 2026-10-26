"use client";

import React, { FC, ReactNode, createContext, useContext, useState, useMemo, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";

import "@solana/wallet-adapter-react-ui/styles.css";

export type SolanaNetwork = "devnet" | "mainnet-beta";

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
  connection: Connection;
}

const NetworkContext = createContext<NetworkContextType>({
  network: "devnet",
  setNetwork: () => {},
  connection: new Connection(clusterApiUrl("devnet"), "confirmed"),
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
      return process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || clusterApiUrl("mainnet-beta");
    }
    return process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || clusterApiUrl("devnet");
  }, [network]);

  const connection = useMemo(() => new Connection(endpoint, "confirmed"), [endpoint]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <NetworkContext.Provider value={{ network, setNetwork, connection }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            {mounted ? children : null}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
};
