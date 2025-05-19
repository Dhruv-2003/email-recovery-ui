import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  Grid,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { readContract } from "wagmi/actions";
import {
  getKernelAccount,
  publicClient,
  getSmartAccountClient,
  pimlicoClient,
} from "./client";
import { universalEmailRecoveryModule } from "../../../contracts.base-sepolia.json";
import { abi as universalEmailRecoveryModuleAbi } from "../../abi/UniversalEmailRecoveryModule.json";
import { StepsContext } from "../../App";
import infoIcon from "../../assets/infoIcon.svg";
import { STEPS } from "../../constants";
import { useAppContext } from "../../context/AppContextHook";
import { useBurnerAccount } from "../../context/BurnerAccountContext";
import { config as appKitConfig } from "../../providers/config";
import { relayer } from "../../services/relayer";
import { genAccountCode, templateIdx } from "../../utils/email";
import { TIME_UNITS } from "../../utils/recoveryDataUtils";
import { Button } from "../Button";
import Loader from "../Loader";
import {
  checksumAddress,
  encodeFunctionData,
  parseEther,
  PrivateKeyAccount,
} from "viem";
import { run } from "./deploy";
import { GuardianConfig, AcceptanceCommandTemplatesResult } from "./types";
import {
  P256Credential,
  toWebAuthnAccount,
  WebAuthnAccount,
} from "viem/account-abstraction";
import { computeGuardianAddress } from "../burnerWallet/helpers/computeGuardianAddress";

import { encodeAbiParameters, toFunctionSelector, toHex } from "viem";
import kernelV3_1ImplementationAbi from "../../abi/kernelv3";

