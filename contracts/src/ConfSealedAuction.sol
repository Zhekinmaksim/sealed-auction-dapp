// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {euint256, ebool, e, inco} from "@inco/lightning/Lib.sol";

/**
 * @title ConfSealedAuction
 * @notice Конфиденциальный аукцион с запечатанными ставками.
 * Все ставки зашифрованы на блокчейне через FHE.
 * Поддерживает повторные раунды аукциона.
 */
contract ConfSealedAuction {
    using e for *;

    address public owner;
    string public itemName;
    uint256 public auctionEndTime;
    bool public finalized;
    uint256 public currentRound;

    address[] public bidders;
    mapping(address => bool) public hasBid;

    // Зашифрованная наивысшая ставка
    euint256 internal highestBid;

    // Зашифрованные ставки каждого участника
    mapping(address => euint256) public encryptedBids;

    // История раундов
    struct RoundResult {
        string itemName;
        uint256 endTime;
        uint256 bidCount;
    }

    RoundResult[] public roundHistory;

    event AuctionCreated(string itemName, uint256 endTime, uint256 round);
    event BidPlaced(address indexed bidder, uint256 round);
    event AuctionFinalized(uint256 round);
    event NewRoundStarted(uint256 round, string itemName, uint256 endTime);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier auctionOpen() {
        require(block.timestamp < auctionEndTime, "Auction ended");
        require(!finalized, "Auction finalized");
        _;
    }

    constructor(string memory _itemName, uint256 _durationSeconds) {
        owner = msg.sender;
        itemName = _itemName;
        auctionEndTime = block.timestamp + _durationSeconds;
        currentRound = 1;

        // Инициализируем наивысшую ставку нулём (зашифрованным)
        highestBid = uint256(0).asEuint256();
        emit AuctionCreated(_itemName, auctionEndTime, currentRound);
    }

    /// @notice Разместить запечатанную ставку (зашифрованную клиентом)
    function placeBid(bytes calldata encryptedAmount) external payable auctionOpen {
    require(msg.value >= inco.getFee(), "Insufficient fee");
    require(!hasBid[msg.sender], "Already bid");

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

    /// @notice Завершить аукцион (только владелец, после окончания времени)
    function finalize() external onlyOwner {
        require(block.timestamp >= auctionEndTime, "Auction still open");
        require(!finalized, "Already finalized");

        finalized = true;
        highestBid.allow(owner);

        for (uint256 i = 0; i < bidders.length; i++) {
            encryptedBids[bidders[i]].allow(bidders[i]);
        }

        // Сохраняем результат раунда в историю
        roundHistory.push(RoundResult({
            itemName: itemName,
            endTime: auctionEndTime,
            bidCount: bidders.length
        }));

        emit AuctionFinalized(currentRound);
    }

    /// @notice Запуск нового раунда аукциона
    function startNewAuction(
        string memory _itemName,
        uint256 _durationSeconds
    ) external onlyOwner {
        require(finalized, "Finalize current auction first");

        // Очищаем ставки предыдущего раунда
        for (uint256 i = 0; i < bidders.length; i++) {
            delete hasBid[bidders[i]];
            encryptedBids[bidders[i]] = uint256(0).asEuint256();
        }
        delete bidders;

        // Устанавливаем новые параметры
        itemName = _itemName;
        auctionEndTime = block.timestamp + _durationSeconds;
        finalized = false;
        currentRound += 1;
        highestBid = uint256(0).asEuint256();

        emit NewRoundStarted(currentRound, _itemName, auctionEndTime);
    }

    // View-функции
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

    /// @notice Количество завершённых раундов
    function getRoundCount() external view returns (uint256) {
        return roundHistory.length;
    }

    /// @notice Результат конкретного раунда
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
