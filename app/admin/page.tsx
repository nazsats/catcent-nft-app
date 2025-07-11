"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from "wagmi";
import { contractAddress } from "@/config";
import CatcentNFTABI from "../CatcentNFT.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { monadTestnet } from "@reown/appkit/networks";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import wallets from "../wallets.json"; // Import wallets.json
import { type Abi } from "viem";

const typedCatcentNFTABI = CatcentNFTABI as Abi;

export default function Admin() {
  const { isConnected, address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChain } = useSwitchChain();
  // Align timestamps with contract defaults (July 10, 2025)
  const [vipStartTime, setVipStartTime] = useState("1752112800"); // July 10, 2025, 08:00 UTC
  const [vipEndTime, setVipEndTime] = useState("1752120000"); // July 10, 2025, 08:20 UTC
  const [regularStartTime, setRegularStartTime] = useState("1752120000"); // July 10, 2025, 08:20 UTC
  const [regularEndTime, setRegularEndTime] = useState("1752127200"); // July 10, 2025, 08:30 UTC
  const [publicStartTime, setPublicStartTime] = useState("1752127200"); // July 10, 2025, 08:30 UTC
  const [publicEndTime, setPublicEndTime] = useState("1752300000"); // July 31, 2025, 23:59 UTC
  const [mintPrice, setMintPrice] = useState("3.55"); // Matches contract default
  const [vipAddresses, setVipAddresses] = useState(wallets.vipAddresses.join(",")); // From wallets.json
  const [regularAddresses, setRegularAddresses] = useState(wallets.regularAddresses.join(",")); // From wallets.json
  const [baseURI, setBaseURI] = useState("https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/bafybeifkvkpmfer6uj5opika3zi6jp3jwjsxrbvquotn7ki7hgw75hojpy/"); // New metadata CID
  const [isOwner, setIsOwner] = useState(false);

  // Check if connected wallet is owner
  const { data: owner, error: ownerError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "owner",
  }) as { data: `0x${string}` | undefined; error: Error | null };

  // Read contract balance
  const { data: contractBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "getBalance",
  });

  useEffect(() => {
    if (ownerError) {
      console.error("Error fetching owner:", ownerError);
      toast.error("Failed to verify owner status", { position: "top-right", theme: "dark" });
    }
    if (isConnected && address && owner) {
      setIsOwner(address.toLowerCase() === owner.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [address, owner, isConnected, ownerError]);

  // Read contract state
  const { data: isVipWhitelistMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "isVipWhitelistMintActive",
  });
  const { data: isRegularWhitelistMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "isRegularWhitelistMintActive",
  });
  const { data: isPublicMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "isPublicMintActive",
  });
  const { data: isPaused } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: typedCatcentNFTABI,
    functionName: "isPaused",
  });

  // Generate Merkle root (optimized for large lists)
  const generateMerkleRoot = (addresses: string[]): string => {
    const validAddresses = addresses
      .map((addr) => addr.trim().toLowerCase())
      .filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr));
    if (validAddresses.length === 0) return "0x" + "0".repeat(64); // Empty root
    const leaves = validAddresses.map((addr) => keccak256(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    return tree.getHexRoot();
  };

  // Handle phase state updates
  const handleSetPhaseState = async (state: string, value: boolean) => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    try {
      let functionName: string;
      if (state === "paused") functionName = "setPaused";
      else if (state === "vip") functionName = "setVipWhitelistMintActive";
      else if (state === "regular") functionName = "setRegularWhitelistMintActive";
      else if (state === "public") functionName = "setPublicMintActive";
      else return;

      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName,
        args: [value],
      });
      toast.success(
        <div role="alert" aria-live="assertive">
          {state} state updated successfully!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error(`Error updating ${state} state:`, error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : `Failed to update ${state} state`;
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Sync phase states based on current time
  const syncPhaseStates = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    const now = Math.floor(Date.now() / 1000);
    try {
      const vipTx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "setVipWhitelistMintActive",
        args: [now >= parseInt(vipStartTime) && now < parseInt(vipEndTime)],
      });
      const regularTx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "setRegularWhitelistMintActive",
        args: [now >= parseInt(regularStartTime) && now < parseInt(regularEndTime)],
      });
      const publicTx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "setPublicMintActive",
        args: [now >= parseInt(publicStartTime) && now < parseInt(publicEndTime)],
      });
      toast.success(
        <div role="alert" aria-live="assertive">
          Phase states synced successfully!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${vipTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View VIP Tx
          </a>{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${regularTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View Regular Tx
          </a>{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${publicTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View Public Tx
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error syncing phase states:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to sync phase states";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Handle phase time updates
  const handleSetPhaseTimes = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }

    // Validate timestamps
    const vipStart = parseInt(vipStartTime);
    const vipEnd = parseInt(vipEndTime);
    const regularStart = parseInt(regularStartTime);
    const regularEnd = parseInt(regularEndTime);
    const publicStart = parseInt(publicStartTime);
    const publicEnd = parseInt(publicEndTime);

    if (
      isNaN(vipStart) ||
      isNaN(vipEnd) ||
      isNaN(regularStart) ||
      isNaN(regularEnd) ||
      isNaN(publicStart) ||
      isNaN(publicEnd) ||
      vipStart >= vipEnd ||
      regularStart >= regularEnd ||
      publicStart >= publicEnd ||
      vipEnd > regularStart ||
      regularEnd > publicStart
    ) {
      toast.error("Invalid timestamps. Ensure start times are before end times and phases do not overlap.", {
        position: "top-right",
        theme: "dark",
      });
      return;
    }

    try {
      const txs = await Promise.all([
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setVipWhitelistStartTime",
          args: [vipStart],
        }),
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setVipWhitelistEndTime",
          args: [vipEnd],
        }),
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setRegularWhitelistStartTime",
          args: [regularStart],
        }),
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setRegularWhitelistEndTime",
          args: [regularEnd],
        }),
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setPublicMintStartTime",
          args: [publicStart],
        }),
        writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setPublicMintEndTime",
          args: [publicEnd],
        }),
      ]);
      toast.success(
        <div role="alert" aria-live="assertive">
          Phase times updated successfully!{" "}
          {txs.map((tx, index) => (
            <a
              key={index}
              href={`https://testnet.monadexplorer.com/tx/${tx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-cyan-300"
            >
              View Tx {index + 1}
            </a>
          ))}
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error updating phase times:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to update phase times";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Handle mint price update
  const handleSetMintPrice = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    if (parseFloat(mintPrice) <= 0) {
      toast.error("Mint price must be greater than 0.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "setMintPrice",
        args: [BigInt(Math.round(parseFloat(mintPrice) * 1e18))],
      });
      toast.success(
        <div role="alert" aria-live="assertive">
          Mint price updated successfully!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error updating mint price:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to update mint price";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Handle whitelist updates
  const handleSetWhitelists = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    try {
      const vipAddrs = vipAddresses
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr));
      const regularAddrs = regularAddresses
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr));

      if (vipAddrs.length === 0 && regularAddrs.length === 0) {
        toast.error("No valid addresses provided.", { position: "top-right", theme: "dark" });
        return;
      }

      const vipMerkleRoot = vipAddrs.length > 0 ? generateMerkleRoot(vipAddrs) : "0x" + "0".repeat(64);
      const regularMerkleRoot = regularAddrs.length > 0 ? generateMerkleRoot(regularAddrs) : "0x" + "0".repeat(64);

      const txs = [];
      if (vipAddrs.length > 0) {
        const vipTx = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setVipMerkleRoot",
          args: [vipMerkleRoot],
        });
        txs.push({ type: "VIP", hash: vipTx });
      }
      if (regularAddrs.length > 0) {
        const regularTx = await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: typedCatcentNFTABI,
          functionName: "setRegularMerkleRoot",
          args: [regularMerkleRoot],
        });
        txs.push({ type: "Regular", hash: regularTx });
      }

      toast.success(
        <div role="alert" aria-live="assertive">
          Whitelists updated successfully!{" "}
          {txs.map((tx, index) => (
            <a
              key={index}
              href={`https://testnet.monadexplorer.com/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-cyan-300"
            >
              View {tx.type} Tx
            </a>
          ))}
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error updating whitelists:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to update whitelists";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Handle baseURI update
  const handleSetBaseURI = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    if (!baseURI) {
      toast.error("Base URI cannot be empty.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "setBaseURI",
        args: [baseURI],
      });
      toast.success(
        <div role="alert" aria-live="assertive">
          Base URI updated successfully!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error updating base URI:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to update base URI";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  // Handle withdraw MONAD
  const handleWithdraw = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }
    if (Number(contractBalance) === 0) {
      toast.error("Contract balance is 0.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "withdraw",
        args: [],
      });
      toast.success(
        <div role="alert" aria-live="assertive">
          Withdrawal successful!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
    } catch (error: unknown) {
      console.error("Error withdrawing MONAD:", error);
      const errorMessage =
        error instanceof Error && error.message.includes("denied")
          ? "Transaction rejected"
          : "Failed to withdraw MONAD";
      toast.error(errorMessage, { position: "top-right", theme: "dark" });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-cyan-300 font-poppins p-4 sm:p-6 md:p-8">
      <ToastContainer theme="dark" position="top-right" aria-live="polite" />
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 mb-8">
          Catcent NFT Admin Panel
        </h1>
        {!isConnected ? (
          <p className="text-center text-red-400">Please connect your wallet.</p>
        ) : !isOwner ? (
          <p className="text-center text-red-400">You are not the contract owner.</p>
        ) : chain?.id !== monadTestnet.id ? (
          <div className="text-center">
            <p className="text-red-400">Please switch to Monad Testnet.</p>
            <button
              onClick={() => switchChain({ chainId: monadTestnet.id })}
              className="mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2 rounded-lg text-base font-semibold transition-all duration-300 focus:ring-2 focus:ring-yellow-500 transform hover:scale-105"
              aria-label="Switch to Monad Testnet"
            >
              Switch Network
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phase States */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Phase States</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <p>VIP Whitelist Mint: {isVipWhitelistMintActive ? "Active" : "Inactive"}</p>
                  <button
                    onClick={() => handleSetPhaseState("vip", !isVipWhitelistMintActive)}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                    }`}
                    aria-label={isVipWhitelistMintActive ? "Deactivate VIP Whitelist" : "Activate VIP Whitelist"}
                  >
                    {isPending ? "Processing..." : isVipWhitelistMintActive ? "Deactivate VIP" : "Activate VIP"}
                  </button>
                </div>
                <div>
                  <p>Regular Whitelist Mint: {isRegularWhitelistMintActive ? "Active" : "Inactive"}</p>
                  <button
                    onClick={() => handleSetPhaseState("regular", !isRegularWhitelistMintActive)}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                    }`}
                    aria-label={isRegularWhitelistMintActive ? "Deactivate Regular Whitelist" : "Activate Regular Whitelist"}
                  >
                    {isPending ? "Processing..." : isRegularWhitelistMintActive ? "Deactivate Regular" : "Activate Regular"}
                  </button>
                </div>
                <div>
                  <p>Public Mint: {isPublicMintActive ? "Active" : "Inactive"}</p>
                  <button
                    onClick={() => handleSetPhaseState("public", !isPublicMintActive)}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                    }`}
                    aria-label={isPublicMintActive ? "Deactivate Public Mint" : "Activate Public Mint"}
                  >
                    {isPending ? "Processing..." : isPublicMintActive ? "Deactivate Public" : "Activate Public"}
                  </button>
                </div>
                <div>
                  <p>Contract Paused: {isPaused ? "Paused" : "Active"}</p>
                  <button
                    onClick={() => handleSetPhaseState("paused", !isPaused)}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                    }`}
                    aria-label={isPaused ? "Unpause Contract" : "Pause Contract"}
                  >
                    {isPending ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                  </button>
                </div>
                <button
                  onClick={syncPhaseStates}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Sync Phase States"
                >
                  {isPending ? "Processing..." : "Sync Phase States"}
                </button>
              </div>
            </div>

            {/* Phase Times */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Phase Times</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">VIP Start Time</label>
                  <DatePicker
                    selected={vipStartTime ? new Date(parseInt(vipStartTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setVipStartTime(Math.floor(date.getTime() / 1000).toString()) : setVipStartTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="VIP Start Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {vipStartTime ? new Date(parseInt(vipStartTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">VIP End Time</label>
                  <DatePicker
                    selected={vipEndTime ? new Date(parseInt(vipEndTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setVipEndTime(Math.floor(date.getTime() / 1000).toString()) : setVipEndTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="VIP End Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {vipEndTime ? new Date(parseInt(vipEndTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Regular Start Time</label>
                  <DatePicker
                    selected={regularStartTime ? new Date(parseInt(regularStartTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setRegularStartTime(Math.floor(date.getTime() / 1000).toString()) : setRegularStartTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Regular Start Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {regularStartTime ? new Date(parseInt(regularStartTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Regular End Time</label>
                  <DatePicker
                    selected={regularEndTime ? new Date(parseInt(regularEndTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setRegularEndTime(Math.floor(date.getTime() / 1000).toString()) : setRegularEndTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Regular End Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {regularEndTime ? new Date(parseInt(regularEndTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Public Start Time</label>
                  <DatePicker
                    selected={publicStartTime ? new Date(parseInt(publicStartTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setPublicStartTime(Math.floor(date.getTime() / 1000).toString()) : setPublicStartTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Public Start Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {publicStartTime ? new Date(parseInt(publicStartTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Public End Time</label>
                  <DatePicker
                    selected={publicEndTime ? new Date(parseInt(publicEndTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setPublicEndTime(Math.floor(date.getTime() / 1000).toString()) : setPublicEndTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Public End Time"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {publicEndTime ? new Date(parseInt(publicEndTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <button
                  onClick={handleSetPhaseTimes}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Update Phase Times"
                >
                  {isPending ? "Processing..." : "Update Phase Times"}
                </button>
              </div>
            </div>

            {/* Mint Price */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Mint Price</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">Mint Price (MONAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mintPrice}
                    onChange={(e) => setMintPrice(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Mint Price"
                  />
                </div>
                <button
                  onClick={handleSetMintPrice}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Update Mint Price"
                >
                  {isPending ? "Processing..." : "Update Mint Price"}
                </button>
              </div>
            </div>

            {/* Whitelists */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Whitelists</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">VIP Whitelist Addresses (comma-separated)</label>
                  <textarea
                    value={vipAddresses}
                    onChange={(e) => setVipAddresses(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    placeholder="0xAddress1,0xAddress2,..."
                    aria-label="VIP Whitelist Addresses"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Total VIP Addresses: {vipAddresses.split(",").filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim())).length}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Regular Whitelist Addresses (comma-separated)</label>
                  <textarea
                    value={regularAddresses}
                    onChange={(e) => setRegularAddresses(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    placeholder="0xAddress1,0xAddress2,..."
                    aria-label="Regular Whitelist Addresses"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Total Regular Addresses: {regularAddresses.split(",").filter((addr) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim())).length}
                  </p>
                </div>
                <button
                  onClick={handleSetWhitelists}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Update Whitelists"
                >
                  {isPending ? "Processing..." : "Update Whitelists"}
                </button>
              </div>
            </div>

            {/* Base URI */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Base URI</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">Base URI</label>
                  <input
                    value={baseURI}
                    onChange={(e) => setBaseURI(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/..."
                    aria-label="Base URI"
                  />
                </div>
                <button
                  onClick={handleSetBaseURI}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Update Base URI"
                >
                  {isPending ? "Processing..." : "Update Base URI"}
                </button>
              </div>
            </div>

            {/* Withdraw MONAD */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Withdraw MONAD</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <p>Contract Balance: {contractBalance ? (Number(contractBalance) / 1e18).toFixed(4) : "0"} MONAD</p>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={isPending || Number(contractBalance) === 0}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending || Number(contractBalance) === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                  }`}
                  aria-label="Withdraw MONAD"
                >
                  {isPending ? "Processing..." : "Withdraw MONAD"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}