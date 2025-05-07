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
  createWalletClient,
  http,
  PrivateKeyAccount,
  type RpcSchema,
  type Transport,
  WalletClient,
} from "viem";
import {
  entryPoint07Address,
  type SmartAccount,
} from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import config from "../burnerWallet/config";
import {
  attestor,
  erc7569LaunchpadAddress,
  safe4337ModuleAddress,
} from "../../../contracts.base-sepolia.json";
import { privateKeyToAccount } from "viem/accounts";

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

if (!import.meta.env.VITE_RELAY_PRIVATE_KEY) {
  throw new Error("VITE_RELAY_PRIVATE_KEY does not exist");
}

const relay = privateKeyToAccount(
  import.meta.env.VITE_RELAY_PRIVATE_KEY as `0x${string}`
);

export const relayClient = createWalletClient({
  account: relay,
  chain: baseSepolia,
  transport: http(),
});

export const getSafeAccount = async (
  owner: WalletClient,
  eoaAccount: PrivateKeyAccount
): Promise<SmartAccount<SafeSmartAccountImplementation>> => {
  return await toSafeSmartAccount({
    address: eoaAccount.address,
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
  });
};

export const getSmartAccountClient = async (
  owner: WalletClient,
  eoaAccount: PrivateKeyAccount
): Promise<
  Client<Transport, Chain, SmartAccount, RpcSchema> &
    Erc7579Actions<SmartAccount<SafeSmartAccountImplementation>>
> => {
  return createSmartAccountClient({
    account: await getSafeAccount(owner, eoaAccount),
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
