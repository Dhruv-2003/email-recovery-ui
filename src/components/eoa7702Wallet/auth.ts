import {
  Account,
  Chain,
  encodeFunctionData,
  Hex,
  parseAbi,
  RpcSchema,
  Transport,
  WalletClient,
  zeroAddress,
} from "viem";

import {
  safeSingletonAddress,
  erc7569LaunchpadAddress,
  attestor,
  safe4337ModuleAddress,
} from "../../../contracts.base-sepolia.json";
import { safeAbi } from "../../abi/Safe";

import { relayClient } from "./client.ts";

export async function upgradeEOAWith7702(
  burner: WalletClient,
  owner: WalletClient<Transport, Chain, Account, RpcSchema>
): Promise<Hex> {
  const authorization = await burner.signAuthorization({
    account: burner.account!,
    contractAddress: safeSingletonAddress as `0x${string}`,
    executor: owner.account?.address as `0x${string}`,
  });

  // Parameters for Safe's setup call.
  const owners = [owner.account!.address];
  const signerThreshold = 1n;
  const setupAddress = erc7569LaunchpadAddress as `0x${string}`;

  // This will enable the 7579 adaptor to be used with this safe on setup.
  const setupData = getSafeLaunchpadSetupData();

  const fallbackHandler = safe4337ModuleAddress as `0x${string}`; // Safe 7579 Adaptor address
  const paymentToken = zeroAddress;
  const paymentValue = 0n;
  const paymentReceiver = zeroAddress;

  const txHash = await relayClient.writeContract({
    address: burner.account!.address,
    abi: safeAbi,
    functionName: "setup",
    args: [
      owners,
      signerThreshold,
      setupAddress,
      setupData,
      fallbackHandler,
      paymentToken,
      paymentValue,
      paymentReceiver,
    ],
    authorizationList: [authorization],
  });

  console.log("EIP 7702 upgrde and setup tx Hash", txHash);

  return txHash;
}

export const getSafeLaunchpadSetupData = () => {
  const erc7569LaunchpadCallData = encodeFunctionData({
    abi: parseAbi([
      "struct ModuleInit {address module;bytes initData;}",
      "function addSafe7579(address safe7579,ModuleInit[] calldata validators,ModuleInit[] calldata executors,ModuleInit[] calldata fallbacks, ModuleInit[] calldata hooks,address[] calldata attesters,uint8 threshold) external",
    ]),
    functionName: "addSafe7579",
    args: [
      safe4337ModuleAddress as `0x${string}`,
      [],
      [],
      [],
      [],
      [attestor as `0x${string}`],
      1,
    ],
  });

  return erc7569LaunchpadCallData;
};
