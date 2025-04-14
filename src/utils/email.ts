import { buildPoseidon } from "circomlibjs";
import { bytesToHex } from "viem";

export const templateIdx = 0;

/**
 * Generates a random account code using the Poseidon hash function.
 * @async
 * @returns {Promise<string>} A promise that resolves to a hex string representing the generated account code.
 */
export async function genAccountCode(): Promise<string> {
  const poseidon = await buildPoseidon();
  const accountCodeBytes: Uint8Array = poseidon.F.random();
  return bytesToHex(accountCodeBytes.reverse());
}
