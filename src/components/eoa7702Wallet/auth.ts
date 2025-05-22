import {
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  fromHex,
  Hex,
  keccak256,
  parseAbi,
  parseAbiParameters,
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
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import kernelV3_1ImplementationAbi from "../../abi/kernelv3";
import {
  RHINESTONE_ATTESTER_ADDRESS,
  MOCK_ATTESTER_ADDRESS,
  type Module,
} from "@rhinestone/module-sdk";
import { deadOwner } from "./client.ts";
import { getWebAuthnValidatorFromWebAuthnAccount } from "./utils.ts";

if (!import.meta.env.VITE_7702_RELAYER_URL) {
  throw new Error("VITE_7702_RELAYER_URL does not exist");
}

const realyer_7702_url = import.meta.env.VITE_7702_RELAYER_URL;

export async function upgradeEOAWith7702(
  burner: WalletClient,
  owner: WebAuthnAccount
): Promise<Hex> {
  const authorization = await burner.signAuthorization({
    account: burner.account!,
    contractAddress: safeSingletonAddress as `0x${string}`,
  });

  const webAuthnValidator = getWebAuthnValidatorFromWebAuthnAccount(owner);

  // Parameters for Safe's setup call.
  const owners = [deadOwner.address];
  const signerThreshold = 1n;
  const setupAddress = erc7569LaunchpadAddress as `0x${string}`;

  // This will enable the 7579 adaptor to be used with this safe on setup.
  const setupData = getSafeLaunchpadSetupData(webAuthnValidator);

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

export const getSafeLaunchpadSetupData = (webauthnValidator: Module) => {
  const erc7569LaunchpadCallData = encodeFunctionData({
    abi: parseAbi([
      "struct ModuleInit {address module;bytes initData;}",
      "function addSafe7579(address safe7579,ModuleInit[] calldata validators,ModuleInit[] calldata executors,ModuleInit[] calldata fallbacks, ModuleInit[] calldata hooks,address[] calldata attesters,uint8 threshold) external",
    ]),
    functionName: "addSafe7579",
    args: [
      safe4337ModuleAddress as `0x${string}`,
      [
        {
          module: webauthnValidator.address,
          initData: webauthnValidator.initData,
        },
      ],
      [],
      [],
      [],
      [RHINESTONE_ATTESTER_ADDRESS, MOCK_ATTESTER_ADDRESS],
      1,
    ],
  });

  return erc7569LaunchpadCallData;
};
