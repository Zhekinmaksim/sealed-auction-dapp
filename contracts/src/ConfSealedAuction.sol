// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {euint256, ebool, e, inco} from "@inco/lightning/Lib.sol";

/**
 * @title ConfSealedAuction
 * @notice Confidential sealed-bid auction powered by Inco FHE.
 * Anyone can create a new auction round by paying a creation deposit.
 * The deposit is returned to the creator upon finalization.
 */
contract ConfSealedAuction {
    using e for *;

    address public owner;

    /// @notice Deposit required to create a new auction round (anti-spam)
    uint256 public constant CREATION_DEPOSIT = 0.001 ether;

    string public itemName;
    uint256 public auctionEndTime;
    bool public finalized;
    uint256 public currentRound;

    /// @notice Creator of the current round (receives deposit back on finalize)
    address public roundCreator;

    address[] public bidders;
    mapping(address => bool) public hasBid;

    euint256 internal highestBid;
    mapping(address => euint256) public encryptedBids;

    struct RoundResult {
        string itemName;
        uint256 endTime;
        uint256 bidCount;
        address creator;
    }

    RoundResult[] public roundHistory;

    event AuctionCreated(string itemName, uint256 endTime, uint256 round, address creator);
    event BidPlaced(address indexed bidder, uint256 round);
    event AuctionFinalized(uint256 round, address creator);
    event NewRoundStarted(uint256 round, string itemName, uint256 endTime, address creator);

    modifier auctionOpen() {
        require(block.timestamp < auctionEndTime, "Auction ended");
        require(!finalized, "Auction finalized");
        _;
    }

    modifier onlyRoundCreator() {
        require(msg.sender == roundCreator, "Only round creator");
        _;
    }

    constructor(string memory _itemName, uint256 _durationSeconds) payable {
        require(msg.value >= CREATION_DEPOSIT, "Insufficient creation deposit");
        owner = msg.sender;
        roundCreator = msg.sender;
        itemName = _itemName;
        auctionEndTime = block.timestamp + _durationSeconds;
        currentRound = 1;
        highestBid = uint256(0).asEuint256();
        emit AuctionCreated(_itemName, auctionEndTime, currentRound, msg.sender);
    }

    /// @notice Place a sealed (FHE-encrypted) bid
    function placeBid(bytes calldata encryptedAmount) external payable auctionOpen {
        require(msg.value >= inco.getFee(), "Insufficient Inco fee");
        require(!hasBid[msg.sender], "Already bid");
        require(msg.sender != roundCreator, "Creator cannot bid");

        euint256 bidValue = encryptedAmount.newEuint256(msg.sender);
        bidValue.allow(msg.sender);
        bidValue.allowThis();
        encryptedBids[msg.sender] = bidValue;
        encryptedBids[msg.sender].allow(msg.sender);
        encryptedBids[msg.sender].allowThis();

        ebool isHigher = bidValue.gt(highestBid);
        highestBid = isHigher.select(bidValue, highestBid);
        highestBid.allowThis();

        hasBid[msg.sender] = true;
        bidders.push(msg.sender);

        emit BidPlaced(msg.sender, currentRound);
    }

    /// @notice Finalize the auction — only the round creator, after time ends
    function finalize() external onlyRoundCreator {
        require(block.timestamp >= auctionEndTime, "Auction still open");
        require(!finalized, "Already finalized");

        finalized = true;
        highestBid.allow(roundCreator);

        for (uint256 i = 0; i < bidders.length; i++) {
            encryptedBids[bidders[i]].allow(bidders[i]);
        }

        roundHistory.push(RoundResult({
            itemName: itemName,
            endTime: auctionEndTime,
            bidCount: bidders.length,
            creator: roundCreator
        }));

        // Return deposit to creator
        (bool ok, ) = roundCreator.call{value: CREATION_DEPOSIT}("");
        require(ok, "Deposit refund failed");

        emit AuctionFinalized(currentRound, roundCreator);
    }

    /// @notice Start a new auction round — anyone can call, requires deposit
    function startNewAuction(
        string memory _itemName,
        uint256 _durationSeconds
    ) external payable {
        require(finalized, "Finalize current auction first");
        require(msg.value >= CREATION_DEPOSIT, "Insufficient creation deposit");
        require(_durationSeconds >= 60, "Duration too short (min 60s)");
        require(bytes(_itemName).length > 0, "Item name required");

        // Clear previous round bids
        for (uint256 i = 0; i < bidders.length; i++) {
            delete hasBid[bidders[i]];
            encryptedBids[bidders[i]] = uint256(0).asEuint256();
        }
        delete bidders;

        itemName = _itemName;
        auctionEndTime = block.timestamp + _durationSeconds;
        finalized = false;
        currentRound += 1;
        roundCreator = msg.sender;
        highestBid = uint256(0).asEuint256();

        emit NewRoundStarted(currentRound, _itemName, auctionEndTime, msg.sender);
    }

    // ── View functions ────────────────────────────────────────────────────────

    function getBidCount() external view returns (uint256) {
        return bidders.length;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= auctionEndTime) return 0;
        return auctionEndTime - block.timestamp;
    }

    function getHighestBid() external view returns (euint256) {
        require(finalized, "Not finalized");
        return highestBid;
    }

    function getMyBid() external view returns (euint256) {
        require(hasBid[msg.sender], "No bid");
        return encryptedBids[msg.sender];
    }

    function getRoundCount() external view returns (uint256) {
        return roundHistory.length;
    }

    function getRoundResult(uint256 index) external view returns (
        string memory _itemName,
        uint256 _endTime,
        uint256 _bidCount
    ) {
        require(index < roundHistory.length, "Invalid round");
        RoundResult memory r = roundHistory[index];
        return (r.itemName, r.endTime, r.bidCount);
    }
}
