"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
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
  const [vipStartTime, setVipStartTime] = useState("1752045050"); // March 1, 2026, 00:00 UTC
  const [vipEndTime, setVipEndTime] = useState("1752046250");     // March 1, 2026, 01:00 UTC
  const [regularStartTime, setRegularStartTime] = useState("1752046250"); // March 1, 2026, 02:00 UTC
  const [regularEndTime, setRegularEndTime] = useState("1752047450");     // March 1, 2026, 03:00 UTC
  const [publicStartTime, setPublicStartTime] = useState("1752047450");   // March 1, 2026, 04:00 UTC
  const [publicEndTime, setPublicEndTime] = useState("1752133850");       // March 31, 2026, 23:59 UTC
  const [mintPrice, setMintPrice] = useState("0.01");
  const [vipAddresses, setVipAddresses] = useState("");
  const [regularAddresses, setRegularAddresses] = useState("");
  const [isOwner, setIsOwner] = useState(false);


  // Check if connected wallet is owner
  const { data: owner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CatcentNFTABI,
    functionName: "owner",
  }) as { data: `0x${string}` | undefined };

  useEffect(() => {
    if (isConnected && address && owner) {
      setIsOwner(address.toLowerCase() === owner.toLowerCase());
    } else {
      setIsOwner(false);
    }
  }, [address, owner, isConnected]);

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

  // Generate Merkle tree and proofs
  const generateMerkleTree = (addresses: string[]) => {
    const leaves = addresses.map((addr) => keccak256(addr.toLowerCase()));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();
    const proofs: { [key: string]: string[] } = {};
    addresses.forEach((addr) => {
      proofs[addr.toLowerCase()] = tree.getHexProof(keccak256(addr.toLowerCase()));
    });
    return { root, proofs };
  };

  // Handle phase state updates
  const handleSetPhaseState = async (state: string, value: boolean) => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    try {
      let functionName: string;
      if (state === "paused") functionName = "setPaused";
      else if (state === "vip") functionName = "setVipWhitelistMintActive";
      else if (state === "regular") functionName = "setRegularWhitelistMintActive";
      else if (state === "public") functionName = "setPublicMintActive";
      else return;

      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName,
        args: [value],
      });
      toast.success(`${state} state updated successfully!`, { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      toast.error(`Failed to update ${state} state: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
    }
  };

  // Sync phase states based on current time
  const syncPhaseStates = async () => {
    if (!isOwner) {
      toast.error("Only the contract owner can perform this action.", { position: "top-right", theme: "dark" });
      return;
    }
    if (chain?.id !== monadTestnet.id) {
      toast.error("Please switch to Monad Testnet.", { position: "top-right", theme: "dark" });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    try {
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setVipWhitelistMintActive",
        args: [now >= parseInt(vipStartTime) && now < parseInt(vipEndTime)],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setRegularWhitelistMintActive",
        args: [now >= parseInt(regularStartTime) && now < parseInt(regularEndTime)],
      });
      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: CatcentNFTABI,
        functionName: "setPublicMintActive",
        args: [now >= parseInt(publicStartTime)],
      });
      toast.success("Phase states synced successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
      toast.error(`Failed to sync phase states: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
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
      toast.error(`Failed to update mint price: ${(error as Error).message}`, { position: "top-right", theme: "dark" });
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

      const vipMerkle = vipAddrs.length > 0 ? generateMerkleTree(vipAddrs) : { root: "0x", proofs: {} };
      const regularMerkle = regularAddrs.length > 0 ? generateMerkleTree(regularAddrs) : { root: "0x", proofs: {} };

      if (vipAddrs.length > 0) {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: CatcentNFTABI,
          functionName: "setVipMerkleRoot",
          args: [vipMerkle.root],
        });
        await setDoc(doc(db, "whitelists", "gtd"), { merkleRoot: vipMerkle.root, proofs: vipMerkle.proofs });
      }
      if (regularAddrs.length > 0) {
        await writeContractAsync({
          address: contractAddress as `0x${string}`,
          abi: CatcentNFTABI,
          functionName: "setRegularMerkleRoot",
          args: [regularMerkle.root],
        });
        await setDoc(doc(db, "whitelists", "fcfs"), { merkleRoot: regularMerkle.root, proofs: regularMerkle.proofs });
      }

      toast.success("Whitelists updated successfully!", { position: "top-right", theme: "dark" });
    } catch (error: unknown) {
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
              <div className="flex flex-col gap-4">
                <div>
                  <p>VIP Whitelist Mint: {isVipWhitelistMintActive ? "Active" : "Inactive"}</p>
                  <button
                    onClick={() => handleSetPhaseState("vip", !isVipWhitelistMintActive)}
                    disabled={isPending}
                    className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                    }`}
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
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                    }`}
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
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                    }`}
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
                      isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                    }`}
                  >
                    {isPending ? "Processing..." : isPaused ? "Unpause Contract" : "Pause Contract"}
                  </button>
                </div>
                <button
                  onClick={syncPhaseStates}
                  disabled={isPending}
                  className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg mt-2 ${
                    isPending ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-cyan-700"
                  }`}
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
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
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
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

            {/* Whitelists */}
            <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-purple-600">
              <h2 className="text-xl font-semibold text-yellow-200 mb-4">Whitelists</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm">VIP Whitelist Addresses (comma-separated)</label>
                  <textarea
                    value={vipAddresses}
                    onChange={(e) => setVipAddresses(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                    rows={4}
                    placeholder="0xAddress1,0xAddress2,..."
                  />
                </div>
                <div>
                  <label className="block text-sm">Regular Whitelist Addresses (comma-separated)</label>
                  <textarea
                    value={regularAddresses}
                    onChange={(e) => setRegularAddresses(e.target.value)}
                    className="w-full p-2 rounded-lg bg-gray-800 border-2 border-purple-600 text-cyan-300"
                    rows={4}
                    placeholder="0xAddress1,0xAddress2,..."
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





