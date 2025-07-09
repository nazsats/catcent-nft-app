"use client";

import { wagmiAdapter, projectId } from "@/config";
import { createAppKit } from "@reown/appkit/react";
import { monadTestnet } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

const queryClient = new QueryClient();

if (!projectId) throw new Error("Project ID is not defined");

const metadata = {
  name: "Catcent NFT Drop",
  description: "NFT Minting on Monad Testnet",
  url: "https://my-nft-drop.com", // Replace with your domain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [monadTestnet],
  metadata,
  features: {
    analytics: true,
    socials: false,
    email: false,
  },
  themeMode: "light",
});

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;