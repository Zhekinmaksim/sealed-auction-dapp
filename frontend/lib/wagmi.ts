import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Sealed Bid Auction",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [baseSepolia],
  ssr: true,
});

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_AUCTION_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
