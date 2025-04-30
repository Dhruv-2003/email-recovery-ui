import { createSmartAccountClient } from "permissionless";
import {
  type SafeSmartAccountImplementation,
  toSafeSmartAccount,
} from "permissionless/accounts";
import {
  erc7579Actions,
  type Erc7579Actions,
} from "permissionless/actions/erc7579";
import {
  createPimlicoClient,
  type PimlicoClient,
} from "permissionless/clients/pimlico";
import {
  type Chain,
  type Client,
  createPublicClient,
  http,
  PrivateKeyAccount,
  type RpcSchema,
  type Transport,
} from "viem";
import {
  entryPoint07Address,
  type SmartAccount,
} from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import config from "./config.ts";
import {
  attestor,
  erc7569LaunchpadAddress,
  safe4337ModuleAddress,
} from "../../../contracts.base-sepolia.json";

export const publicClient = createPublicClient({
  transport: http(config.rpcUrl),
  chain: baseSepolia,
});

export const pimlicoClient: PimlicoClient = createPimlicoClient({
  transport: http(config.bundlerUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
  chain: baseSepolia,
});

export const getSafeAccount = async (
  owner: PrivateKeyAccount,
): Promise<SmartAccount<SafeSmartAccountImplementation>> => {
  return await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    version: "1.4.1",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    safe4337ModuleAddress: safe4337ModuleAddress as `0x${string}`,
    erc7579LaunchpadAddress: erc7569LaunchpadAddress as `0x${string}`,
    attesters: [attestor as `0x${string}`],
    attestersThreshold: 1,
    saltNonce: config.saltNonce,
  });
};

export const getSmartAccountClient = async (
  owner: PrivateKeyAccount,
): Promise<
  Client<Transport, Chain, SmartAccount, RpcSchema> &
    Erc7579Actions<SmartAccount<SafeSmartAccountImplementation>>
> => {
  return createSmartAccountClient({
    account: await getSafeAccount(owner),
    chain: baseSepolia,
    bundlerTransport: http(config.bundlerUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await pimlicoClient.getUserOperationGasPrice()).fast;
      },
    },
  }).extend(erc7579Actions());
};
