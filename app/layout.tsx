import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ContextProvider from "@/context";
import { headers } from "next/headers";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "Catcent NFT Drop",
  description: "Mint NFTs on Monad Testnet",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookies = headersList.get("cookie") ?? null; // Fallback to null if cookie is not set

  return (
    <html lang="en">
      <body className={poppins.className}>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  );
}