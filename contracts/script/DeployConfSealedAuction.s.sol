// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ConfSealedAuction.sol";

contract DeployConfSealedAuction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_BASE_SEPOLIA");
        vm.startBroadcast(deployerPrivateKey);

        // Аукцион на "Rare NFT #42", длительность 1 час
        ConfSealedAuction auction = new ConfSealedAuction(
            "Rare NFT #42",
            3600
        );

        console.log("Deployed at:", address(auction));
        vm.stopBroadcast();
    }
}
