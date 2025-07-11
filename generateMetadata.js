const fs = require("fs");
const path = require("path");

const videoCID = "bafybeifkljwudpvlfhtcq5qrmg54hw3qu57rhtwx4zchrdiqta33xrsl4i";
const thumbnailCID = "bafybeialb7k5mnmvfdhtem3ssp7qnqeffkezb3se4dxoamhgqixzyvvu7u";
const outputDir = "./nft-metadata";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (let i = 0; i < 3535; i++) {
  const metadata = {
    name: `Catcents #${i}`,
    description: "Your early Degen status from catcents.",
    animation_url: `ipfs://${videoCID}/`,
    image: `ipfs://${thumbnailCID}/`,
    external_url: "https://catcents.io",
    attributes: [],
    properties: {
      files: [
        {
          uri: `ipfs://${videoCID}/${i}.mp4`,
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