const fs = require("fs");
const path = require("path");

const videoCID = "bafybeifkljwudpvlfhtcq5qrmg54hw3qu57rhtwx4zchrdiqta33xrsl4i"; // Correct CID for catcent.mp4
const thumbnailCID = "bafybeialb7k5mnmvfdhtem3ssp7qnqeffkezb3se4dxoamhgqixzyvvu7u"; // Replace with CID of a PNG/JPEG thumbnail
const outputDir = "./nft-metadata";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (let i = 0; i < 3535; i++) {
  const metadata = {
    name: `Catcents #${i}`,
    description: "Your early Degen status from catcents.",
    animation_url: `https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/${videoCID}`,
    image: `https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/${thumbnailCID}`,
    external_url: "https://catcents.io",
    attributes: [],
    properties: {
      files: [
        {
          uri: `https://teal-characteristic-reindeer-501.mypinata.cloud/ipfs/${videoCID}`,
          type: "video/mp4"
        }
      ]
    }
  };
  fs.writeFileSync(
    path.join(outputDir, `${i}.json`),
    JSON.stringify(metadata, null, 2)
  );
}
console.log("Generated 3535 metadata files in", outputDir);