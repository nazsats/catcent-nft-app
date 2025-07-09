// uploadMetadata.js
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

const metadataDir = "./metadata";

async function uploadFiles() {
  const files = fs.readdirSync(metadataDir);
  for (const file of files) {
    const filePath = path.join(metadataDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("name", file);

    try {
      const response = await fetch("http://localhost:3000/api/pinata/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log(`Metadata ${file} CID:`, result.cid);
    } catch (err) {
      console.error(`Error uploading ${file}:`, err.message);
    }
  }
}

uploadFiles().then(() => console.log("All metadata uploaded!"));