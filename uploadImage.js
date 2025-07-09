const { PinataSDK } = require("pinata");
const fs = require("fs");
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});
async function uploadImage() {
  try {
    const file = new File([fs.readFileSync("./nft-images/catcent.png")], "catcent.png", { type: "image/png" });
    const upload = await pinata.upload.file(file);
    console.log("Image CID:", upload.cid);
  } catch (error) {
    console.error("Upload error:", error);
  }
}
uploadImage();