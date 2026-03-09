import { encrypt } from "eciesjs";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";

const INCO_LIGHTNING_ADDRESS = "0x168FDc3Ae19A5d5b03614578C58974FF30FCBe92";
const INCO_ECIES_PUBKEY_HEX = "02bad05edaf5900c192dbf3917a7a816ba4566ab6b4fb993dc70cca0d728677d87";

const ETYPES_UINT256 = 8;
const HANDLE_INDEX = 0;   // uint8, = 0
const HANDLE_VERSION = 0; // uint8, = 0

// Mirrors HandleMetadata.embedTypeVersion
function embedTypeVersion(hash: bigint, eType: number): bigint {
  let result = hash & BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000");
  result = result | (BigInt(eType) << BigInt(8));
  result = result | BigInt(HANDLE_VERSION);
  return result;
}

// Mirrors HandleMetadata.embedIndexTypeVersion
function embedIndexTypeVersion(hash: bigint, eType: number): bigint {
  const mask = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00FFFF");
  let result = hash & mask;
  result = result | (BigInt(HANDLE_INDEX) << BigInt(16));
  return embedTypeVersion(result, eType);
}

function toHex32(n: bigint): `0x${string}` {
  return ("0x" + n.toString(16).padStart(64, "0")) as `0x${string}`;
}

export function computeInputHandle(
  ciphertext: Uint8Array,
  userAddress: `0x${string}`,
  contractAddress: `0x${string}`,
  chainId: number
): `0x${string}` {
  // ctIndexHash = keccak256(abi.encodePacked(keccak256(ciphertext), HANDLE_INDEX))
  // HANDLE_INDEX is uint8 — encodePacked packs it as 1 byte
  const ctHash = keccak256(ciphertext);
  const ctHashBytes = Buffer.from(ctHash.slice(2), "hex"); // 32 bytes
  const handleIndexByte = new Uint8Array([HANDLE_INDEX]);   // 1 byte
  const packed1 = new Uint8Array(33);
  packed1.set(ctHashBytes, 0);
  packed1.set(handleIndexByte, 32);
  const ctIndexHash = BigInt(keccak256(packed1));

  const prehandle = embedIndexTypeVersion(ctIndexHash, ETYPES_UINT256);

  // aclAddress = executorAddress = IncoLightning (address(this) in the contract)
  const aclAddress = INCO_LIGHTNING_ADDRESS.toLowerCase();

  // EVM_HOST_CHAIN_PREFIX = "evm/" — encodePacked packs string as raw utf8 bytes (4 bytes)
  const prefixBytes = Buffer.from("evm/", "utf8"); // 4 bytes

  // chainId as uint256 = 32 bytes big-endian
  const chainIdBytes = Buffer.from(BigInt(chainId).toString(16).padStart(64, "0"), "hex");

  // addresses as 20 bytes each (no padding in encodePacked)
  const aclBytes = Buffer.from(aclAddress.slice(2), "hex");       // 20 bytes
  const userBytes = Buffer.from(userAddress.slice(2), "hex");     // 20 bytes
  const contractBytes = Buffer.from(contractAddress.slice(2), "hex"); // 20 bytes

  const prehandleBytes = Buffer.from(toHex32(prehandle).slice(2), "hex"); // 32 bytes

  // abi.encodePacked(prehandle, "evm/", chainId, executorAddress, user, contractAddress)
  const packed2 = Buffer.concat([
    prehandleBytes,
    prefixBytes,
    chainIdBytes,
    aclBytes,
    userBytes,
    contractBytes,
  ]);

  const finalHash = BigInt(keccak256(packed2 as unknown as Uint8Array));
  const handle = embedIndexTypeVersion(finalHash, ETYPES_UINT256);

  return toHex32(handle);
}

export async function encryptUint256(
  value: bigint,
  userAddress: `0x${string}`,
  contractAddress: `0x${string}`,
  chainId: number = 84532
): Promise<`0x${string}`> {
  const plaintext = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    plaintext[i] = Number(v & BigInt(0xff));
    v >>= BigInt(8);
  }

  const pubkeyBytes = Buffer.from(INCO_ECIES_PUBKEY_HEX, "hex");
  const ciphertextBytes = encrypt(pubkeyBytes, Buffer.from(plaintext));

  const handle = computeInputHandle(
    ciphertextBytes,
    userAddress,
    contractAddress,
    chainId
  );

  const encoded = encodeAbiParameters(
    parseAbiParameters("bytes32, bytes"),
    [handle, ("0x" + Buffer.from(ciphertextBytes).toString("hex")) as `0x${string}`]
  );

  return encoded;
}