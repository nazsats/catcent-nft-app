const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const CatcentNFT = await ethers.getContractFactory("CatcentNFT");
  const contract = await CatcentNFT.deploy();
  const deploymentReceipt = await contract.deploymentTransaction().wait(); // Wait for deployment to be mined
  const contractAddress = deploymentReceipt.contractAddress || contract.target; // Get address from receipt or contract
  console.log("CatcentNFT deployed to:", contractAddress, "at timestamp:", Math.floor(Date.now() / 1000));
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});