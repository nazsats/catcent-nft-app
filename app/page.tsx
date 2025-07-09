"use client";
import { useAccount, useWriteContract, useReadContract, useSwitchChain, useEstimateGas } from "wagmi";
import { useState, useEffect } from "react";
import Image from "next/image";
import CatcentNFTABI from "./CatcentNFT.json";
import { db } from "@/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { monadTestnet } from "@reown/appkit/networks";
import { contractAddress } from "@/config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import JSConfetti from "js-confetti";
import { encodeFunctionData } from "viem"; // Import encodeFunctionData from viem

const confetti = new JSConfetti();

export default function Home() {
  const { isConnected, address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const [numberOfTokens, setNumberOfTokens] = useState(1);
  const [isInputValid, setIsInputValid] = useState(true);
  const [vipMerkleProof, setVipMerkleProof] = useState<string[]>([]);
  const [regularMerkleProof, setRegularMerkleProof] = useState<string[]>([]);
  const [isFetchingProofs, setIsFetchingProofs] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>("");

  // Contract data
  const { data: isPublicMintActive, isLoading: publicLoading, error: publicError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isPublicMintActive",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: isVipWhitelistMintActive, isLoading: vipWhitelistLoading, error: vipWhitelistError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isVipWhitelistMintActive",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: isRegularWhitelistMintActive, isLoading: regularWhitelistLoading, error: regularWhitelistError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isRegularWhitelistMintActive",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: isPaused, isLoading: pausedLoading, error: pausedError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isPaused",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: mintPrice, isLoading: priceLoading, error: priceError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "mintPrice",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: totalSupply, isLoading: totalSupplyLoading, error: totalSupplyError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "totalSupply",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: maxSupply, isLoading: maxSupplyLoading, error: maxSupplyError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "maxSupply",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: balance, isLoading: balanceLoading, error: balanceError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: vipWhitelistMinted, isLoading: vipWhitelistMintedLoading, error: vipWhitelistMintedError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "vipWhitelistMinted",
    args: address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: regularWhitelistMinted, isLoading: regularWhitelistMintedLoading, error: regularWhitelistMintedError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "regularWhitelistMinted",
    args: address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: vipWhitelistStartTime, isLoading: vipStartLoading, error: vipStartError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "vipWhitelistStartTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: vipWhitelistEndTime, isLoading: vipEndLoading, error: vipEndError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "vipWhitelistEndTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: regularWhitelistStartTime, isLoading: regularStartLoading, error: regularStartError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "regularWhitelistStartTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: regularWhitelistEndTime, isLoading: regularEndLoading, error: regularEndError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "regularWhitelistEndTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: publicMintStartTime, isLoading: publicStartLoading, error: publicStartError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "publicMintStartTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });
  const { data: publicMintEndTime, isLoading: publicEndLoading, error: publicEndError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "publicMintEndTime",
    query: { staleTime: 30_000, retry: 3, retryDelay: 1000 },
  });

  const isLoading =
    publicLoading ||
    vipWhitelistLoading ||
    regularWhitelistLoading ||
    pausedLoading ||
    priceLoading ||
    balanceLoading ||
    totalSupplyLoading ||
    maxSupplyLoading ||
    vipWhitelistMintedLoading ||
    regularWhitelistMintedLoading ||
    vipStartLoading ||
    vipEndLoading ||
    regularStartLoading ||
    regularEndLoading ||
    publicStartLoading ||
    publicEndLoading;

  // Debug contract data
  useEffect(() => {
    console.log("Contract Data Debug:", {
      isPublicMintActive: isPublicMintActive ?? "undefined",
      isVipWhitelistMintActive: isVipWhitelistMintActive ?? "undefined",
      isRegularWhitelistMintActive: isRegularWhitelistMintActive ?? "undefined",
      isPaused: isPaused ?? "undefined",
      mintPrice: mintPrice ? mintPrice.toString() : "undefined",
      totalSupply: totalSupply ? totalSupply.toString() : "undefined",
      maxSupply: maxSupply ? maxSupply.toString() : "undefined",
      balance: balance ? balance.toString() : "undefined",
      vipWhitelistMinted: vipWhitelistMinted ? vipWhitelistMinted.toString() : "undefined",
      regularWhitelistMinted: regularWhitelistMinted ? regularWhitelistMinted.toString() : "undefined",
      vipWhitelistStartTime: vipWhitelistStartTime ? vipWhitelistStartTime.toString() : "undefined",
      vipWhitelistEndTime: vipWhitelistEndTime ? vipWhitelistEndTime.toString() : "undefined",
      regularWhitelistStartTime: regularWhitelistStartTime ? regularWhitelistStartTime.toString() : "undefined",
      regularWhitelistEndTime: regularWhitelistEndTime ? regularWhitelistEndTime.toString() : "undefined",
      publicMintStartTime: publicMintStartTime ? publicMintStartTime.toString() : "undefined",
      publicMintEndTime: publicMintEndTime ? publicMintEndTime.toString() : "undefined",
      errors: {
        publicError: publicError?.message ?? "none",
        vipWhitelistError: vipWhitelistError?.message ?? "none",
        regularWhitelistError: regularWhitelistError?.message ?? "none",
        pausedError: pausedError?.message ?? "none",
        priceError: priceError?.message ?? "none",
        totalSupplyError: totalSupplyError?.message ?? "none",
        maxSupplyError: maxSupplyError?.message ?? "none",
        balanceError: balanceError?.message ?? "none",
        vipWhitelistMintedError: vipWhitelistMintedError?.message ?? "none",
        regularWhitelistMintedError: regularWhitelistMintedError?.message ?? "none",
        vipStartError: vipStartError?.message ?? "none",
        vipEndError: vipEndError?.message ?? "none",
        regularStartError: regularStartError?.message ?? "none",
        regularEndError: regularEndError?.message ?? "none",
        publicStartError: publicStartError?.message ?? "none",
        publicEndError: publicEndError?.message ?? "none",
      },
    });
  }, [
    isPublicMintActive,
    isVipWhitelistMintActive,
    isRegularWhitelistMintActive,
    isPaused,
    mintPrice,
    totalSupply,
    maxSupply,
    balance,
    vipWhitelistMinted,
    regularWhitelistMinted,
    vipWhitelistStartTime,
    vipWhitelistEndTime,
    regularWhitelistStartTime,
    regularWhitelistEndTime,
    publicMintStartTime,
    publicMintEndTime,
    publicError,
    vipWhitelistError,
    regularWhitelistError,
    pausedError,
    priceError,
    totalSupplyError,
    maxSupplyError,
    balanceError,
    vipWhitelistMintedError,
    regularWhitelistMintedError,
    vipStartError,
    vipEndError,
    regularStartError,
    regularEndError,
    publicStartError,
    publicEndError,
  ]);

  // Fetch Merkle proofs
  useEffect(() => {
    async function fetchMerkleProofs() {
      if (!address) return;
      setIsFetchingProofs(true);
      try {
        const gtdDoc = await getDoc(doc(db, "whitelists", "gtd"));
        const fcfsDoc = await getDoc(doc(db, "whitelists", "fcfs"));
        const gtdProofs = gtdDoc.exists() ? gtdDoc.data().proofs?.[address.toLowerCase()] || [] : [];
        const fcfsProofs = fcfsDoc.exists() ? fcfsDoc.data().proofs?.[address.toLowerCase()] || [] : [];
        setVipMerkleProof(gtdProofs);
        setRegularMerkleProof(fcfsProofs);
        console.log("Merkle Proofs Debug:", { vipMerkleProof: gtdProofs, regularMerkleProof: fcfsProofs });
      } catch (error: unknown) {
        console.error("Error fetching Merkle proofs:", error);
        toast.error("Failed to fetch whitelist status", { position: "top-right", theme: "dark" });
      } finally {
        setIsFetchingProofs(false);
      }
    }
    fetchMerkleProofs();
  }, [address]);

  // Determine phase eligibility
  const now = Math.floor(Date.now() / 1000);
  const isVipPhaseActive = Number(vipWhitelistStartTime || 1767225600) <= now && now < Number(vipWhitelistEndTime || 1767229200);
  const isRegularPhaseActive = Number(regularWhitelistStartTime || 1767232800) <= now && now < Number(regularWhitelistEndTime || 1767236400);
  const isPublicPhaseActive =
    Number(publicMintStartTime || 1767240000) <= now && (now < Number(publicMintEndTime || 1771468740) || Number(totalSupply || 0) < Number(maxSupply || 0));

  const isVipEligible = Boolean(
    (isVipWhitelistMintActive || isVipPhaseActive) &&
      vipMerkleProof.length > 0 &&
      Number(vipWhitelistMinted || 0) === 0
  );
  const isRegularEligible = Boolean(
    (isRegularWhitelistMintActive || isRegularPhaseActive) &&
      (regularMerkleProof.length > 0 || vipMerkleProof.length > 0) &&
      Number(regularWhitelistMinted || 0) === 0
  );
  const isPublicEligible = Boolean(isPublicMintActive || isPublicPhaseActive) && isConnected;

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

  // Estimate gas
  const numTokens = numberOfTokens || 1;
  const merkleProof = isVipPhaseActive && isVipWhitelistMintActive
    ? vipMerkleProof
    : isRegularPhaseActive && isRegularWhitelistMintActive
      ? vipMerkleProof.length > 0
        ? vipMerkleProof
        : regularMerkleProof
      : [];
  const mintData = mintPrice && numTokens >= 1 && numTokens <= 10 && isConnected
    ? encodeFunctionData({
        abi: CatcentNFTABI,
        functionName: "mint",
        args: [numTokens, merkleProof],
      })
    : undefined;
  const { data: gasEstimate, error: gasError } = useEstimateGas({
    to: contractAddress as `0x${string}`,
    data: mintData,
    value: mintPrice ? BigInt(mintPrice.toString()) * BigInt(numTokens)  : undefined,
    query: { enabled: !!mintPrice && numTokens >= 1 && numTokens <= 10 && isConnected },
  });

  // Prompt network switch on wrong network
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

  // Log wallet connection to Firebase
  useEffect(() => {
    if (isConnected && address) {
      addDoc(collection(db, "walletConnections"), {
        walletAddress: address,
        timestamp: new Date().toISOString(),
        event: "wallet_connected",
      }).catch((err) => console.error("Error logging wallet connection:", err));
      toast.success("Wallet connected successfully!", { position: "top-right", theme: "dark" });
    }
  }, [isConnected, address]);

  // Debug eligibility
  useEffect(() => {
    console.log("Eligibility Debug:", {
      isVipEligible,
      isVipWhitelistMintActive: isVipWhitelistMintActive ?? "undefined",
      isVipPhaseActive,
      vipMerkleProof,
      vipWhitelistMinted: Number(vipWhitelistMinted ?? 0),
      vipWhitelistStartTime: Number(vipWhitelistStartTime ?? 0),
      vipWhitelistEndTime: Number(vipWhitelistEndTime ?? 0),
      isRegularEligible,
      isRegularWhitelistMintActive: isRegularWhitelistMintActive ?? "undefined",
      isRegularPhaseActive,
      regularMerkleProof,
      regularWhitelistMinted: Number(regularWhitelistMinted ?? 0),
      regularWhitelistStartTime: Number(regularWhitelistStartTime ?? 0),
      regularWhitelistEndTime: Number(regularWhitelistEndTime ?? 0),
      isPublicEligible,
      isPublicMintActive: isPublicMintActive ?? "undefined",
      isPublicPhaseActive,
      publicMintStartTime: Number(publicMintStartTime ?? 0),
      publicMintEndTime: Number(publicMintEndTime ?? 0),
      now,
    });
  }, [
    isVipEligible,
    isVipWhitelistMintActive,
    isVipPhaseActive,
    vipMerkleProof,
    vipWhitelistMinted,
    vipWhitelistStartTime,
    vipWhitelistEndTime,
    isRegularEligible,
    isRegularWhitelistMintActive,
    isRegularPhaseActive,
    regularMerkleProof,
    regularWhitelistMinted,
    regularWhitelistStartTime,
    regularWhitelistEndTime,
    isPublicEligible,
    isPublicMintActive,
    isPublicPhaseActive,
    publicMintStartTime,
    publicMintEndTime,
    now,
  ]);

  // Handle increase/decrease buttons
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
        console.log(`[${phase}] Now: ${now}, Start: ${startTime}, End: ${endTime}`);
        if (!startTime || !endTime) {
          setTimeLeft(`${phase} Phase: Not Set`);
          return;
        }
        if (phase === "Public" && Number(totalSupply || 0) >= Number(maxSupply || 0)) {
          setTimeLeft("Public Phase: Sold Out");
          return;
        }
        if (now < startTime) {
          const diff = startTime - now;
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setTimeLeft(`${phase} Phase: Starts in ${hours}h ${minutes}m ${seconds}s`);
        } else if (now < endTime || (phase === "Public" && Number(totalSupply || 0) < Number(maxSupply || 0))) {
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
    }, [startTime, endTime, phase]); // Removed totalSupply, maxSupply from dependencies
    return <p className="text-xs text-cyan-300 pl-10">{timeLeft}</p>;
  }

  // Error handling
  const handleMintError = async (error: unknown, mintPrice: bigint, numberOfTokens: number) => {
    const errorMap: Record<string, string> = {
      "insufficient funds": "Insufficient MONAD for minting. Get testnet tokens from the Monad faucet.",
      "user rejected": "Transaction rejected by user.",
      "denied": "Transaction rejected by user.",
      "Exceeds max supply": "Minting would exceed max supply.",
      "Insufficient payment": `Insufficient payment. Required: ${(mintPrice * BigInt(numberOfTokens) / BigInt(1e18)).toString()} MONAD`,
      "Not VIP whitelisted": "You are not VIP whitelisted.",
      "Not whitelisted for Regular phase": "You are not whitelisted for the Regular phase.",
      "VIP whitelist already minted": "You have already minted in the VIP phase.",
      "Regular whitelist already minted": "You have already minted in the Regular phase.",
      "Minting not active": "Minting is not active. Check phase times or contract state.",
      "Contract is paused": "Minting is currently paused.",
      "network": "Network error. Please check your connection and try again.",
      "ContractFunctionExecutionError": "Contract execution failed. Please try again or contact support.",
    };
    const errorMessage = error instanceof Error && Object.keys(errorMap).find((key) => error.message.includes(key))
      ? errorMap[error.message]
      : `Failed to mint NFT: ${error instanceof Error ? error.message : "Unknown error"}`;
    toast.error(errorMessage, { position: "top-right", theme: "dark", autoClose: 5000 });
    await addDoc(collection(db, "errors"), {
      walletAddress: address || "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      event: "minting_error",
    });
  };

  const handleMint = async () => {
    if (isPaused) {
      toast.error("Minting is currently paused.", { position: "top-right", theme: "dark" });
      return;
    }
    if (!isVipPhaseActive && !isRegularPhaseActive && !isPublicPhaseActive) {
      toast.error("No minting phase is active. Check phase times.", { position: "top-right", theme: "dark" });
      return;
    }
    if (isVipPhaseActive && isVipWhitelistMintActive && !isVipEligible) {
      toast.error("You are not eligible for the VIP phase.", { position: "top-right", theme: "dark" });
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
        toast.error("Can only mint 1 NFT in whitelist phases", { position: "top-right", theme: "dark" });
        setIsInputValid(false);
        return;
      }
    } else if (isPublicPhaseActive && isPublicMintActive && (numberOfTokens < 1 || numberOfTokens > 10)) {
      toast.error("Number of tokens must be between 1 and 10 in public phase", { position: "top-right", theme: "dark" });
      setIsInputValid(false);
      return;
    }
    setIsInputValid(true);

    if (chain?.id !== monadTestnet.id) {
      try {
        await switchChain({ chainId: monadTestnet.id });
        toast.info("Switched to Monad Testnet", { position: "top-right", theme: "dark" });
      } catch (error: unknown) {
        console.error("Network switch error:", error);
        toast.error("Failed to switch to Monad Testnet. Please try manually.", { position: "top-right", theme: "dark" });
        return;
      }
    }

    if (Number(totalSupply || 0) + numberOfTokens > Number(maxSupply || 0)) {
      toast.error("Minting would exceed max supply.", { position: "top-right", theme: "dark" });
      return;
    }

    try {
      const totalCost = mintPrice ? BigInt(mintPrice.toString()) * BigInt(numberOfTokens)     : BigInt(0);
      const merkleProof = isVipPhaseActive && isVipWhitelistMintActive
        ? vipMerkleProof
        : isRegularPhaseActive && isRegularWhitelistMintActive
          ? vipMerkleProof.length > 0
            ? vipMerkleProof
            : regularMerkleProof
          : [];
      console.log("Mint Attempt:", {
        phase: isVipPhaseActive && isVipWhitelistMintActive ? "VIP" : isRegularPhaseActive && isRegularWhitelistMintActive ? "Regular" : "Public",
        numberOfTokens,
        merkleProof,
        totalCost: totalCost.toString(),
        contractAddress,
        walletAddress: address,
      });
      const result = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "mint",
        args: [numberOfTokens, merkleProof],
       value: totalCost,
      });

      await addDoc(collection(db, "mintingEvents"), {
        walletAddress: address,
        numberOfTokens,
        timestamp: new Date().toISOString(),
        event: "mint",
      });

      confetti.addConfetti({
        confettiRadius: 6,
        confettiNumber: window.innerWidth < 768 ? 100 : 200,
        confettiColors: ["#9333ea", "#22d3ee", "#fef08a", "#f472b6"],
      });
      toast.success(
        <div>
          Successfully minted {numberOfTokens} NFT(s)!{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${result}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-300"
          >
            View on Explorer
          </a>{" "}
          <button
            onClick={() => {
              const tweet = `Just minted ${numberOfTokens} Catcent NFT(s)! Join the drop at ${window.location.origin} #CatcentNFT #NFTDrop`;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, "_blank");
            }}
            className="underline text-cyan-300"
          >
            Share on Twitter
          </button>
        </div>,
        { position: "top-right", theme: "dark" }
      );
      setNumberOfTokens(1);
    } catch (error: unknown) {
      console.error("Mint Error:", error);
          // normalize mintPrice → string → bigint
    handleMintError(
      error,
      BigInt(mintPrice?.toString() ?? "0"),
      numberOfTokens
    );
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-cyan-300 font-poppins p-4 sm:p-6 md:p-8">
      <ToastContainer theme="dark" aria-live="polite" />
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4">
            <Image
              src="/catcent-logo.png"
              alt="Catcent Logo"
              width={64}
              height={64}
              className="rounded-full border-4 border-purple-600"
              unoptimized
              onError={(e) => {
                console.error("Logo load failed");
                e.currentTarget.src = "https://via.placeholder.com/64";
              }}
            />
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 drop-shadow-lg">
              Catcent NFT Drop
            </h1>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold mt-2 text-cyan-200">
            Mint Your Exclusive NFT
          </h2>
          <p className="text-sm text-yellow-200 mt-2">Current Phase: {currentPhase}</p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Section: NFT Image */}
          <section className="flex justify-center items-center md:items-start animate-slide-in-left">
            <div className="relative group max-w-md w-full">
              <Image
                src="https://gateway.pinata.cloud/ipfs/Qmf323ezwBzjbPspWnQKaDfVzFGbTBN47soSu4hkUtRAcZ"
                alt="Catcent NFT"
                width={500}
                height={500}
                className="w-full rounded-2xl shadow-2xl border-4 border-gradient-to-r from-purple-600 to-cyan-500 group-hover:scale-105 transition-transform duration-300"
                priority
                onError={(e) => {
                  console.error("NFT image load failed");
                  e.currentTarget.src = "https://via.placeholder.com/500";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300" />
            </div>
          </section>

          {/* Center Section: Mint Stages & Total Mint Status */}
          <section className="flex flex-col gap-6 items-center animate-slide-in-up">
            {/* Mint Stages */}
            <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Mint Stages</h3>
              {isLoading ? (
                <p className="text-center text-gray-300">Loading mint stages...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Pause Status */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isPaused ? "bg-red-800" : "bg-green-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-label={isPaused ? "Contract Paused" : "Contract Active"}>
                        {isPaused ? "⛔" : "✅"}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">Contract Status</span>
                    </div>
                    <span className={`text-sm font-semibold ${isPaused ? "text-red-400" : "text-green-400"}`}>
                      {isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                  {/* VIP Whitelist */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isVipEligible ? "bg-gradient-to-r from-purple-600 to-cyan-600" : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-label={isVipEligible ? "VIP Whitelist Unlocked" : "VIP Whitelist Locked"}>
                        {isVipEligible ? "🔓" : "🔒"}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">GTD (VIP)</span>
                    </div>
                    <span className={`text-sm font-semibold ${isVipEligible ? "text-green-400" : "text-red-400"}`}>
                      {isVipEligible ? "Eligible" : isVipPhaseActive ? "Not Eligible" : now < Number(vipWhitelistStartTime || 0) ? "Not Started" : "Ended"}
                    </span>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-cyan-300 pl-10">
                      Limit: {vipMerkleProof.length > 0 ? `${Number(vipWhitelistMinted || 0)}/1` : "Not Whitelisted"}
                    </p>
                  )}
                  <CountdownTimer
                    startTime={Number(vipWhitelistStartTime || 1767225600)}
                    endTime={Number(vipWhitelistEndTime || 1767229200)}
                    phase="VIP"
                  />
                  {/* Regular Whitelist */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isRegularEligible ? "bg-gradient-to-r from-purple-600 to-cyan-600" : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-label={isRegularEligible ? "Regular Whitelist Unlocked" : "Regular Whitelist Locked"}>
                        {isRegularEligible ? "🔓" : "🔒"}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">FCFS</span>
                    </div>
                    <span className={`text-sm font-semibold ${isRegularEligible ? "text-green-400" : "text-red-400"}`}>
                      {isRegularEligible ? "Eligible" : isRegularPhaseActive ? "Not Eligible" : now < Number(regularWhitelistStartTime || 0) ? "Not Started" : "Ended"}
                    </span>
                  </div>
                  {isConnected && (
                    <p className="text-xs text-cyan-300 pl-10">
                      Limit: {(regularMerkleProof.length > 0 || vipMerkleProof.length > 0) ? `${Number(regularWhitelistMinted || 0)}/1` : "Not Whitelisted"}
                    </p>
                  )}
                  <CountdownTimer
                    startTime={Number(regularWhitelistStartTime || 1767232800)}
                    endTime={Number(regularWhitelistEndTime || 1767236400)}
                    phase="Regular"
                  />
                  {/* Public Mint */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isPublicEligible ? "bg-gradient-to-r from-purple-600 to-cyan-600" : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-label={isPublicEligible ? "Public Mint Unlocked" : "Public Mint Locked"}>
                        {isPublicEligible ? "🔓" : "🔒"}
                      </span>
                      <span className="text-lg font-bold text-cyan-200">Public</span>
                    </div>
                    <span className={`text-sm font-semibold ${isPublicEligible ? "text-green-400" : "text-red-400"}`}>
                      {isPublicEligible ? "Live" : now < Number(publicMintStartTime || 0) ? "Not Started" : "Ended"}
                    </span>
                  </div>
                  {isConnected && <p className="text-xs text-cyan-300 pl-10">Limit: Up to 10 per transaction</p>}
                  <CountdownTimer
                    startTime={Number(publicMintStartTime || 1767240000)}
                    endTime={Number(publicMintEndTime || 1771468740)}
                    phase="Public"
                  />
                </div>
              )}
            </div>

            {/* Total Mint Status */}
            <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Total Mint Status</h3>
              {totalSupplyLoading || maxSupplyLoading ? (
                <p className="text-center text-gray-300">Loading mint status...</p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-cyan-300">
                    Minted: <span className="font-semibold text-yellow-200">{totalSupply?.toString() || "0"} / {maxSupply?.toString() || "N/A"}</span>
                  </p>
                  <div
                    className="w-full max-w-xs bg-gray-800 rounded-full h-3 relative overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(((Number(totalSupply) || 0) / (Number(maxSupply) || 100)) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bg-gradient-to-r from-purple-600 to-cyan-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${((Number(totalSupply) || 0) / (Number(maxSupply) || 100)) * 100}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 opacity-20" />
                  </div>
                  <p className="text-xs font-bold text-cyan-300">
                    {Math.round(((Number(totalSupply) || 0) / (Number(maxSupply) || 100)) * 100)}% Minted
                  </p>
                  {Number(totalSupply || 0) >= Number(maxSupply || 0) && (
                    <p className="text-xs text-red-400">Collection is sold out!</p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Right Section: Wallet Status & Mint Controls */}
          <section className="flex flex-col gap-6 items-center animate-slide-in-right">
            {/* Wallet Status */}
            <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              {isConnected ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-semibold text-cyan-300">
                    Connected: <span className="text-yellow-200">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </p>
                  {chain?.id !== monadTestnet.id && (
                    <p className="text-xs text-pink-400 font-medium">Wrong network! Please switch to Monad Testnet.</p>
                  )}
                <div
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg text-base font-semibold transition-all duration-300 focus:ring-2 focus:ring-purple-500"
                />
                </div>
              ) : (
               <div
                 className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg text-base font-semibold transition-all duration-300 focus:ring-2 focus:ring-purple-500"
               />
              )}
            </div>

            {/* Mint Controls */}
            {isConnected && (
              <div className="w-full max-w-md bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
                <h3 className="text-xl font-semibold text-center text-yellow-200 mb-4">Mint Your NFT</h3>
                {priceLoading || balanceLoading || isFetchingProofs ? (
                  <p className="text-center text-gray-300">
                    Loading contract data...
                    <svg className="animate-spin h-5 w-5 mx-auto mt-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-cyan-300">
                      Mint Price: <span className="font-semibold text-yellow-200">{mintPrice ? (Number(mintPrice) / 1e18).toString() : "N/A"} MONAD</span>
                    </p>
                    <p className="text-sm text-cyan-300">
                      Your NFTs: <span className="font-semibold text-yellow-200">{balance?.toString() || "0"}</span>
                    </p>
                    {gasEstimate && !gasError && (
                      <p className="text-xs text-gray-400">
                        Estimated Gas: {(Number(gasEstimate) / 1e18).toFixed(6)} MONAD
                      </p>
                    )}
                    {gasError && (
                      <p className="text-xs text-red-400">
                        Gas estimation failed: {gasError.message}
                      </p>
                    )}
                    {Number(totalSupply || 0) >= Number(maxSupply || 0) ? (
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
                              if (!isNaN(value) && value >= 1 && value <= (isVipEligible || isRegularEligible ? 1 : 10)) {
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
                          disabled={isPending || Boolean(isPaused) || !(isVipEligible || isRegularEligible || isPublicEligible)}
                          className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center transition-all duration-300 focus:ring-2 focus:ring-purple-500 ${
                            isPending || isPaused || !(isVipEligible || isRegularEligible || isPublicEligible)
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:from-purple-700 hover:to-cyan-700"
                          }`}
                          aria-label="Mint NFT"
                        >
                          {isPending ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
                          href="https://faucet.quicknode.com/monad"
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
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-cyan-300">
          <p className="text-sm">
            Join our community:{" "}
            <a href="https://discord.gg/your-discord" target="_blank" rel="noopener noreferrer" className="text-yellow-200 underline">
              Discord
            </a>{" "}
            |{" "}
            <a href="https://twitter.com/your-twitter" target="_blank" rel="noopener noreferrer" className="text-yellow-200 underline">
              Twitter
            </a>{" "}
            |{" "}
            <a href="https://opensea.io/collection/your-collection" target="_blank" rel="noopener noreferrer" className="text-yellow-200 underline">
              OpenSea
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}