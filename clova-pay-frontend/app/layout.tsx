import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ClovaPay - Convert Crypto to Fiat for Africa",
  description: "Easily convert your STX and stablecoins to local African currencies. Fast, secure, and low fees.",
  keywords: ["crypto", "fiat", "Africa", "STX", "Stacks", "USDC", "off-ramp", "Nigeria", "Kenya", "Ghana"],
  openGraph: {
    title: "ClovaPay - Crypto to Fiat for Africa",
    description: "Convert your crypto to NGN, KES, GHS and more. Powered by Stacks.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
