// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ConfSealedAuction.sol";

contract DeployConfSealedAuction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ConfSealedAuction auction = new ConfSealedAuction{value: 0.001 ether}(
            "Terminator",  // item name
            3600           // duration: 1 hour
        );

        console.log("ConfSealedAuction deployed at:", address(auction));

        vm.stopBroadcast();
    }
}
