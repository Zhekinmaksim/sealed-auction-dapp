"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useConfSealedAuction } from "@/hooks/useConfSealedAuction";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { auctionABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/wagmi";

const CREATION_DEPOSIT = "0.001"; // ETH

function formatTime(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0) return "Ended";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : "", `${sec}s`].filter(Boolean).join(" ");
}

function RoundHistory({ roundCount }: { roundCount: bigint }) {
  const count = Number(roundCount);
  const rounds = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white mb-3">📜 Round History</h3>
      {count === 0 ? (
        <p className="text-gray-400 text-sm">No completed rounds yet</p>
      ) : (
        <div className="space-y-2">
          {rounds.map((i) => (
            <RoundItem key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoundItem({ index }: { index: number }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "getRoundResult",
    args: [BigInt(index)],
  });

  if (!data) return null;
  const [itemName, endTime, bidCount] = data as [string, bigint, bigint];

  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2 text-sm">
      <span className="text-purple-300 font-medium">Round {index + 1}</span>
      <span className="text-white">{itemName}</span>
      <span className="text-gray-400">{Number(bidCount)} bids</span>
      <span className="text-gray-500 text-xs">
        {new Date(Number(endTime) * 1000).toLocaleDateString("en-US")}
      </span>
    </div>
  );
}

export default function SealedAuctionUI() {
  const { isConnected, address } = useAccount();
  const {
    itemName, auctionEndTime, finalized, currentRound, bidCount,
    timeRemaining, hasBid, isOwner, auctionEnded, roundCount,
    roundCreator,
    bidAmount, setBidAmount, newItemName, setNewItemName, newDuration, setNewDuration,
    encryptionStatus, placeBid, finalize, startNewAuction,
    isPending, isConfirming, isConfirmed, writeError, txHash, CONTRACT_ADDRESS,
  } = useConfSealedAuction();

  const [localTime, setLocalTime] = useState<bigint | undefined>(timeRemaining);
  useEffect(() => {
    setLocalTime(timeRemaining);
    if (!timeRemaining || timeRemaining === 0n) return;
    const interval = setInterval(() => setLocalTime((t) => (t && t > 0n ? t - 1n : 0n)), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const isLoading = isPending || isConfirming;
  const isRoundCreator = address && roundCreator &&
    address.toLowerCase() === roundCreator.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              🔐 Sealed Bid Auction
            </h1>
            <p className="text-purple-300 text-sm mt-1">Powered by Inco FHE · Base Sepolia</p>
          </div>
          <ConnectButton />
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl space-y-4">

        {/* Auction Info */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-purple-300 uppercase tracking-widest mb-1">
                Round #{currentRound?.toString() ?? "—"}
              </div>
              <h2 className="text-2xl font-bold text-white">
                {itemName ?? "Loading..."}
              </h2>
              {roundCreator && (
                <div className="text-xs text-gray-500 mt-1">
                  Created by {roundCreator.slice(0, 6)}…{roundCreator.slice(-4)}
                </div>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              finalized ? "bg-red-500/20 text-red-300" :
              auctionEnded ? "bg-yellow-500/20 text-yellow-300" :
              "bg-green-500/20 text-green-300"
            }`}>
              {finalized ? "Finalized" : auctionEnded ? "Awaiting Finalization" : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {localTime !== undefined ? formatTime(localTime) : "—"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Time Left</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {bidCount?.toString() ?? "—"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Bids</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-300">
                {roundCount?.toString() ?? "0"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Rounds Played</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 break-all">
            Contract: {CONTRACT_ADDRESS}
          </div>
        </div>

        {/* Place Bid */}
        {isConnected && !finalized && !auctionEnded && !hasBid && !isRoundCreator && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">💰 Place Your Bid</h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">ETH</span>
              </div>
              <button
                onClick={placeBid}
                disabled={isLoading || !bidAmount}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
              >
                {encryptionStatus === "encrypting" ? "🔒 Encrypting..." :
                 isLoading ? "⏳ Sending..." : "Seal Bid"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Your bid is encrypted via FHE — no one can see the amount until finalization
            </p>
          </div>
        )}

        {/* Already bid */}
        {isConnected && hasBid && !finalized && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-green-300 text-sm">
            ✅ Your encrypted bid has been submitted. Wait for the auction to be finalized.
          </div>
        )}

        {/* Round Creator Panel — Finalize */}
        {isConnected && isRoundCreator && !finalized && auctionEnded && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-orange-500/20">
            <h3 className="text-lg font-semibold text-white mb-4">🏁 Finalize Your Auction</h3>
            <p className="text-gray-400 text-sm mb-4">
              The auction has ended. Finalize it to reveal results and get your{" "}
              <span className="text-white font-medium">{CREATION_DEPOSIT} ETH deposit</span> back.
            </p>
            <button
              onClick={finalize}
              disabled={isLoading}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
            >
              {isLoading ? "⏳ Processing..." : "🏁 Finalize Auction"}
            </button>
          </div>
        )}

        {/* Start New Auction — available to everyone when finalized */}
        {isConnected && finalized && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-1">🚀 Start a New Auction</h3>
            <p className="text-gray-400 text-sm mb-4">
              Anyone can create the next round.{" "}
              <span className="text-purple-300 font-medium">{CREATION_DEPOSIT} ETH deposit</span>{" "}
              required — returned to you after finalization.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Item name (e.g. Rare NFT #99)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Duration (seconds, min 60)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
                />
                <button
                  onClick={startNewAuction}
                  disabled={isLoading || !newItemName}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
                >
                  {isLoading ? "⏳..." : "🚀 Start"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {txHash && (
          <div className={`rounded-2xl p-4 text-sm ${
            isConfirmed ? "bg-green-500/10 border border-green-500/20 text-green-300" :
            "bg-blue-500/10 border border-blue-500/20 text-blue-300"
          }`}>
            {isConfirmed ? "✅ Transaction confirmed!" : "⏳ Waiting for confirmation..."}
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1 text-xs underline opacity-70"
            >
              View on BaseScan ↗
            </a>
          </div>
        )}

        {/* Error */}
        {writeError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
            ❌ {writeError.message}
          </div>
        )}

        {/* Round History */}
        {roundCount !== undefined && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
            <RoundHistory roundCount={roundCount} />
          </div>
        )}

        {/* Not connected */}
        {!isConnected && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-3">🔌</div>
            <p>Connect your wallet to participate in the auction</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-10 text-xs text-gray-600 text-center">
        Built with Inco Lightning FHE · Base Sepolia Testnet
      </div>
    </div>
  );
}
