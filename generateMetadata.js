const fs = require("fs");
const path = require("path");
const imageCID = "Qmf323ezwBzjbPspWnQKaDfVzFGbTBN47soSu4hkUtRAcZ"; // Replace with your image CID
const outputDir = "./nft-metadata";
// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
// Generate metadata for 100 NFTs
for (let i = 0; i < 100; i++) {
  const metadata = {
    name: `CatcentNFT #${i}`,
    description: "A unique Catcent NFT from the exclusive collection.",
    image: `ipfs://${imageCID}`,
    attributes: [],
  };
  fs.writeFileSync(
    path.join(outputDir, `${i}.json`),
    JSON.stringify(metadata, null, 2)
  );
}
console.log("Generated 100 metadata files in", outputDir);