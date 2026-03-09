// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ConfSealedAuction.sol";

contract ConfSealedAuctionTest is Test {
    ConfSealedAuction auction;

    function setUp() public {
        auction = new ConfSealedAuction("Test Item", 3600);
    }

    function testAuctionCreated() public view {
        assertEq(auction.itemName(), "Test Item");
        assertGt(auction.auctionEndTime(), block.timestamp);
        assertFalse(auction.finalized());
        assertEq(auction.currentRound(), 1);
    }

    function testGetBidCountInitiallyZero() public view {
        assertEq(auction.getBidCount(), 0);
    }

    function testStartNewAuction() public {
        vm.warp(block.timestamp + 3601);
        auction.finalize();
        assertTrue(auction.finalized());

        auction.startNewAuction("New Item", 7200);
        assertEq(auction.itemName(), "New Item");
        assertEq(auction.currentRound(), 2);
        assertFalse(auction.finalized());
        assertEq(auction.getBidCount(), 0);
    }

    function testCannotStartNewBeforeFinalize() public {
        vm.expectRevert("Finalize current auction first");
        auction.startNewAuction("New Item", 7200);
    }

    function testRoundHistory() public {
        vm.warp(block.timestamp + 3601);
        auction.finalize();
        assertEq(auction.getRoundCount(), 1);

        auction.startNewAuction("Item 2", 1800);
        vm.warp(block.timestamp + 1801);
        auction.finalize();
        assertEq(auction.getRoundCount(), 2);
    }

    function testOnlyOwnerCanFinalize() public {
        vm.warp(block.timestamp + 3601);
        vm.prank(address(0x1234));
        vm.expectRevert("Only owner");
        auction.finalize();
    }

    function testOnlyOwnerCanStartNewAuction() public {
        vm.warp(block.timestamp + 3601);
        auction.finalize();
        vm.prank(address(0x1234));
        vm.expectRevert("Only owner");
        auction.startNewAuction("Hacked Item", 3600);
    }

    function testGetTimeRemaining() public {
        uint256 remaining = auction.getTimeRemaining();
        assertGt(remaining, 0);
        assertLe(remaining, 3600);

        vm.warp(block.timestamp + 3601);
        assertEq(auction.getTimeRemaining(), 0);
    }
}
