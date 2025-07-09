const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting phase times with account:", deployer.address);

  const contractAddress = "0x28D021E094a4abCed939149F88a2C815Df9D5733"; // Replace with your deployed contract address
  const CatcentNFT = await ethers.getContractFactory("CatcentNFT");
  const contract = await CatcentNFT.attach(contractAddress);

  const vipStart = 1751983241; // 6:00 PM IST, July 08, 2025
  const vipEnd = 1751986841; // 7:00 PM IST
  const regularStart = 1751987741; // 6:30 PM IST
  const regularEnd = 1751991641; // 7:30 PM IST
  const publicStart = 1751986841; // 7:00 PM IST
  const publicEnd = 1752164441; // 8:00 PM IST

  // Set phase times
  await contract.setPhaseTimes(vipStart, vipEnd, regularStart, regularEnd, publicStart, publicEnd);
  console.log("Phase times set:", { vipStart, vipEnd, regularStart, regularEnd, publicStart, publicEnd });

  // Toggle phases based on current timestamp
  const now = Math.floor(Date.now() / 1000);
  await contract.toggleVipWhitelistMint(now >= vipStart && now <= vipEnd);
  await contract.toggleRegularWhitelistMint(now >= regularStart && now <= regularEnd);
  await contract.togglePublicMint(now >= publicStart && now <= publicEnd);
  console.log("Phase toggles updated at timestamp:", now);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});