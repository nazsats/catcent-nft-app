"use client";
import { useAccount, useWriteContract, useReadContracts, useSwitchChain, useEstimateGas, useBalance, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import Image from "next/image";
import CatcentNFTABI from "./CatcentNFT.json";
import { monadTestnet } from "@reown/appkit/networks";
import { contractAddress } from "@/config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { encodeFunctionData, type Abi } from "viem";
import { modal } from "@/context";
import { FaLock, FaUnlock } from "react-icons/fa";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import wallets from "./wallets.json"; // Import wallets.json with vipAddresses and regularAddresses

// Explicitly type the ABI for type safety
const typedCatcentNFTABI = CatcentNFTABI as Abi;

export default function Home() {
  const { isConnected, address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const [numberOfTokens, setNumberOfTokens] = useState(1);
  const [isInputValid, setIsInputValid] = useState(true);
  const [vipMerkleProof, setVipMerkleProof] = useState<string[]>([]);
  const [regularMerkleProof, setRegularMerkleProof] = useState<string[]>([]);
  const [isFetchingProofs, setIsFetchingProofs] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  // Contract calls to read state
  const contractCalls = [
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "isPublicMintActive" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "isVipWhitelistMintActive" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "isRegularWhitelistMintActive" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "isPaused" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "mintPrice" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "totalSupply" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "maxSupply" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "balanceOf", args: address ? [address] : undefined },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "vipWhitelistMinted", args: address ? [address] : undefined },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "regularWhitelistMinted", args: address ? [address] : undefined },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "vipWhitelistStartTime" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "vipWhitelistEndTime" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "regularWhitelistStartTime" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "regularWhitelistEndTime" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "publicMintStartTime" },
    { address: contractAddress as `0x${string}`, abi: typedCatcentNFTABI, functionName: "publicMintEndTime" },
  ] as const;

  const { data: contractData, isLoading, error: contractError } = useReadContracts({
    contracts: contractCalls,
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000, enabled: true },
  });

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      console.error("Contract error:", contractError);
      toast.error("Failed to load contract data", { position: "top-right", theme: "dark" });
    }
  }, [contractError]);

  // Extract contract data with fallbacks
  const [
    rawPublicMintActive,
    rawVipWhitelistMintActive,
    rawRegularWhitelistMintActive,
    rawIsPaused,
    rawMintPrice,
    rawTotalSupply,
    rawMaxSupply,
    rawBalance,
    rawVipWhitelistMinted,
    rawRegularWhitelistMinted,
    rawVipWhitelistStartTime,
    rawVipWhitelistEndTime,
    rawRegularWhitelistStartTime,
    rawRegularWhitelistEndTime,
    rawPublicMintStartTime,
    rawPublicMintEndTime,
  ] = (contractData || []).map((result) => result.result ?? undefined);

  // Type-safe contract state with default values (aligned with July 10, 2025)
  const isPublicMintActive: boolean = Boolean(rawPublicMintActive);
  const isVipWhitelistMintActive: boolean = Boolean(rawVipWhitelistMintActive);
  const isRegularWhitelistMintActive: boolean = Boolean(rawRegularWhitelistMintActive);
  const isPaused: boolean = Boolean(rawIsPaused);
  const mintPrice: bigint = typeof rawMintPrice === 'string' || typeof rawMintPrice === 'number' || typeof rawMintPrice === 'bigint'
    ? BigInt(rawMintPrice)
    : BigInt(3550000000000000000); // 3.55 MONAD
  const totalSupply: bigint = typeof rawTotalSupply === 'string' || typeof rawTotalSupply === 'number' || typeof rawTotalSupply === 'bigint'
    ? BigInt(rawTotalSupply)
    : BigInt(0);
  const maxSupply: bigint = typeof rawMaxSupply === 'string' || typeof rawMaxSupply === 'number' || typeof rawMaxSupply === 'bigint'
    ? BigInt(rawMaxSupply)
    : BigInt(3535);
  const balance: bigint = typeof rawBalance === 'string' || typeof rawBalance === 'number' || typeof rawBalance === 'bigint'
    ? BigInt(rawBalance)
    : BigInt(0);
  const vipWhitelistMinted: bigint = typeof rawVipWhitelistMinted === 'string' || typeof rawVipWhitelistMinted === 'number' || typeof rawVipWhitelistMinted === 'bigint'
    ? BigInt(rawVipWhitelistMinted)
    : BigInt(0);
  const regularWhitelistMinted: bigint = typeof rawRegularWhitelistMinted === 'string' || typeof rawRegularWhitelistMinted === 'number' || typeof rawRegularWhitelistMinted === 'bigint'
    ? BigInt(rawRegularWhitelistMinted)
    : BigInt(0);
  const vipWhitelistStartTime: bigint = typeof rawVipWhitelistStartTime === 'string' || typeof rawVipWhitelistStartTime === 'number' || typeof rawVipWhitelistStartTime === 'bigint'
    ? BigInt(rawVipWhitelistStartTime)
    : BigInt(1752112800); // July 10, 2025, 14:00 UTC
  const vipWhitelistEndTime: bigint = typeof rawVipWhitelistEndTime === 'string' || typeof rawVipWhitelistEndTime === 'number' || typeof rawVipWhitelistEndTime === 'bigint'
    ? BigInt(rawVipWhitelistEndTime)
    : BigInt(1752120000); // July 10, 2025, 16:00 UTC
  const regularWhitelistStartTime: bigint = typeof rawRegularWhitelistStartTime === 'string' || typeof rawRegularWhitelistStartTime === 'number' || typeof rawRegularWhitelistStartTime === 'bigint'
    ? BigInt(rawRegularWhitelistStartTime)
    : BigInt(1752120000); // July 10, 2025, 16:00 UTC
  const regularWhitelistEndTime: bigint = typeof rawRegularWhitelistEndTime === 'string' || typeof rawRegularWhitelistEndTime === 'number' || typeof rawRegularWhitelistEndTime === 'bigint'
    ? BigInt(rawRegularWhitelistEndTime)
    : BigInt(1752127200); // July 10, 2025, 18:00 UTC
  const publicMintStartTime: bigint = typeof rawPublicMintStartTime === 'string' || typeof rawPublicMintStartTime === 'number' || typeof rawPublicMintStartTime === 'bigint'
    ? BigInt(rawPublicMintStartTime)
    : BigInt(1752127200); // July 10, 2025, 18:00 UTC
  const publicMintEndTime: bigint = typeof rawPublicMintEndTime === 'string' || typeof rawPublicMintEndTime === 'number' || typeof rawPublicMintEndTime === 'bigint'
    ? BigInt(rawPublicMintEndTime)
    : BigInt(1752300000); // July 31, 2025, 23:59 UTC

  // Fetch user balance
  const { data: userBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address },
  });

  // Generate Merkle proofs from wallets.json (optimized for large lists)
  useEffect(() => {
    async function fetchMerkleProofs() {
      if (!address) return;
      setIsFetchingProofs(true);
      try {
        // Normalize addresses to lowercase for consistency
        const gtdAddresses: string[] = wallets.vipAddresses.map((addr: string) => addr.toLowerCase());
        const fcfsAddresses: string[] = wallets.regularAddresses.map((addr: string) => addr.toLowerCase());
        const lowerAddress = address.toLowerCase();

        // Generate proofs for GTD (VIP)
        let gtdProofs: string[] = [];
        if (gtdAddresses.includes(lowerAddress)) {
          const leaves = gtdAddresses.map((addr) => keccak256(addr));
          const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
          gtdProofs = tree.getHexProof(keccak256(lowerAddress));
        }

        // Generate proofs for FCFS (Regular)
        let fcfsProofs: string[] = [];
        if (fcfsAddresses.includes(lowerAddress)) {
          const leaves = fcfsAddresses.map((addr) => keccak256(addr));
          const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
          fcfsProofs = tree.getHexProof(keccak256(lowerAddress));
        }

        setVipMerkleProof(gtdProofs);
        setRegularMerkleProof(fcfsProofs);
      } catch (error: unknown) {
        console.error("Error generating Merkle proofs:", error);
        toast.error("Failed to fetch whitelist status", { position: "top-right", theme: "dark" });
      } finally {
        setIsFetchingProofs(false);
      }
    }
    fetchMerkleProofs();
  }, [address]);

  // Determine phase eligibility
  const isVipEligible: boolean = vipMerkleProof.length > 0 && Number(vipWhitelistMinted) === 0;
  const isRegularEligible: boolean = (regularMerkleProof.length > 0 || vipMerkleProof.length > 0) && Number(regularWhitelistMinted) === 0;
  const isPublicEligible: boolean = isConnected;

  // Determine phase status
  const now = Math.floor(Date.now() / 1000);
  const isVipPhaseActive: boolean = Boolean(
    vipWhitelistStartTime &&
    vipWhitelistEndTime &&
    Number(vipWhitelistStartTime) <= now &&
    now < Number(vipWhitelistEndTime)
  );
  const isRegularPhaseActive: boolean = Boolean(
    regularWhitelistStartTime &&
    regularWhitelistEndTime &&
    Number(regularWhitelistStartTime) <= now &&
    now < Number(regularWhitelistEndTime)
  );
  const isPublicPhaseActive: boolean = Boolean(
    publicMintStartTime &&
    publicMintEndTime &&
    Number(publicMintStartTime) <= now &&
    (now < Number(publicMintEndTime) || Number(totalSupply) < Number(maxSupply))
  );

  // Set current phase
  useEffect(() => {
    if (isVipPhaseActive && isVipWhitelistMintActive) {
      setCurrentPhase("VIP (GTD)");
    } else if (isRegularPhaseActive && isRegularWhitelistMintActive) {
      setCurrentPhase("Regular (FCFS)");
    } else if (isPublicPhaseActive && isPublicMintActive) {
      setCurrentPhase("Public");
    } else {
      setCurrentPhase("No Active Phase");
    }
  }, [
    isVipPhaseActive,
    isVipWhitelistMintActive,
    isRegularPhaseActive,
    isRegularWhitelistMintActive,
    isPublicPhaseActive,
    isPublicMintActive,
  ]);

  // Estimate gas for minting
  const numTokens = numberOfTokens || 1;
  const merkleProof = isVipPhaseActive && isVipWhitelistMintActive
    ? vipMerkleProof
    : isRegularPhaseActive && isRegularWhitelistMintActive
      ? vipMerkleProof.length > 0
        ? vipMerkleProof
        : regularMerkleProof
      : [];
  const mintData =
    mintPrice && numTokens >= 1 && numTokens <= 10 && isConnected
      ? encodeFunctionData({
          abi: typedCatcentNFTABI,
          functionName: "mint",
          args: [numTokens, merkleProof],
        })
      : undefined;
  const isGasEstimationEnabled: boolean = Boolean(
    mintPrice !== undefined &&
    numTokens >= 1 &&
    numTokens <= 10 &&
    isConnected &&
    ((isVipPhaseActive && isVipWhitelistMintActive && isVipEligible) ||
      (isRegularPhaseActive && isRegularWhitelistMintActive && isRegularEligible) ||
      (isPublicPhaseActive && isPublicMintActive))
  );

  const { data: gasEstimate, error: gasError } = useEstimateGas({
    to: contractAddress as `0x${string}`,
    data: mintData,
    value: mintPrice ? BigInt(mintPrice.toString()) * BigInt(numTokens) : undefined,
    query: { enabled: isGasEstimationEnabled },
  });

  // Handle gas estimation errors
  useEffect(() => {
    if (gasError) {
      const msg = /already minted/i.test(gasError.message)
        ? "You've already claimed your whitelist mint."
        : "Could not estimate gas for minting.";
      toast.error(msg, { position: "top-right", theme: "dark" });
    }
  }, [gasError]);

  // Prompt network switch if on wrong network
  useEffect(() => {
    if (isConnected && chain?.id !== monadTestnet.id) {
      toast.info("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      try {
        switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch {
        toast.error("Please switch to Monad Testnet to mint.", { position: "top-right", theme: "dark" });
      }
    }
  }, [isConnected, chain, switchChain]);

  // Notify on wallet connection (Firebase logging removed, can be re-added if needed)
  useEffect(() => {
    if (isConnected && address) {
      toast.success("Wallet connected successfully!", { position: "top-right", theme: "dark" });
    }
  }, [isConnected, address]);

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      disconnect();
      toast.info("Wallet disconnected.", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Disconnect Error:", error);
      toast.error("Failed to disconnect wallet.", { position: "top-right", theme: "dark" });
    }
  };

  // Handle token quantity increase/decrease
  const handleIncrease = () => {
    if (numberOfTokens < 10 && !isVipEligible && !isRegularEligible) {
      setNumberOfTokens(numberOfTokens + 1);
      setIsInputValid(true);
    }
  };
  const handleDecrease = () => {
    if (numberOfTokens > 1) {
      setNumberOfTokens(numberOfTokens - 1);
      setIsInputValid(true);
    }
  };

  // Countdown timer component
  function CountdownTimer({ startTime, endTime, phase }: { startTime: number; endTime: number; phase: string }) {
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        if (!startTime || !endTime) {
          setTimeLeft(`${phase} Phase: Not Set`);
          return;
        }
        if (phase === "Public" && Number(totalSupply) >= Number(maxSupply)) {
          setTimeLeft("Public Phase: Sold Out");
          return;
        }
        if (now < startTime) {
          const diff = startTime - now;
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setTimeLeft(`${phase} Phase: Starts in ${hours}h ${minutes}m ${seconds}s`);
        } else if (now < endTime || (phase === "Public" && Number(totalSupply) < Number(maxSupply))) {
          const diff = endTime - now;
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setTimeLeft(`${phase} Phase: Ends in ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${phase} Phase: Ended`);
        }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [startTime, endTime, phase]);
    return <span className="text-xs text-cyan-300 pl-10">{timeLeft}</span>;
  }

  // Handle minting errors
  const handleMintError = async (error: unknown, mintPrice: bigint, numberOfTokens: number) => {
    const errorMap: Record<string, string> = {
      "insufficient funds": "Insufficient MONAD balance. Get testnet tokens from the Monad faucet.",
      "user rejected": "Transaction rejected.",
      "denied": "Transaction rejected.",
      "Exceeds max supply": "Minting would exceed max supply.",
      "Insufficient payment": `Insufficient payment. Required: ${(mintPrice * BigInt(numberOfTokens) / BigInt(1e18)).toString()} MONAD`,
      "Not GTD whitelisted": "You are not GTD whitelisted.",
      "Not whitelisted for Regular phase": "You are not whitelisted for the Regular phase.",
      "GTD whitelist already minted": "You have already minted in the GTD phase.",
      "Regular whitelist already minted": "You've already claimed your whitelist mint.",
      "Minting not active": "Minting is not active. Check phase times.",
      "Contract is paused": "Minting is paused.",
      "network": "Network error. Please check your connection.",
      "ContractFunctionExecutionError": "Contract execution failed. Try again or contact support.",
    };

    let errorMessage = "An unexpected error occurred. Please try again.";
    if (error instanceof Error) {
      const foundKey = Object.keys(errorMap).find((k) => error.message.toLowerCase().includes(k.toLowerCase()));
      if (foundKey) {
        errorMessage = errorMap[foundKey];
      }
    }
    toast.error(errorMessage, { position: "top-right", theme: "dark", autoClose: 5000 });
  };

  // Handle minting
  const handleMint = async () => {
    if (isPaused) {
      toast.error("Minting is paused.", { position: "top-right", theme: "dark" });
      return;
    }
    if (!isVipPhaseActive && !isRegularPhaseActive && !isPublicPhaseActive) {
      toast.error("No minting phase is active.", { position: "top-right", theme: "dark" });
      return;
    }
    if (isVipPhaseActive && isVipWhitelistMintActive && !isVipEligible) {
      toast.error("You are not eligible for the GTD phase.", { position: "top-right", theme: "dark" });
      return;
    }
    if (isRegularPhaseActive && isRegularWhitelistMintActive && !isRegularEligible) {
      toast.error("You are not eligible for the Regular phase.", { position: "top-right", theme: "dark" });
      return;
    }
    if (isPublicPhaseActive && isPublicMintActive && !isPublicEligible) {
      toast.error("Public minting is not active.", { position: "top-right", theme: "dark" });
      return;
    }
    if ((isVipPhaseActive && isVipWhitelistMintActive) || (isRegularPhaseActive && isRegularWhitelistMintActive)) {
      if (numberOfTokens !== 1) {
        toast.error("Can only mint 1 NFT in whitelist phases.", { position: "top-right", theme: "dark" });
        setIsInputValid(false);
        return;
      }
    } else if (isPublicPhaseActive && isPublicMintActive && (numberOfTokens < 1 || numberOfTokens > 10)) {
      toast.error("Number of tokens must be between 1 and 10.", { position: "top-right", theme: "dark" });
      setIsInputValid(false);
      return;
    }
    if (userBalance && mintPrice && BigInt(userBalance.value) < BigInt(mintPrice.toString()) * BigInt(numberOfTokens)) {
      toast.error("Insufficient MONAD balance.", { position: "top-right", theme: "dark" });
      return;
    }
    setIsInputValid(true);

    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet.", { position: "top-right", theme: "dark" });
      } catch (error: unknown) {
        console.error("Network switch error:", error);
        toast.error("Failed to switch to Monad Testnet.", { position: "top-right", theme: "dark" });
        return;
      }
    }

    if (Number(totalSupply) + numberOfTokens > Number(maxSupply)) {
      toast.error("Minting would exceed max supply.", { position: "top-right", theme: "dark" });
      return;
    }

    try {
      const totalCost = mintPrice * BigInt(numberOfTokens);
      const merkleProof = isVipPhaseActive && isVipWhitelistMintActive
        ? vipMerkleProof
        : isRegularPhaseActive && isRegularWhitelistMintActive
          ? vipMerkleProof.length > 0
            ? vipMerkleProof
            : regularMerkleProof
          : [];
      const result = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: typedCatcentNFTABI,
        functionName: "mint",
        args: [numberOfTokens, merkleProof],
        value: totalCost,
      });

      const { default: JSConfetti } = await import("js-confetti");
      const confetti = new JSConfetti();
      await confetti.addConfetti({
        confettiRadius: 6,
        confettiNumber: window.innerWidth < 768 ? 50 : 200,
        confettiColors: ["#9333ea", "#22d3ee", "#fef08a", "#f472b6"],
      });

      toast.success(
        <div role="alert" aria-live="assertive">
          Successfully minted {numberOfTokens} NFT(s)!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${result}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>
        </div>,
        { position: "top-right", theme: "dark" }
      );
      setNumberOfTokens(1);
    } catch (error: unknown) {
      console.error("Mint Error:", error);
      handleMintError(error, mintPrice, numberOfTokens);
    }
  };

  // Mint button disabled logic
  const isEligible: boolean = Boolean(
    (isVipPhaseActive && isVipWhitelistMintActive && isVipEligible) ||
    (isRegularPhaseActive && isRegularWhitelistMintActive && isRegularEligible) ||
    (isPublicPhaseActive && isPublicMintActive && isPublicEligible)
  );
  const isMintButtonDisabled: boolean = isPending || isPaused || !isEligible;

  // Handle loading state
  if (isLoading || isFetchingProofs) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-cyan-300 font-poppins p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">Loading...</p>
          <svg className="animate-spin h-8 w-8 mx-auto mt-4 text-cyan-300" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-cyan-300 font-poppins p-4 sm:p-6 md:p-8">
      <ToastContainer theme="dark" position="top-right" aria-live="polite" />
      <div className="container mx-auto max-w-7xl">
        {/* Header and Wallet Status */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-6">
          <header className="flex flex-col justify-center items-center text-center">
            <div className="flex items-center justify-center space-x-4">
              <Image
                src={imageError ? "/images/placeholder.png" : "/logo.jpg"}
                alt="Catcent Logo"
                width={120}
                height={120}
                className="rounded-full border-4 border-purple-600"
                unoptimized
                onError={() => {
                  console.error("Logo image load failed");
                  setImageError(true);
                }}
              />
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 drop-shadow-lg">
                Catcent NFT
              </h1>
            </div>
          </header>
          <div className="w-full md:w-auto max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
            {isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-semibold text-cyan-300">
                  Connected: <span className="text-yellow-200">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </p>
                {chain?.id !== monadTestnet.id ? (
                  <>
                    <p className="text-xs text-pink-400 font-medium">Wrong network! Please switch to Monad Testnet.</p>
                    <button
                      onClick={() => switchChain({ chainId: monadTestnet.id })}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2 rounded-lg text-base font-semibold transition-all duration-300 focus:ring-2 focus:ring-yellow-500 transform hover:scale-105"
                      aria-label="Switch to Monad Testnet"
                    >
                      Switch Network
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-green-400 font-medium">Connected to Monad Testnet</p>
                )}
                <button
                  onClick={handleDisconnect}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-6 py-2 rounded-lg text-base font-semibold transition-all duration-300 focus:ring-2 focus:ring-red-500 transform hover:scale-105"
                  aria-label="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => modal.open()}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-all duration-300 focus:ring-2 focus:ring-purple-500 transform hover:scale-105 hover:from-purple-700 hover:to-cyan-700"
                aria-label="Connect wallet"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Title Section */}
        <section className="mb-8 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-cyan-200">
            Mint & Flex Your Early Degen Status
          </h2>
          <p className="text-sm text-yellow-200 mt-2">Current Phase: {currentPhase}</p>
        </section>

        {/* Main Content */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
          {/* Left Section: NFT Image */}
          <section className="order-1 flex justify-center items-center md:items-start animate-slide-in-left">
            <div className="relative group max-w-md w-full">
              <Image
                src={imageError ? "/images/placeholder.png" : "/nft-images/catcent.png"}
                alt="Catcent NFT"
                width={500}
                height={500}
                className="w-full rounded-2xl shadow-2xl border-4 border-gradient-to-r from-purple-600 to-cyan-500 group-hover:scale-105 transition-transform duration-300"
                priority
                unoptimized
                onError={() => {
                  console.error("NFT image load failed");
                  setImageError(true);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300" />
            </div>
          </section>

          {/* Center Section: Mint Phases */}
          <section className="order-2 flex flex-col gap-6 items-center animate-slide-in-up">
            <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Mint Phases</h3>
              {contractError ? (
                <p className="text-center text-red-400">Error loading contract data. Please try again later.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Active & Purring */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isPaused ? "bg-red-800" : "bg-green-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-label={isPaused ? "Contract Paused" : "Contract Active"}>
                        {isPaused ? <FaLock /> : <FaUnlock />}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">Active & Purring</span>
                    </div>
                    <span className={`text-sm font-semibold ${isPaused ? "text-red-400" : "text-green-400"}`}>
                      {isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                  {/* VIP Whitelist */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isVipEligible
                        ? "bg-gradient-to-r from-purple-600 to-cyan-600"
                        : Number(vipWhitelistMinted) > 0
                        ? "bg-green-600"
                        : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xl"
                        aria-label={
                          isVipEligible
                            ? "VIP Whitelist Unlocked"
                            : Number(vipWhitelistMinted) > 0
                            ? "VIP Whitelist Minted"
                            : "VIP Whitelist Locked"
                        }
                      >
                        {isVipEligible || Number(vipWhitelistMinted) > 0 ? <FaUnlock /> : <FaLock />}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">GTD (Early)</span>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isVipEligible
                          ? "text-green-400"
                          : Number(vipWhitelistMinted) > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {Number(vipWhitelistMinted) > 0 ? "Minted" : isVipEligible ? "Eligible" : "Not Eligible"}
                    </span>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-cyan-300 pl-10">
                      Limit: {vipMerkleProof.length > 0 ? `${Number(vipWhitelistMinted)}/1` : "Not Whitelisted"}
                    </p>
                  )}
                  <CountdownTimer
                    startTime={Number(vipWhitelistStartTime)}
                    endTime={Number(vipWhitelistEndTime)}
                    phase="GTD"
                  />
                  {/* Regular Whitelist */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isRegularEligible
                        ? "bg-gradient-to-r from-purple-600 to-cyan-600"
                        : Number(regularWhitelistMinted) > 0
                        ? "bg-green-600"
                        : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xl"
                        aria-label={
                          isRegularEligible
                            ? "Regular Whitelist Unlocked"
                            : Number(regularWhitelistMinted) > 0
                            ? "Regular Whitelist Minted"
                            : "Regular Whitelist Locked"
                        }
                      >
                        {isRegularEligible || Number(regularWhitelistMinted) > 0 ? <FaUnlock /> : <FaLock />}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">FCFS</span>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isRegularEligible
                          ? "text-green-400"
                          : Number(regularWhitelistMinted) > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {Number(regularWhitelistMinted) > 0 ? "Minted" : isRegularEligible ? "Eligible" : "Not Eligible"}
                    </span>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-cyan-300 pl-10">
                      Limit: {regularMerkleProof.length > 0 || vipMerkleProof.length > 0
                        ? `${Number(regularWhitelistMinted)}/1`
                        : "Not Whitelisted"}
                    </p>
                  )}
                  <CountdownTimer
                    startTime={Number(regularWhitelistStartTime)}
                    endTime={Number(regularWhitelistEndTime)}
                    phase="FCFS"
                  />
                  {/* Public Mint */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isPublicEligible && isPublicPhaseActive && isPublicMintActive
                        ? "bg-gradient-to-r from-purple-600 to-cyan-600"
                        : isPublicEligible
                        ? "bg-purple-800"
                        : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xl"
                        aria-label={isPublicEligible ? "Public Mint Eligible" : "Public Mint Locked"}
                      >
                        {isPublicEligible ? <FaUnlock /> : <FaLock />}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">Public</span>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isPublicEligible && isPublicPhaseActive && isPublicMintActive
                          ? "text-green-400"
                          : isPublicEligible
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {isPublicEligible && isPublicPhaseActive && isPublicMintActive
                        ? "Live"
                        : isPublicEligible
                        ? "Eligible"
                        : "Not Eligible"}
                    </span>
                  </div>
                  {isConnected && <p className="text-xs text-cyan-300 pl-10">Limit: Up to 10 per transaction</p>}
                  <CountdownTimer
                    startTime={Number(publicMintStartTime)}
                    endTime={Number(publicMintEndTime)}
                    phase="Public"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Right Section: Mint Your NFT & Mint Progress */}
          <section className="order-3 flex flex-col gap-6 items-center animate-slide-in-right">
            {isConnected && (
              <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
                <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Mint Your NFT</h3>
                {contractError ? (
                  <p className="text-center text-red-400">Error loading contract data. Please try again later.</p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-cyan-300">
                      Mint Price:{" "}
                      <span className="font-semibold text-yellow-200">{(Number(mintPrice) / 1e18).toString()} MONAD</span>
                    </p>
                    <p className="text-sm text-cyan-300">
                      Your NFTs: <span className="font-semibold text-yellow-200">{balance.toString()}</span>
                    </p>
                    {userBalance && (
                      <p className="text-sm text-cyan-300">
                        Your Balance:{" "}
                        <span className="font-semibold text-yellow-200">
                          {(Number(userBalance.value) / 1e18).toFixed(4)} MONAD
                        </span>
                      </p>
                    )}
                    {gasEstimate && (
                      <p className="text-xs text-gray-400">
                        Estimated Gas: {(Number(gasEstimate) / 1e18).toFixed(6)} MONAD
                      </p>
                    )}
                    {Number(totalSupply) >= Number(maxSupply) ? (
                      <p className="text-xs text-red-400">Collection is sold out!</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleDecrease}
                            disabled={numberOfTokens <= 1 || isVipEligible || isRegularEligible}
                            className="w-10 h-10 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-full flex items-center justify-center text-xl font-bold hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:ring-2 focus:ring-purple-500"
                            aria-label="Decrease number of tokens"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={numberOfTokens}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (
                                !isNaN(value) &&
                                value >= 1 &&
                                value <= (isVipEligible || isRegularEligible ? 1 : 10)
                              ) {
                                setNumberOfTokens(value);
                                setIsInputValid(true);
                              } else {
                                setIsInputValid(false);
                              }
                            }}
                            className={`w-16 p-2 text-center rounded-lg border-2 ${
                              isInputValid ? "border-purple-600" : "border-pink-500 animate-shake"
                            } bg-gray-800 text-cyan-300 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all`}
                            min="1"
                            max={isVipEligible || isRegularEligible ? "1" : "10"}
                            aria-label="Number of NFTs to mint"
                            aria-invalid={!isInputValid}
                          />
                          <button
                            onClick={handleIncrease}
                            disabled={numberOfTokens >= (isVipEligible || isRegularEligible ? 1 : 10)}
                            className="w-10 h-10 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-full flex items-center justify-center text-xl font-bold hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:ring-2 focus:ring-purple-500"
                            aria-label="Increase number of tokens"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={handleMint}
                          disabled={isMintButtonDisabled}
                          aria-disabled={isMintButtonDisabled}
                          className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center transition-all duration-300 focus:ring-2 focus:ring-purple-500 ${
                            isMintButtonDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:from-purple-700 hover:to-cyan-700 transform hover:scale-105"
                          }`}
                          aria-label={isPending ? "Minting in progress" : "Mint NFT"}
                        >
                          {isPending ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                              </svg>
                              Minting...
                            </>
                          ) : (
                            "Mint NFT"
                          )}
                        </button>
                      </>
                    )}
                    <div className="relative group">
                      <p className="text-xs text-cyan-300 text-center">
                        Need testnet MONAD?{" "}
                        <a
                          href="https://discord.com/invite/TXPbt7ztMC"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-200 underline hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          Get it from the Monad faucet
                        </a>
                      </p>
                      <span className="absolute invisible group-hover:visible bg-gray-900 text-cyan-300 text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2">
                        Request testnet MONAD for minting
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mint Progress */}
            <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Mint Progress</h3>
              {contractError ? (
                <p className="text-center text-red-400">Error loading contract data. Please try again later.</p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-cyan-300">
                    Minted:{" "}
                    <span className="font-semibold text-yellow-200">
                      {totalSupply.toString()} / {maxSupply.toString()}
                    </span>
                  </p>
                  <div
                    className="w-full max-w-xs bg-gray-800 rounded-full h-3 relative overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round((Number(totalSupply) / Number(maxSupply)) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bg-gradient-to-r from-purple-600 to-cyan-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(Number(totalSupply) / Number(maxSupply)) * 100}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-20" />
                  </div>
                  <p className="text-xs font-bold text-cyan-300">
                    {Math.round((Number(totalSupply) / Number(maxSupply)) * 100)}% Minted
                  </p>
                  {Number(totalSupply) >= Number(maxSupply) && (
                    <p className="text-xs text-red-400">Collection is sold out!</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-cyan-300">
          <p className="text-sm">
            Join our community:{" "}
            <a
              href="https://discord.com/invite/TXPbt7ztMC"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-200 underline"
            >
              Discord
            </a>{" "}
            |{" "}
            <a
              href="https://x.com/CatCentsio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-200 underline"
            >
              X
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}