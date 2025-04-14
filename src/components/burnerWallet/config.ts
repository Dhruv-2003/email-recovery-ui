/* eslint-disable sort-imports */
import dotenv from "dotenv";
import { getAddress, isHex, type Address, type Hex } from "viem";
dotenv.config();

if (!import.meta.env.VITE_PIMLICO_API_KEY) {
  throw new Error("VITE_PIMLICO_API_KEY does not exist");
}
if (!import.meta.env.VITE_ALCHEMY_API_KEY) {
  throw new Error("VITE_ALCHEMY_API_KEY does not exist");
}
if (!import.meta.env.VITE_RELAYER_URL) {
  throw new Error("VITE_RELAYER_URL does not exist");
}
// if (!import.meta.env.OWNER_PRIVATE_KEY) {
//   throw new Error("OWNER_PRIVATE_KEY does not exist");
// }
// if (!isHex(import.meta.env.OWNER_PRIVATE_KEY)) {
//   throw new Error("OWNER_PRIVATE_KEY is not a valid hex string");
// }
// if (!import.meta.env.GUARDIAN_EMAIL) {
//   throw new Error("GUARDIAN_EMAIL does not exist");
// }
// if (!import.meta.env.ACCOUNT_CODE) {
//   throw new Error("ACCOUNT_CODE does not exist");
// }
// if (!isHex(import.meta.env.ACCOUNT_CODE)) {
//   throw new Error("ACCOUNT_CODE is not a valid hex string");
// }
// if (!import.meta.env.NEW_OWNER) {
//   throw new Error("NEW_OWNER does not exist");
// }
// if (!import.meta.env.SAFE_SALT_NONCE) {
//   throw new Error("SAFE_SALT_NONCE does not exist");
// }

type Config = {
  bundlerUrl: string;
  rpcUrl: string;
  relayerApiUrl: string;
  ownerPrivateKey: `0x${string}`;
  guardianEmail: string;
  accountCode: Hex;
  newOwner: Address;
  saltNonce: bigint;
  addresses: {
    universalEmailRecoveryModule: Address;
    safe4337ModuleAddress: Address;
    erc7569LaunchpadAddress: Address;
    attestor: Address;
  };
};

const config: Config = {
  bundlerUrl: `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`,
  rpcUrl: `https://base-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
  relayerApiUrl: `${import.meta.env.VITE_RELAYER_URL}`,
  // ownerPrivateKey: import.meta.env.OWNER_PRIVATE_KEY,
  // guardianEmail: `${import.meta.env.GUARDIAN_EMAIL}`,
  // accountCode: `${import.meta.env.ACCOUNT_CODE}`,
  // newOwner: getAddress(import.meta.env.NEW_OWNER),
  // saltNonce: BigInt(import.meta.env.SAFE_SALT_NONCE),
  addresses: {
    universalEmailRecoveryModule: "0x636632FA22052d2a4Fb6e3Bab84551B620b9C1F9",
    safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
    erc7569LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
    attestor: "0xA4C777199658a41688E9488c4EcbD7a2925Cc23A",
  },
};

export default config;
