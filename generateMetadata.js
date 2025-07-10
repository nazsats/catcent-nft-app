const fs = require("fs");
const path = require("path");
const imageCID = "bafybeifkljwudpvlfhtcq5qrmg54hw3qu57rhtwx4zchrdiqta33xrsl4i"; // Replace with your image CID
const outputDir = "./nft-metadata";
// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
// Generate metadata for 100 NFTs
for (let i = 0; i < 3535; i++) {
  const metadata = {
    name: `Catcents #${i}`,
    description: "Your early Degen status from catcents.",
    image: `ipfs://${imageCID}`,
    attributes: [],
  };
  fs.writeFileSync(
    path.join(outputDir, `${i}.json`),
    JSON.stringify(metadata, null, 2)
  );
}
console.log("Generated 3535 metadata files in", outputDir);