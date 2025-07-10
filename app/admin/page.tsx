"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { contractAddress } from "@/config";
import CatcentNFTABI from "../CatcentNFT.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { monadTestnet } from "@reown/appkit/networks";
import { db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Admin() {
  const { isConnected, address, chain } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [vipStartTime, setVipStartTime] = useState("1752112800"); // July 10, 2025, 14:00 UTC
  const [vipEndTime, setVipEndTime] = useState("1752120000");     // July 10, 2025, 16:00 UTC
  const [regularStartTime, setRegularStartTime] = useState("1752120000"); // July 10, 2025, 16:00 UTC
  const [regularEndTime, setRegularEndTime] = useState("1752127200");     // July 10, 2025, 18:00 UTC
  const [publicStartTime, setPublicStartTime] = useState("1752127200");   // July 10, 2025, 18:00 UTC
  const [publicEndTime, setPublicEndTime] = useState("1752300000");       // July 31, 2025, 23:59 UTC
  const [mintPrice, setMintPrice] = useState("3.55");
  const [vipAddresses, setVipAddresses] = useState("");
  const [regularAddresses, setRegularAddresses] = useState("");
  const [baseURI, setBaseURI] = useState(
    "https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/bafybeicevjhoydcv6lnmxo3gwylrvp6vxpap66ssi2l2xw5p6vdj7horbe/"
  );
  const [isOwner, setIsOwner] = useState(false);

  // Check if connected wallet is owner
  const { data: owner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "owner",
  }) as { data: `0x${string}` | undefined };

  // Read contract state
  const { data: isVipWhitelistMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isVipWhitelistMintActive",
  });
  const { data: isRegularWhitelistMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isRegularWhitelistMintActive",
  });
  const { data: isPublicMintActive } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isPublicMintActive",
  });
  const { data: isPaused } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "isPaused",
  });
  const { data: totalSupply } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "totalSupply",
  });
  const { data: maxSupply } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "maxSupply",
  });
  const { data: contractBalance } = useBalance({
    address: contractAddress as `0x${string}`,
    chainId: monadTestnet.id,
  });

  useEffect(() => {
    if (isConnected && address && owner) {
      setIsOwner(address.toLowerCase() === owner.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [address, owner, isConnected]);

  // Generate Merkle tree and root
  const generateMerkleTree = (addresses: string[]) => {
    const leaves = addresses.map((addr) => keccak256(addr.toLowerCase()));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();
    return { root, proofs: {} }; // Proofs not stored, generated on-demand
  };

  // Handle pause/unpause
  const handleSetPaused = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setPaused",
        args: [!isPaused],
      });
      toast.success(`Contract ${isPaused ? "unpaused" : "paused"} successfully!`, { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Pause/unpause error:", error);
      toast.error(`Failed to update pause state: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Handle phase time updates
  const handleSetPhaseTimes = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }

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
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setVipWhitelistStartTime",
        args: [vipStart],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setVipWhitelistEndTime",
        args: [vipEnd],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setRegularWhitelistStartTime",
        args: [regularStart],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setRegularWhitelistEndTime",
        args: [regularEnd],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setPublicMintStartTime",
        args: [publicStart],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setPublicMintEndTime",
        args: [publicEnd],
      });
      toast.success("Phase times updated successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Phase times update error:", error);
      toast.error(`Failed to update phase times: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Handle mint price update
  const handleSetMintPrice = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    if (parseFloat(mintPrice) <= 0) {
      toast.error("Mint price must be greater than 0.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setMintPrice",
        args: [BigInt(Math.round(parseFloat(mintPrice) * 1e18))],
      });
      toast.success("Mint price updated successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Mint price update error:", error);
      toast.error(`Failed to update mint price: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Handle base URI update
  const handleSetBaseURI = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    if (!baseURI.startsWith("https://") || baseURI.length < 10) {
      toast.error("Please provide a valid base URI.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setBaseURI",
        args: [baseURI],
      });
      toast.success("Base URI updated successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Base URI update error:", error);
      toast.error(`Failed to update base URI: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Handle withdraw funds
  const handleWithdraw = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    if (!contractBalance?.value || contractBalance.value <= 0) {
      toast.error("No funds available to withdraw.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "withdraw",
        args: [],
      });
      toast.success("Funds withdrawn successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Withdraw error:", error);
      toast.error(`Failed to withdraw funds: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Handle whitelist updates
  const handleSetWhitelists = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
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

      const maxAddresses = 10000; // Adjust as needed
      if (vipAddrs.length > maxAddresses || regularAddrs.length > maxAddresses) {
        toast.error(`Too many addresses. Maximum allowed is ${maxAddresses}.`, { position: "top-right", theme: "dark" });
        return;
      }

      const batchSize = 1000; // Store 1,000 addresses per document (~42 KB)

      const saveAddresses = async (addresses: string[], type: "gtd" | "fcfs") => {
        if (addresses.length === 0) return;
        // Generate Merkle root
        const merkle = generateMerkleTree(addresses);
        // Update Merkle root on-chain
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: CatcentNFTABI,
          functionName: type === "gtd" ? "setVipMerkleRoot" : "setRegularMerkleRoot",
          args: [merkle.root],
        });
        // Split addresses into batches for Firestore
        const batches = [];
        for (let i = 0; i < addresses.length; i += batchSize) {
          batches.push(addresses.slice(i, i + batchSize));
        }
        // Write each batch to Firestore
        for (let i = 0; i < batches.length; i++) {
          await setDoc(doc(db, "whitelists", `${type}_addresses_batch_${i + 1}`), {
            merkleRoot: merkle.root,
            addresses: batches[i],
          });
        }
      };

      if (vipAddrs.length > 0) await saveAddresses(vipAddrs, "gtd");
      if (regularAddrs.length > 0) await saveAddresses(regularAddrs, "fcfs");

      toast.success("Whitelists updated successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      console.error("Whitelist update error:", error); // Use the error variable to fix ESLint
      toast.error(`Failed to update whitelists: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-cyan-300 font-poppins p-4 sm:p-6 md:p-8">
      <ToastContainer theme="dark" aria-live="polite" />
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 mb-8">
          Catcent NFT Admin Panel
        </h1>
        {!isConnected ? (
          <p className="text-center text-red-400">Please connect your wallet.</p>
        ) : !isOwner ? (
          <p className="text-center text-red-400">You are not the contract owner.</p>
        ) : chain?.id !== monadTestnet.id ? (
          <p className="text-center text-red-400">Please switch to Monad Testnet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phase States */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Phase States</h2>
              <p>Total Supply: {totalSupply?.toString() || "0"} / {maxSupply?.toString() || "3535"}</p>
              <p>Contract Balance: {(contractBalance?.value || BigInt(0)) / BigInt(1e18)} MONAD</p>
              <div className="flex flex-col gap-4">
                <div>
                  <p>VIP Whitelist Mint (GTD): {isVipWhitelistMintActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p>Regular Whitelist Mint (FCFS): {isRegularWhitelistMintActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p>Public Mint: {isPublicMintActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p>Contract Paused: {isPaused ? "Paused" : "Active"}</p>
                  <button
                    onClick={handleSetPaused}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                    }`}
                  >
                    {isPending ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                  </button>
                </div>
              </div>
            </div>

            {/* Phase Times */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Phase Times</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">VIP Start Time (GTD)</label>
                  <DatePicker
                    selected={vipStartTime ? new Date(parseInt(vipStartTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setVipStartTime(Math.floor(date.getTime() / 1000).toString()) : setVipStartTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {vipStartTime ? new Date(parseInt(vipStartTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">VIP End Time (GTD)</label>
                  <DatePicker
                    selected={vipEndTime ? new Date(parseInt(vipEndTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setVipEndTime(Math.floor(date.getTime() / 1000).toString()) : setVipEndTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {vipEndTime ? new Date(parseInt(vipEndTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Regular Start Time (FCFS)</label>
                  <DatePicker
                    selected={regularStartTime ? new Date(parseInt(regularStartTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setRegularStartTime(Math.floor(date.getTime() / 1000).toString()) : setRegularStartTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {regularStartTime ? new Date(parseInt(regularStartTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm">Regular End Time (FCFS)</label>
                  <DatePicker
                    selected={regularEndTime ? new Date(parseInt(regularEndTime) * 1000) : null}
                    onChange={(date: Date | null) =>
                      date ? setRegularEndTime(Math.floor(date.getTime() / 1000).toString()) : setRegularEndTime("")
                    }
                    showTimeSelect
                    dateFormat="Pp"
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {publicEndTime ? new Date(parseInt(publicEndTime) * 1000).toUTCString() : "Not set"}
                  </p>
                </div>
                <button
                  onClick={handleSetPhaseTimes}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                </div>
                <button
                  onClick={handleSetMintPrice}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
                >
                  {isPending ? "Processing..." : "Update Mint Price"}
                </button>
              </div>
            </div>

            {/* Base URI */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Base URI</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">Base URI (Pinata)</label>
                  <input
                    type="text"
                    value={baseURI}
                    onChange={(e) => setBaseURI(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                    placeholder="https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/<CID>/"
                  />
                </div>
                <button
                  onClick={handleSetBaseURI}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
                >
                  {isPending ? "Processing..." : "Update Base URI"}
                </button>
              </div>
            </div>

            {/* Withdraw Funds */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Withdraw Funds</h2>
              <div className="flex flex-col gap-4">
                <p>Contract Balance: {(contractBalance?.value || BigInt(0)) / BigInt(1e18)} MONAD</p>
                <button
                  onClick={handleWithdraw}
                  disabled={isPending || !contractBalance?.value || contractBalance.value <= 0}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending || !contractBalance?.value || contractBalance.value <= 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
                >
                  {isPending ? "Processing..." : "Withdraw Funds"}
                </button>
              </div>
            </div>

            {/* Whitelists */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Whitelists</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">Upload Whitelist File (JSON)</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const text = event.target?.result as string;
                            const json = JSON.parse(text);
                            setVipAddresses(json.vipAddresses?.join(",") || "");
                            setRegularAddresses(json.regularAddresses?.join(",") || "");
                          } catch (error: unknown) {
                            console.error("JSON parsing error:", error);
                            toast.error("Invalid JSON file.", { position: "top-right", theme: "dark" });
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                  />
                </div>
                <button
                  onClick={handleSetWhitelists}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
                >
                  {isPending ? "Processing..." : "Update Whitelists"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}