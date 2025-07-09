import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "wagmi";
import { monadTestnet } from "@reown/appkit/networks";

// Get projectId from environment
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x836ECA5C39f4D7745A777A45edb4dF1E01DAE63c" as `0x${string}`; // Replace with Remix-deployed address

if (!projectId) throw new Error("Project ID is not defined");

export const networks = [monadTestnet];

// Set up Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  networks,
  projectId,
});

export const config = wagmiAdapter.wagmiConfig;