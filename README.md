# Sealed Bid Auction dApp

A decentralized sealed-bid auction application built on Base Sepolia testnet using Inco Lightning's confidential compute. All bids are encrypted on-chain — no one can see bid amounts until the auction is finalized.

## How It Works

1. The auction owner creates a round with an item name and duration
2. Bidders submit encrypted bids — the amounts are hidden from everyone including the contract owner
3. Inco Lightning's TEE (Trusted Execution Environment) processes encrypted comparisons to find the highest bid
4. After the auction ends, the owner finalizes it — the winner is revealed on-chain
5. The owner can start a new round at any time

## Tech Stack

- **Smart Contracts**: Solidity 0.8.28, Foundry
- **Confidential Compute**: [Inco Lightning](https://inco.org) on Base Sepolia
- **Encryption**: ECIES (secp256k1) with Inco TEE public key
- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Web3**: wagmi v2, viem, RainbowKit
- **Network**: Base Sepolia testnet (chainId 84532)

## Contract

Deployed on Base Sepolia: [`0xb82f3aa756aee9910e199cae0c2e249f2c835c8e`](https://sepolia.basescan.org/address/0xb82f3aa756aee9910e199cae0c2e249f2c835c8e)

## Getting Started

### Prerequisites

- Node.js 18+
- Foundry
- MetaMask with Base Sepolia network

### Install & Run
```bash
# Install frontend dependencies
cd frontend
npm install
npm run dev
```

### Deploy Contracts
```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY and BASE_SEPOLIA_RPC_URL
npm install
forge script script/DeployConfSealedAuction.s.sol --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast
```

### Environment Variables

Create `frontend/.env.local`:
```
NEXT_PUBLIC_AUCTION_ADDRESS=0xb82f3aa756aee9910e199cae0c2e249f2c835c8e
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## How Encryption Works

Bids are encrypted client-side using ECIES with the Inco TEE public key before being sent on-chain:

1. Fetch the TEE public key from `IncoVerifier.eciesPubkey()`
2. Encrypt the bid amount (uint256) using ECIES secp256k1
3. Compute the input handle using Inco Lightning's deterministic hashing scheme
4. Submit `abi.encode(handle, ciphertext)` to the contract along with the Inco fee (0.0001 ETH)

The TEE decrypts and processes bids in a secure enclave — no one can observe the plaintext values.

## License

MIT
