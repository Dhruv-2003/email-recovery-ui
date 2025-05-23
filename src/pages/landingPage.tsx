import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import KeyIcon from "@mui/icons-material/Key";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { Grid, Typography, useTheme } from "@mui/material";
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "../App.css";
import { StepsContext } from "../App";
import FlowInfoCard from "../components/FlowsInfoCard";
import Toggle from "../components/Toggle";
import { STEPS } from "../constants";

type actionType =
  | "SAFE_WALLET"
  | "BURNER_WALLET"
  | "WALLET_RECOVERY"
  | "EOA_7702_WALLET";

type FlowType = "setup" | "recover";

const LandingPage = () => {
  const theme = useTheme();
  const [flow, setFlow] = useState<FlowType>("setup");
  const stepsContext = useContext(StepsContext);

  const navigate = useNavigate();

  const handleFlowChange = (newFlow: FlowType) => {
    setFlow(newFlow);
  };

  const handleClick = async (action: actionType) => {
    await stepsContext?.setStep(STEPS.CONNECT_WALLETS);

    switch (action) {
      case "SAFE_WALLET":
        toast("Please disconnect previously created wallet");
        return navigate("/safe-wallet");
      case "BURNER_WALLET":
        return navigate("/burner-wallet");
      case "EOA_7702_WALLET":
        return navigate("/7702-eoa-wallet");
      case "WALLET_RECOVERY":
        return navigate("/wallet-recovery");
      default:
        break;
    }
  };

  return (
    <div className="bg-white h-full">
      <Grid sx={{ marginBottom: "auto" }}>
        <Typography variant="h1">Email Recovery Demo</Typography>
        <Typography
          sx={{
            color: theme.palette.secondary.main,
            paddingTop: "15px",
            fontWeight: "medium",
            lineHeight: "140%",
          }}
        >
          Assigned Guardians must reply back to an email to enable wallet
          recovery to a new address.
        </Typography>
        <Toggle onFlowChange={handleFlowChange} />
      </Grid>

      {flow === "setup" ? (
        <Grid container>
          <Grid item container xs={12} justifyContent={"center"} gap={3}>
            {/* Passkey EOA (EIP-7702) */}
            <FlowInfoCard
              icon={
                <KeyIcon
                  sx={{
                    width: "2.25rem",
                    height: "2.25rem",
                    color: "#000000",
                  }}
                />
              }
              buttonText={"Try Passkey controlled EOA Flow"}
              handleButtonClick={() => handleClick("EOA_7702_WALLET")}
              title={"Passkey EOA (EIP-7702)"}
              description={
                "Control your EOA with a passkey using EIP-7702. Enables smart account features like social recovery for your existing address."
              }
              infoIconTitle={"EIP-7702: Passkey-Controlled EOA"}
              infoIconDescription={
                "This flow demonstrates how EIP-7702 allows a passkey to authorize transactions for your EOA. You can set up guardians to recover access, combining the simplicity of passkeys with the security of social recovery."
              }
            />
            {/* TEST WALLET */}
            <FlowInfoCard
              icon={
                <AccountBalanceWalletOutlinedIcon
                  sx={{
                    width: "2.25rem",
                    height: "2.25rem",
                    color: "#000000",
                  }}
                />
              }
              buttonText={"Burner Safe Flow (v1.4.1)"}
              handleButtonClick={() => handleClick("BURNER_WALLET")}
              title={"Test Wallet"}
              description={
                "A burner wallet is a temporary crypto wallet for quick, low-value transactions, ideal for short-term use, events, or testing, with minimal security."
              }
              infoIconTitle={"Test Wallet Recovery Setup"}
              infoIconDescription={
                "Test out our setup and recovery flow with a test wallet."
              }
            />
          </Grid>

          {/*  PROMPT TO CONTACT IF U WANT ANOTHER WALLET AT BOTTOM*/}
          <Grid item xs={12} style={{ marginTop: "1rem" }}>
            <Typography>
              Want us to setup account recovery for a different wallet?&nbsp;
              <Link
                to="https://t.me/zkemail"
                target="_blank"
                style={{ fontWeight: "bold" }}
              >
                Contact Us!
              </Link>
            </Typography>
          </Grid>
        </Grid>
      ) : (
        /* RECOVERY FLOW! */
        <Grid container>
          <Grid item container xs={12} justifyContent={"center"} gap={3}>
            <FlowInfoCard
              icon={
                <SwapHorizIcon
                  sx={{
                    width: "2.25rem",
                    height: "2.25rem",
                    color: "#000000",
                  }}
                />
              }
              buttonText={"Recover Wallet Flow"}
              handleButtonClick={() => handleClick("WALLET_RECOVERY")}
              title={" Recover Wallet"}
              description={"Request Wallet Transfer via Email Guardians"}
              infoIconTitle={"Recover Your Lost Recovery Enabled Wallet"}
              infoIconDescription={
                "If you forgot your lost wallet address reach out to your gaurdians, they will have the lost wallet address inside the emails they got when they agreed to be gaurdians, they can also identify the email by looking for your gaurdian message inside the email. If you forgot your gaurdian emails you can still atempt recovery"
              }
            />
          </Grid>
        </Grid>
      )}
    </div>
  );
};

export default LandingPage;
