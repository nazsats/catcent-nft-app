const { ethers } = require("ethers");
const CatcentNFTABI = require("../CatcentNFTABI");

async function main() {
  const contractAddress = "0xYourContractAddress"; // Replace with your deployed contract address
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  const contract = new ethers.Contract(contractAddress, CatcentNFTABI, provider);
  const now = Math.floor(Date.now() / 1000);
  console.log("Current timestamp:", now);
  const [vipStart, vipEnd, regularStart, regularEnd, publicStart, publicEnd, vipActive, regularActive, publicActive] =
    await Promise.all([
      contract.vipWhitelistStartTime().then((t) => t.toString()),
      contract.vipWhitelistEndTime().then((t) => t.toString()),
      contract.regularWhitelistStartTime().then((t) => t.toString()),
      contract.regularWhitelistEndTime().then((t) => t.toString()),
      contract.publicMintStartTime().then((t) => t.toString()),
      contract.publicMintEndTime().then((t) => t.toString()),
      contract.isVipWhitelistMintActive(),
      contract.isRegularWhitelistMintActive(),
      contract.isPublicMintActive(),
    ]);
  console.log("VIP Start:", vipStart);
  console.log("VIP End:", vipEnd);
  console.log("Regular Start:", regularStart);
  console.log("Regular End:", regularEnd);
  console.log("Public Start:", publicStart);
  console.log("Public End:", publicEnd);
  console.log("VIP Active:", vipActive);
  console.log("Regular Active:", regularActive);
  console.log("Public Active:", publicActive);
}

main().catch((error) => console.error("Error:", error));