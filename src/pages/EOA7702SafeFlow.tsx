import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LaunchIcon from "@mui/icons-material/Launch";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { StepsContext } from "../App";
import GuardianSetup from "../components/eoa7702Wallet/GuardianSetup";
import { generateNewAccount } from "../components/burnerWallet/helpers/generateNewAccount";
import RequestedRecoveries from "../components/eoa7702Wallet/RequestedRecoveries";
import { Button } from "../components/Button";
import WalletActions from "../components/WalletActions";
import { STEPS } from "../constants";
import { BurnerAccountProvider } from "../context/BurnerAccountContext";
import EOA7702Entry from "../components/eoa7702Wallet/EOA7702Entry";
import { useAccount } from "wagmi";

const EOA7702SafeFlow = () => {
  const stepsContext = useContext(StepsContext);
  const [burnerEOAWalletAddress, setBurnerEOAWalletAddress] = useState<
    string | null
  >();
  const [
    isResetBurnerWalletConfirmationModalOpen,
    setIsResetBurnerWalletConfirmationModalOpen,
  ] = useState(false);

  const owner = useAccount();

  useEffect(() => {
    if (!burnerEOAWalletAddress) {
      const burnerWalletAddressPollingInterval = setInterval(() => {
        const burnerWalletConfig = localStorage.getItem(
          "burnerEOAWalletConfig"
        );
        if (burnerWalletConfig !== undefined && burnerWalletConfig !== null) {
          setBurnerEOAWalletAddress(
            JSON.parse(burnerWalletConfig)?.burnerWalletAddress
          );
          clearInterval(burnerWalletAddressPollingInterval);
        }
      }, 1000);
    }
  }, [burnerEOAWalletAddress]);

  // Create a new burner eoa that will be upgraded to a safe account
  useEffect(() => {
    // TODO: Remove the owner address directly being used here
    if (!localStorage.getItem("burnerEOA7702Owner")) {
      generateNewAccount().then((newAccount) => {
        setBurnerEOAWalletAddress(newAccount.address);
        localStorage.setItem("burnerEOA7702Owner", newAccount.address);
        localStorage.setItem(
          "burnerEOA7702OwnerPrivateKey",
          newAccount.privateKey
        );
      });
    } else {
      setBurnerEOAWalletAddress(
        localStorage.getItem("burnerEOA7702Owner") as string
      );
    }

    const handleBeforeUnload = (event: any) => {
      // Standard across browsers (Chrome, Firefox, etc.)
      event.preventDefault();
      event.returnValue = ""; // Required for Chrome to show the alert

      // Return any string for some older browsers (though modern browsers ignore it)
      return "Are you sure you want to leave? Your changes may not be saved.";
    };

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up the event listener
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const renderBody = () => {
    switch (stepsContext?.step) {
      // Step to upgrade the burner EOA to a safe account using EIP7702 and adding a secondary passkey signer
      case STEPS.CONNECT_WALLETS:
        return <EOA7702Entry />;

      // Configuring the email recovery module on smart account and adding the guardian
      case STEPS.REQUEST_GUARDIAN:
        return <GuardianSetup />;

      // Step to set up the guardian email
      case STEPS.WALLET_ACTIONS:
        return <WalletActions />;

      // Step to add the new owner's address and trigger/complete the recovery process. This flow is similar to Safe v1.3
      case STEPS.REQUESTED_RECOVERIES:
        return <RequestedRecoveries />;

      default:
        return <EOA7702Entry />;
    }
  };

  return (
    <BurnerAccountProvider>
      <div className="app">
        {owner && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              paddingBottom: "2rem",
            }}
          >
            {/* The appkit button is a web component (global html), don't require importing*/}
            <appkit-button />
          </Box>
        )}

        {burnerEOAWalletAddress && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Tooltip
              title="This is your Smart EOA, upgraded using EIP-7702. It combines the simplicity of an EOA with smart contract capabilities like transaction batching, session keys, and enhanced security features, all controlled by your primary signer."
              placement="top"
            >
              <Typography sx={{ display: "flex", alignItems: "center" }}>
                Smart EOA (burner):{" "}
                <a
                  href={`https://scope.sh/84532/address/${burnerEOAWalletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    textDecoration: "none",
                    // color: "inherit",
                  }}
                >
                  {burnerEOAWalletAddress}
                  <LaunchIcon sx={{ marginLeft: "4px", fontSize: "1rem" }} />
                </a>
              </Typography>
            </Tooltip>

            <Tooltip title="Reset Wallet" placement="top">
              <IconButton
                onClick={async () => {
                  setIsResetBurnerWalletConfirmationModalOpen(true);
                }}
                sx={{ padding: "4px" }}
              >
                <RestartAltIcon sx={{ fontSize: "1.2rem" }} />
              </IconButton>
            </Tooltip>
          </div>
        )}

        <Dialog
          open={isResetBurnerWalletConfirmationModalOpen}
          keepMounted
          onClose={setIsResetBurnerWalletConfirmationModalOpen}
          aria-describedby="alert-dialog-slide-description"
        >
          <DialogTitle>{"Reset Burner Wallet"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-slide-description">
              Are you certain you want to reset the burner wallet? Clicking
              "Reset" will permanently remove the burner wallet address from the
              website, and you won't be able to access it again.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              onClick={() => setIsResetBurnerWalletConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                setIsResetBurnerWalletConfirmationModalOpen(false); // Remove these values from localStorage to prevent conflicts with the safe wallet flow.
                await localStorage.removeItem("burnerEOA7702Owner");
                await localStorage.removeItem("burnerEOA7702OwnerPrivateKey");
                window.location.reload();
                setBurnerEOAWalletAddress(null);
              }}
            >
              Reset
            </Button>
          </DialogActions>
        </Dialog>
        {renderBody()}
      </div>
    </BurnerAccountProvider>
  );
};

export default EOA7702SafeFlow;
