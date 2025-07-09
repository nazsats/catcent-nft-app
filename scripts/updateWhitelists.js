const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Updating whitelists with account:", deployer.address);

  const contractAddress = "0x28D021E094a4abCed939149F88a2C815Df9D5733"; // Replace with your deployed contract address
  const CatcentNFT = await ethers.getContractFactory("CatcentNFT");
  const contract = await CatcentNFT.attach(contractAddress);

  const gtdAddresses = [
    "0x6D54EF5Fa17d69717Ff96D2d868e040034F26024",
    "0xfF8b7625894441C26fEd460dD21360500BF4E767"
  ];
  const fcfsAddresses = [
    "0x35837dbAa8BF4a3A5Fe0F60D1eF9cA1e49f200dd",
    "0xE5De1D605ea68A661aF5a22FDFeFB8E5fa4a021a"
  ];

  // Update GTD whitelist
  const gtdLeaves = gtdAddresses.map((addr) => keccak256(ethers.getAddress(addr)));
  const gtdTree = new MerkleTree(gtdLeaves, keccak256, { sortPairs: true });
  const gtdRoot = gtdTree.getHexRoot();
  await contract.setVipMerkleRoot(gtdRoot);
  console.log("GTD Merkle Root set:", gtdRoot);

  // Update FCFS whitelist
  const fcfsLeaves = fcfsAddresses.map((addr) => keccak256(ethers.getAddress(addr)));
  const fcfsTree = new MerkleTree(fcfsLeaves, keccak256, { sortPairs: true });
  const fcfsRoot = fcfsTree.getHexRoot();
  await contract.setRegularMerkleRoot(fcfsRoot);
  console.log("FCFS Merkle Root set:", fcfsRoot);

  // Store proofs in Firebase (simulated here, integrate with your Firebase setup)
  const gtdProofs = gtdAddresses.reduce((acc, addr) => {
    const leaf = keccak256(ethers.getAddress(addr));
    acc[addr.toLowerCase()] = gtdTree.getHexProof(leaf);
    return acc;
  }, {});
  const fcfsProofs = fcfsAddresses.reduce((acc, addr) => {
    const leaf = keccak256(ethers.getAddress(addr));
    acc[addr.toLowerCase()] = fcfsTree.getHexProof(leaf);
    return acc;
  }, {});
  console.log("GTD Proofs:", gtdProofs);
  console.log("FCFS Proofs:", fcfsProofs);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});