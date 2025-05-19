import {
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  fromHex,
  Hex,
  keccak256,
  parseAbi,
  parseAbiParameters,
  PrivateKeyAccount,
  toHex,
  WalletClient,
  zeroAddress,
} from "viem";

import { entryPoint07Address, WebAuthnAccount } from "viem/account-abstraction";
import {
  safeSingletonAddress,
  erc7569LaunchpadAddress,
  attestor,
  safe4337ModuleAddress,
  kernelV3Implementation,
  kernelV3_1Implementation,
} from "../../../contracts.base-sepolia.json";
import { safeAbi } from "../../abi/Safe";

import {
  PasskeyValidatorContractVersion,
  getValidatorAddress,
} from "@zerodev/passkey-validator";
import { KERNEL_V3_0, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import kernelV3_1ImplementationAbi from "../../abi/kernelv3";

if (!import.meta.env.VITE_7702_RELAYER_URL) {
  throw new Error("VITE_7702_RELAYER_URL does not exist");
}

const realyer_7702_url = import.meta.env.VITE_7702_RELAYER_URL;

export async function upgradeEOAWith7702(
  burner: WalletClient,
  owner: WalletClient
): Promise<Hex> {
  const authorization = await burner.signAuthorization({
    account: burner.account!,
    contractAddress: safeSingletonAddress as `0x${string}`,
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

  const data = encodeFunctionData({
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
  });

  const relay_req = {
    to: burner.account!.address,
    data,
    authorization: {
      address: authorization.address,
      chainId: authorization.chainId,
      nonce: authorization.nonce,
      r: authorization.r,
      s: authorization.s,
      v: Number(authorization.v),
      yParity: authorization.yParity,
    },
  };

  // Call the relayer
  const res = await fetch(`${realyer_7702_url}api/relay/delegate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(relay_req),
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    console.error("Error from relay delegate:", errorData);
    throw new Error(
      errorData.message || `Request failed with status ${res.status}`
    );
  }

  const { txHash } = await res.json();

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

export const upgradeKernel7702 = async (
  burnerAccount: WalletClient,
  owner: WebAuthnAccount
) => {
  const authorization = await burnerAccount.signAuthorization({
    account: burnerAccount.account!,
    contractAddress: kernelV3_1Implementation as `0x${string}`,
  });

  const PASSKEY_VALIDATOR = getValidatorAddress(
    {
      address: entryPoint07Address,
      version: "0.7",
    },
    KERNEL_V3_1,
    PasskeyValidatorContractVersion.V0_0_2
  );

  const passkeyValidatorData = encodeAbiParameters(
    parseAbiParameters(
      "(uint256 pubKeyX, uint256 pubKeyY) webAuthnData, bytes32 authenticatorIdHash"
    ),
    [
      {
        pubKeyX: fromHex(`0x${owner.publicKey.slice(2, 66)}`, "bigint"),
        pubKeyY: fromHex(`0x${owner.publicKey.slice(66, 130)}`, "bigint"),
      },
      keccak256(toHex(owner.id)),
    ]
  );

  const data = encodeFunctionData({
    abi: kernelV3_1ImplementationAbi,
    functionName: "initialize",
    args: [
      concat(["0x01", PASSKEY_VALIDATOR]),
      zeroAddress,
      passkeyValidatorData,
      "0x",
      [],
    ],
  });

  const to = burnerAccount.account!.address;

  const relay_req = {
    to,
    data,
    authorization: {
      address: authorization.address,
      chainId: authorization.chainId,
      nonce: authorization.nonce,
      r: authorization.r,
      s: authorization.s,
      v: Number(authorization.v),
      yParity: authorization.yParity,
    },
  };

  // Call the relayer
  const res = await fetch(`${realyer_7702_url}api/relay/delegate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(relay_req),
  });
  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    console.error("Error from relay delegate:", errorData);
    throw new Error(
      errorData.message || `Request failed with status ${res.status}`
    );
  }
  const { txHash } = await res.json();
  console.log("EIP 7702 upgrde and setup tx Hash", txHash);
  return txHash;
};
