import { NextResponse } from "next/server";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

export async function POST(request: Request) {
  console.log("API Key:", process.env.PINATA_API_KEY ? "Loaded" : "Missing");
  console.log("Secret Key:", process.env.PINATA_SECRET_API_KEY ? "Loaded" : "Missing");
  console.log("Request received at", new Date().toISOString());
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      console.error(`Missing file or name: file=${!!file}, name=${name}`);
      return NextResponse.json({ error: "File and name are required" }, { status: 400 });
    }

    console.log(`Processing file: ${name}, size: ${file.size} bytes`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const options = { pinataMetadata: { name } };
    console.log(`Uploading ${name} to Pinata...`);
    const result = await pinata.pinFileToIPFS(stream, options);
    console.log(`Uploaded ${name} with CID: ${result.IpfsHash}`);

    return NextResponse.json({ cid: result.IpfsHash }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error uploading to IPFS:", error);
    const errorMessage = error instanceof Error ? `${error.message}\n${error.stack}` : `Unknown error: ${JSON.stringify(error)}`;
    return NextResponse.json({ error: `Failed to upload to IPFS: ${errorMessage}` }, { status: 500 });
  }
}