import { NextResponse } from "next/server";
import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

// Initialize Pinata (keys are server-side only)
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "File and name are required" }, { status: 400 });
    }

    // Convert File to Readable stream for Pinata
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const options = { pinataMetadata: { name } };
    const result = await pinata.pinFileToIPFS(stream, options);

    return NextResponse.json({ cid: result.IpfsHash }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error uploading to IPFS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to upload to IPFS: ${errorMessage}` }, { status: 500 });
  }
}