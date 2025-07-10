const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

const metadataDir = "./nft-metadata";
const failedUploads = [];

async function uploadFile(file) {
  const filePath = path.join(metadataDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    failedUploads.push({ file, error: "File not found" });
    return;
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
    if (response.ok && result.cid) {
      console.log(`Metadata ${file} CID:`, result.cid);
    } else {
      console.error(`Failed to upload ${file}:`, result.error || `HTTP ${response.status}: ${response.statusText}`);
      failedUploads.push({ file, error: result.error || `HTTP ${response.status}: ${response.statusText}` });
    }
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (err) {
    console.error(`Error uploading ${file}:`, err.message, err.stack);
    failedUploads.push({ file, error: err.message, stack: err.stack });
  }
}

async function uploadFiles() {
  const files = fs.readdirSync(metadataDir);
  for (const file of files) {
    await uploadFile(file); // Process files sequentially with delay
  }
  if (failedUploads.length > 0) {
    fs.writeFileSync("failedUploads.json", JSON.stringify(failedUploads, null, 2));
    console.log("Failed uploads saved to failedUploads.json");
  }
  console.log("All metadata uploaded!");
}

uploadFiles().catch((err) => console.error("Upload process failed:", err));