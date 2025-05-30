import { Box, Typography } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { privateKeyToAccount } from "viem/accounts";
import { getSafeAccount, publicClient } from "./client";
import { getSmartAccountClient } from "./client";
import { StepsContext } from "../../App";
import { STEPS } from "../../constants";
import { useBurnerAccount } from "../../context/BurnerAccountContext";
import { Button } from "../Button";
import Loader from "../Loader";

import { createWalletClient, http } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { baseSepolia } from "viem/chains";
import { upgradeEOAWith7702 } from "./auth";

const EOA7702Entry = () => {
  const account = useAccount();
  const { data: walletClient } = useWalletClient();

  const { setBurnerAccountClient, burnerAccount, setBurnerAccount } =
    useBurnerAccount();
  const stepsContext = useContext(StepsContext);

  const [isAccountInitializedLoading, setIsAccountInitializedLoading] =
    useState(false);
  const [isBurnerWalletUpgrading, setIsBurnerWalletUpgrading] = useState(false);
  const [isCodeSet, setIsCodeSet] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if the burner wallet is already upgraded to a safe account via 7702
  const checkIfEOA7702AccountInitialized = async () => {
    setIsAccountInitializedLoading(true);
    const burnerEOA7702OwnerAddress =
      localStorage.getItem("burnerEOA7702Owner");
    const burnerEOA7702OwnerPrivateKey = localStorage.getItem(
      "burnerEOA7702OwnerPrivateKey"
    );
    if (burnerEOA7702OwnerAddress && burnerEOA7702OwnerPrivateKey) {
      try {
        const burnerEOA7702Owner = privateKeyToAccount(
          burnerEOA7702OwnerPrivateKey as `0x${string}`
        );
        setBurnerAccount(burnerEOA7702Owner);

        const code = await publicClient.getCode({
          address: burnerEOA7702Owner.address,
        });

        if (code !== "0x" && code !== undefined) {
          const burnerWalletClient = createWalletClient({
            account: burnerAccount,
            chain: baseSepolia,
            transport: http(),
          });

          setBurnerAccountClient(burnerWalletClient);
          setIsCodeSet(true);
          stepsContext?.setStep(STEPS.REQUEST_GUARDIAN);
        }
      } catch (err) {
        console.error(
          "Error initializing burner account from localStorage:",
          err
        );
        toast.error("Failed to load existing burner account. Please refresh.");
      }
    } else {
      console.warn(
        "Burner EOA details not found in localStorage. User might need to go through a setup step if this is unexpected."
      );
    }
    setIsAccountInitializedLoading(false);
  };

  // Check if the burner wallet is already present
  useEffect(() => {
    checkIfEOA7702AccountInitialized();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [walletClient]);

  const upgradeEOA = async () => {
    setIsBurnerWalletUpgrading(true);

    if (!account.isConnected || !walletClient) {
      console.log("No account found, Connect wallet!");
      toast.error("No account found. Please connect your wallet first.");
      setIsBurnerWalletUpgrading(false);
      return;
    }

    if (!burnerAccount) {
      console.log("No burner account found! Cannot upgrade.");
      toast.error("Burner account is not initialized. Please wait or refresh.");
      setIsBurnerWalletUpgrading(false);
      return;
    }

    let owner = walletClient;

    const burnerWalletClient = createWalletClient({
      account: burnerAccount,
      chain: baseSepolia,
      transport: http(),
    });
    setBurnerAccountClient(burnerWalletClient);

    try {
      const safeAccount = await getSafeAccount(owner, burnerAccount);
      const smartAccountClient = await getSmartAccountClient(
        owner,
        burnerAccount
      );

      await upgradeEOAWith7702(burnerWalletClient, owner);

      localStorage.setItem("safeAccount", JSON.stringify(safeAccount));
      localStorage.setItem(
        "smartAccountClient",
        JSON.stringify(smartAccountClient)
      );

      setIsCodeSet(true);
      toast.success("EOA successfully upgraded to a smart account!");
      stepsContext?.setStep(STEPS.REQUEST_GUARDIAN);
    } catch (e: any) {
      console.error("Error during EOA upgrade:", e);
      const errorMessage =
        e.shortMessage ||
        e.message ||
        "An unknown error occurred during upgrade.";
      toast.error(`Upgrade failed: ${errorMessage}`);
    } finally {
      setIsBurnerWalletUpgrading(false);
    }
  };

  if (isAccountInitializedLoading && !isBurnerWalletUpgrading) {
    return <Loader />;
  }

  return (
    <Box
      sx={{
        textAlign: "center",
        marginX: "auto",
        maxWidth: "600px",
        padding: "2rem",
      }}
    >
      {!account.isConnected ? (
        <>
          <Typography variant="h2" sx={{ paddingBottom: "1.5rem" }}>
            Connect Your Wallet
          </Typography>
          <Typography
            variant="body1"
            sx={{ paddingBottom: "2rem", color: "text.secondary" }}
          >
            To begin, please connect your primary signer. This wallet will act
            as a controller for your Smart EOA, upgraded using 7702. It combines
            the simplicity of an EOA with smart contract capabilities like
            transaction batching, session keys, and enhanced security features,
            all controlled by your primary signer.
          </Typography>
        </>
      ) : !isCodeSet ? (
        <>
          <Typography variant="h2" sx={{ paddingBottom: "1.5rem" }}>
            Upgrade Your EOA
          </Typography>
          <Typography
            variant="body1"
            sx={{ paddingBottom: "0.5rem", color: "text.secondary" }}
          >
            Your local EOA (burner wallet) is ready.
          </Typography>
          <Typography
            variant="body1"
            sx={{ paddingBottom: "2rem", color: "text.secondary" }}
          >
            Click the button below to upgrade it to a Safe(v1.4.1) smart account
            using EIP-7702. Your connected wallet (
            {account.address
              ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
              : "N/A"}
            ) will be set as an owner.
          </Typography>

          <Button
            disabled={isBurnerWalletUpgrading || !burnerAccount}
            loading={isBurnerWalletUpgrading}
            onClick={upgradeEOA}
            variant={"contained"}
            //@ts-ignore
            sx={{ minWidth: "220px" }}
          >
            {isBurnerWalletUpgrading
              ? "Upgrading..."
              : burnerAccount
                ? "Upgrade to Smart Account"
                : "Initializing Account..."}
          </Button>
          {!burnerAccount && !isBurnerWalletUpgrading && (
            <Typography
              variant="caption"
              display="block"
              sx={{ marginTop: "1rem", color: "warning.main" }}
            >
              Waiting for burner account initialization. If this persists,
              please refresh the page.
            </Typography>
          )}
        </>
      ) : (
        <>
          <Typography variant="h2" sx={{ paddingBottom: "1.5rem" }}>
            Account Successfully Upgraded!
          </Typography>
          <Typography
            variant="body1"
            sx={{ paddingBottom: "2rem", color: "text.secondary" }}
          >
            Your EOA has been enhanced into a smart account. Redirecting you to
            the next step...
          </Typography>
          <Loader />
        </>
      )}
    </Box>
  );
};

export default EOA7702Entry;
