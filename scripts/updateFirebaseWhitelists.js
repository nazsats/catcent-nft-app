const { db } = require("./firebaseConfig");
const { getFirestore, doc, setDoc } = require("firebase-admin/firestore");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");

async function updateFirebaseWhitelists() {
  const gtdAddresses = [
    "0x6D54EF5Fa17d69717Ff96D2d868e040034F26024",
    "0xfF8b7625894441C26fEd460dD21360500BF4E767"
  ];
  const fcfsAddresses = [
    "0x35837dbAa8BF4a3A5Fe0F60D1eF9cA1e49f200dd",
    "0xE5De1D605ea68A661aF5a22FDFeFB8E5fa4a021a"
  ];

  // GTD whitelist
  const gtdLeaves = gtdAddresses.map((addr) => keccak256(ethers.getAddress(addr)));
  const gtdTree = new MerkleTree(gtdLeaves, keccak256, { sortPairs: true });
  const gtdRoot = gtdTree.getHexRoot();
  const gtdProofs = gtdAddresses.reduce((acc, addr) => {
    const leaf = keccak256(ethers.getAddress(addr));
    acc[addr.toLowerCase()] = gtdTree.getHexProof(leaf);
    return acc;
  }, {});
  try {
    await setDoc(doc(db, "whitelists", "gtd"), {
      merkleRoot: gtdRoot,
      proofs: gtdProofs,
      updatedAt: new Date().toISOString(),
    });
    console.log("GTD whitelist updated in Firebase");
  } catch (error) {
    console.error("Error updating GTD whitelist:", error);
    throw error;
  }

  // FCFS whitelist
  const fcfsLeaves = fcfsAddresses.map((addr) => keccak256(ethers.getAddress(addr)));
  const fcfsTree = new MerkleTree(fcfsLeaves, keccak256, { sortPairs: true });
  const fcfsRoot = fcfsTree.getHexRoot();
  const fcfsProofs = fcfsAddresses.reduce((acc, addr) => {
    const leaf = keccak256(ethers.getAddress(addr));
    acc[addr.toLowerCase()] = fcfsTree.getHexProof(leaf);
    return acc;
  }, {});
  try {
    await setDoc(doc(db, "whitelists", "fcfs"), {
      merkleRoot: fcfsRoot,
      proofs: fcfsProofs,
      updatedAt: new Date().toISOString(),
    });
    console.log("FCFS whitelist updated in Firebase");
  } catch (error) {
    console.error("Error updating FCFS whitelist:", error);
    throw error;
  }
}

updateFirebaseWhitelists().catch((error) => console.error("Error:", error));