//logic for valid email address check for input
const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const GuardianSetup = () => {
  const { burnerAccountClient, burnerAccount } = useBurnerAccount();

  const { guardianEmail, setGuardianEmail, setAccountCode } = useAppContext();
  const stepsContext = useContext(StepsContext);

  const [isAccountInitializedLoading, setIsAccountInitializedLoading] =
    useState(false);
  const [loading, setLoading] = useState(false);

  // 0 = 2 week default delay, don't do for demo
  const [recoveryDelay, setRecoveryDelay] = useState(6);
  const [emailError, setEmailError] = useState(false);
  const [recoveryDelayUnit, setRecoveryDelayUnit] = useState<
    keyof typeof TIME_UNITS
  >(TIME_UNITS.HOURS.value as keyof typeof TIME_UNITS); // Ensure initial value is a valid key
  const [ownerAccount, setOwnerAccount] = useState<WebAuthnAccount>();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkPasskeyCredential = async () => {
    const ownerPasskeyCredential = localStorage.getItem(
      "ownerPasskeyCredential"
    );
    if (
      ownerPasskeyCredential !== undefined &&
      ownerPasskeyCredential !== null
    ) {
      const credential = JSON.parse(ownerPasskeyCredential) as P256Credential;
      const account = toWebAuthnAccount({
        credential,
      });

      setOwnerAccount(account);
    } else {
      stepsContext?.setStep(STEPS.CONNECT_WALLETS);
    }
  };

  const checkIfRecoveryIsConfigured = useCallback(async () => {
    let burnerWalletAddress;
    const kernelAccount = localStorage.getItem("kernelAccount");

    if (kernelAccount) {
      burnerWalletAddress = JSON.parse(kernelAccount).address;
    }

    if (!burnerWalletAddress) {
      return;
    }

    setIsAccountInitializedLoading(true);
    const getGuardianConfig = (await readContract(appKitConfig, {
      abi: universalEmailRecoveryModuleAbi,
      address: universalEmailRecoveryModule as `0x${string}`,
      functionName: "getGuardianConfig",
      args: [burnerWalletAddress],
    })) as GuardianConfig;

    // Check whether recovery is configured
    if (
      getGuardianConfig.acceptedWeight === getGuardianConfig.threshold &&
      getGuardianConfig.threshold !== 0n
    ) {
      setLoading(false);
      stepsContext?.setStep(STEPS.WALLET_ACTIONS);
    }
    setIsAccountInitializedLoading(false);
  }, [stepsContext]);

  useEffect(() => {
    checkIfRecoveryIsConfigured();
    checkPasskeyCredential();

    // If burnerAccountClient (from previous EOA7702 step) is not ready, redirect.
    if (!burnerAccountClient) {
      stepsContext?.setStep(STEPS.CONNECT_WALLETS);
      return;
    }

    // Clean up the interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkIfRecoveryIsConfigured]);

  //logic to check if email input is a valid email
  useEffect(() => {
    if (!guardianEmail) {
      setEmailError(false);
    } else if (!isValidEmail(guardianEmail)) {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  }, [guardianEmail]);

  const configureRecoveryAndRequestGuardian = useCallback(async () => {
    try {
      if (!guardianEmail) {
        throw new Error("guardian email not set");
      }

      if (!burnerAccountClient || !burnerAccount) {
        console.log("Burner Account not found ");
        toast.error("Burner account not available. Please ensure it's set up.");
        return;
      }

      if (!ownerAccount) {
        console.log("Owner not connected");
        toast.error("Owner wallet not connected.");
        return;
      }

      // const sig = await ownerAccount.signMessage({
      //   message: "Please sign this message to confirm your identity.",
      // });

      // console.log("Signature:", sig);

      const kernelAccount = await getKernelAccount(
        ownerAccount,
        burnerAccount as PrivateKeyAccount
      );

      const smartAccountClient = await getSmartAccountClient(
        ownerAccount,
        burnerAccount as PrivateKeyAccount
      );

      const accountCode = await genAccountCode();
      await localStorage.setItem("accountCode", accountCode);
      // console.log(accountCode, "accountCode in configureRecovery"); // Use accountCode directly
      setAccountCode(accountCode as `0x${string}`);

      setLoading(true);

      console.log("installing module.....");

      const guardianAddress = await computeGuardianAddress(
        kernelAccount.address,
        accountCode as `0x${string}`,
        guardianEmail
      );

      const validator = kernelAccount.address;
      const isInstalledContext = toHex(0);
      const functionSelector = toFunctionSelector(
        "swapOwner(address,address,address)"
      );
      const guardians = [guardianAddress];
      const guardianWeights = [1n];
      const threshold = 1n;
      const expiry = 2n * 7n * 24n * 60n * 60n; // 2 weeks in seconds

      const moduleData = encodeAbiParameters(
        [
          { name: "validator", type: "address" },
          { name: "isInstalledContext", type: "bytes" },
          { name: "initialSelector", type: "bytes4" },
          { name: "guardians", type: "address[]" },
          { name: "weights", type: "uint256[]" },
          { name: "delay", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "threshold", type: "uint256" },
        ],
        [
          validator,
          isInstalledContext,
          functionSelector,
          guardians,
          guardianWeights,
          threshold,
          BigInt(recoveryDelay * TIME_UNITS[recoveryDelayUnit].multiplier),
          expiry,
        ]
      );

      // const opHash2 = await smartAccountClient.send

      const opHash = await smartAccountClient.sendTransaction({
        to: kernelAccount.address as `0x${string}`,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: kernelV3_1ImplementationAbi,
          functionName: "installModule",
          args: [
            BigInt(2),
            checksumAddress(universalEmailRecoveryModule as `0x${string}`),
            moduleData,
          ],
        }),
      });

      console.log("User Operation Hash:", opHash);

      await pimlicoClient.waitForUserOperationReceipt({
        hash: opHash,
      });

      // // The run function installs the recovery module, and returns the wallet's address.
      // await run(
      //   accountCode as `0x${string}`,
      //   guardianEmail,
      //   kernelAccount,
      //   smartAccountClient,
      //   recoveryDelay * TIME_UNITS[recoveryDelayUnit].multiplier
      // );

      console.log("Recovery module installed");

      // This function fetches the command template for the acceptanceRequest API call.
      const subject = (await publicClient.readContract({
        abi: universalEmailRecoveryModuleAbi,
        address: universalEmailRecoveryModule as `0x${string}`,
        functionName: "acceptanceCommandTemplates",
        args: [],
      })) as AcceptanceCommandTemplatesResult; // Cast to defined type

      try {
        // Attempt the API call
        await relayer.acceptanceRequest(
          universalEmailRecoveryModule as `0x${string}`,
          guardianEmail,
          accountCode.slice(2),
          templateIdx,
          subject[0]
            .join()
            .replace(/,/g, " ")
            .replace("{ethAddr}", kernelAccount.address)
        );
      } catch (error) {
        // retry mechanism as this API call fails for the first time
        console.warn("API call failed, retrying...", error);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        await relayer.acceptanceRequest(
          universalEmailRecoveryModule as `0x${string}`,
          guardianEmail,
          accountCode.slice(2),
          templateIdx,
          subject[0]
            .join()
            .replace(/,/g, " ")
            .replace("{ethAddr}", kernelAccount.address)
        );
      }

      toast("Please check your email", {
        icon: <img src={infoIcon} />,
        style: {
          background: "white",
        },
      });

      // NOTE: Disabling the wait logic for configuring recovery
      // Setting up interval for polling
      // intervalRef.current = setInterval(() => {
      //   checkIfRecoveryIsConfigured();
      // }, 5000); // Adjust the interval time (in milliseconds) as needed

      stepsContext?.setStep(STEPS.WALLET_ACTIONS);
    } catch (err: any) {
      // Typed err as any to access shortMessage, or use a more specific error type
      console.error("Error in configureRecoveryAndRequestGuardian:", err);
      toast.error(
        err?.shortMessage ||
          err?.message ||
          "Something went wrong while configuring guardians, please try again."
      );
      setLoading(false);
    }
  }, [
    guardianEmail,
    checkIfRecoveryIsConfigured,
    burnerAccountClient,
    burnerAccount,
    ownerAccount,
    setAccountCode,
    recoveryDelay,
    recoveryDelayUnit,
  ]);

  if (isAccountInitializedLoading && !loading) {
    return <Loader />;
  }

  return (
    <Box>
      <Typography variant="h2" sx={{ paddingBottom: "1.5rem" }}>
        Set Up Guardian Details
      </Typography>
      <Typography variant="h6" sx={{ paddingBottom: "5rem" }}>
        Choose a Guardian you trust to be enable wallet recovery via email.
        They'll receive an email request.
      </Typography>

      <Grid
        container
        gap={3}
        justifyContent={"center"}
        sx={{
          maxWidth: { xs: "100%", lg: "60%" },
          width: "100%",
          marginX: "auto",
        }}
      >
        <Grid
          item
          container
          md={9}
          justifyContent={"space-around"}
          xs={12}
          sx={{ gap: 3 }}
        >
          <Grid item container>
            <Grid item container xs alignItems={"center"}>
              <Typography variant="body1">Guardian's Email</Typography>
              <Tooltip
                placement="top"
                title={
                  "Enter the email address of the guardian you want to set up for account recovery."
                }
                arrow
              >
                <IconButton
                  size="small"
                  aria-label="info"
                  sx={{ marginLeft: 1 }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item container xs={6} gap={2}>
              <TextField
                type="email"
                size="small"
                fullWidth
                value={guardianEmail}
                error={emailError}
                helperText={
                  emailError ? "Please enter the correct email address" : null
                }
                placeholder="guardian@prove.email"
                onChange={(e) => setGuardianEmail(e.target.value)}
                title="Guardian's Email"
              />
            </Grid>
          </Grid>
          <Grid
            item
            container
            direction={"row"}
            justifyContent={"space-between"}
            alignItems="center"
          >
            <Grid item container xs alignItems={"center"}>
              <Typography variant="body1">Timelock</Typography>
              <Tooltip
                placement="top"
                title={
                  "This is the duration during which guardians cannot initiate recovery. Recovery can only be triggered once this period has ended."
                }
                arrow
              >
                <IconButton
                  size="small"
                  aria-label="info"
                  sx={{ marginLeft: 1 }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item container xs gap={2}>
              <Grid item container xs={12} gap={2}>
                <TextField
                  type="number"
                  size="small"
                  sx={{ maxWidth: "6rem" }}
                  value={recoveryDelay}
                  onChange={(e) =>
                    setRecoveryDelay(
                      parseInt((e.target as HTMLInputElement).value)
                    )
                  }
                  error={
                    recoveryDelay * TIME_UNITS[recoveryDelayUnit].multiplier <
                    21600
                  }
                  title="Recovery Delay"
                />

                <Select
                  value={recoveryDelayUnit}
                  size="small"
                  onChange={(e) =>
                    setRecoveryDelayUnit(
                      e.target.value as keyof typeof TIME_UNITS
                    )
                  }
                >
                  {Object.keys(TIME_UNITS).map((timeUnitKey) => {
                    const timeUnit = timeUnitKey as keyof typeof TIME_UNITS;
                    return (
                      <MenuItem
                        key={timeUnit}
                        value={TIME_UNITS[timeUnit].value}
                      >
                        {TIME_UNITS[timeUnit].label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" textAlign={"left"} color={"error"}>
                  {recoveryDelay * TIME_UNITS[recoveryDelayUnit].multiplier <
                  21600
                    ? "Recovery delay must be at least 6 hours"
                    : null}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item sx={{ marginX: "auto" }}>
          <Box
            sx={{ width: "330px", marginX: "auto", marginTop: "30px" }}
          ></Box>
          {ownerAccount ? (
            <Button
              disabled={
                !guardianEmail ||
                loading ||
                emailError ||
                recoveryDelay * TIME_UNITS[recoveryDelayUnit].multiplier < 21600
              }
              loading={loading}
              onClick={configureRecoveryAndRequestGuardian}
              variant={"contained"}
            >
              {loading
                ? "Configuring..."
                : "Configure Recovery & Request Guardian"}
            </Button>
          ) : (
            <Typography sx={{ paddingBottom: "1.5rem" }}>
              Wallet Not connected
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default GuardianSetup;
