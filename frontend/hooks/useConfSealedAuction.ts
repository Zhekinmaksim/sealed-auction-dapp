"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { auctionABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/wagmi";

export function useConfSealedAuction() {
  const { address, isConnected } = useAccount();
  const [bidAmount, setBidAmount] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newDuration, setNewDuration] = useState("3600");
  const [encryptionStatus, setEncryptionStatus] = useState<"idle" | "encrypting" | "done">("idle");

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Read contract state
  const { data: itemName, refetch: refetchItemName } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "itemName",
  });

  const { data: auctionEndTime, refetch: refetchEndTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "auctionEndTime",
  });

  const { data: finalized, refetch: refetchFinalized } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "finalized",
  });

  const { data: currentRound, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "currentRound",
  });

  const { data: bidCount, refetch: refetchBidCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "getBidCount",
  });

  const { data: timeRemaining, refetch: refetchTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "getTimeRemaining",
  });

  const { data: hasBid, refetch: refetchHasBid } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "hasBid",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "owner",
  });

  const { data: roundCount, refetch: refetchRoundCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: auctionABI,
    functionName: "getRoundCount",
  });

  const isOwner = address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();
  const auctionEnded = auctionEndTime ? BigInt(Math.floor(Date.now() / 1000)) >= auctionEndTime : false;

  const refetchAll = useCallback(() => {
    refetchItemName();
    refetchEndTime();
    refetchFinalized();
    refetchRound();
    refetchBidCount();
    refetchTime();
    refetchHasBid();
    refetchRoundCount();
  }, [refetchItemName, refetchEndTime, refetchFinalized, refetchRound, refetchBidCount, refetchTime, refetchHasBid, refetchRoundCount]);

  useEffect(() => {
    if (isConfirmed) refetchAll();
  }, [isConfirmed, refetchAll]);

  // Poll time remaining
  useEffect(() => {
    const interval = setInterval(refetchTime, 5000);
    return () => clearInterval(interval);
  }, [refetchTime]);

  const placeBid = async () => {
  if (!bidAmount || !address || !isConnected) return;
  setEncryptionStatus("encrypting");

  try {
    const { encryptUint256 } = await import("@/lib/fhevm");

    const bidAmountWei = parseEther(bidAmount);

    // Encrypt using Inco Lightning ECIES
    const encryptedInput = await encryptUint256(
      bidAmountWei,
      address,
      CONTRACT_ADDRESS,
      84532
    );

    setEncryptionStatus("done");

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: auctionABI,
      functionName: "placeBid",
      args: [encryptedInput],
      value: 100000000000000n, // 0.0001 ETH = inco.getFee()
    });
  } catch (err) {
    console.error("Encryption error:", err);
    setEncryptionStatus("idle");
  }
};

  const finalize = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: auctionABI,
      functionName: "finalize",
    });
  };

  const startNewAuction = () => {
    if (!newItemName || !newDuration) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: auctionABI,
      functionName: "startNewAuction",
      args: [newItemName, BigInt(newDuration)],
    });
  };

  return {
    // State
    itemName: itemName as string | undefined,
    auctionEndTime,
    finalized: finalized as boolean | undefined,
    currentRound: currentRound as bigint | undefined,
    bidCount: bidCount as bigint | undefined,
    timeRemaining: timeRemaining as bigint | undefined,
    hasBid: hasBid as boolean | undefined,
    isOwner: !!isOwner,
    auctionEnded,
    roundCount: roundCount as bigint | undefined,
    // UI state
    bidAmount,
    setBidAmount,
    newItemName,
    setNewItemName,
    newDuration,
    setNewDuration,
    encryptionStatus,
    // Actions
    placeBid,
    finalize,
    startNewAuction,
    // Tx state
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
    txHash,
    CONTRACT_ADDRESS,
  };
}
