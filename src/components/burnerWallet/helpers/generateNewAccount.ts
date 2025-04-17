import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/** Generates a random account. Can be used to generate a new owner for the safe */
export const generateNewAccount = async () => {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  return { privateKey, address };
};
