# Email Recovery Demo

Based on `yarn creat vite w/ React, Typescript`

## Deps

- NodeJS
- yarn

## Setup

```sh
yarn
yarn setup # this will overwrite your existing .env file with a template.
```

After running `yarn setup`, you will need to configure the following environment variables in the newly created `.env` file:

```
VITE_WALLET_CONNECT_PROJECT_ID=YOUR_PROJECT_ID
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_PIMLICO_API_KEY=YOUR_PIMLICO_API_KEY
RELAY_PRIVATE_KEY=YOUR_RELAY_PRIVATE_KEY
```

- `VITE_WALLET_CONNECT_PROJECT_ID`: You can create a new WalletConnect project and get your Project ID at [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/).
- `VITE_ALCHEMY_API_KEY`: Obtain this key from [Alchemy](https://www.alchemy.com/) after signing up or logging in. This is used for interacting with the network ( Base Sepolia in this case ).
- `VITE_PIMLICO_API_KEY`: Obtain this key from [Pimlico](https://dashboard.pimlico.io) after signing up or logging in. This is used for the account abstraction features like paymaster and sending the user operations
- `RELAY_PRIVATE_KEY`: This is the private key for the relayer service that sends the 7702 authorizations for EOAs. You need to generate this securely. **This account needs to have funds on Base sepolia (~0.1 ETH). Ensure this key is kept secret and has no funds associated with it other than for gas fees if necessary.**

## Run Development Server

```sh
yarn dev # Runs the Vite development server
node server.js # Run the relayer server in a separate terminal
```

## Production Deployment

To deploy the application for production:

1.  **Build the application:**

    ```sh
    yarn build
    ```

    This command bundles the React application into static files for production.

2.  **Run the application:**

    ```sh
    node server.js
    ```

    This command will serve both the static files and the backend api endpoints.

    Ensure your `.env` file with production-ready keys is present and configured when running the server. The server handles relaying and other backend functionalities.

## Base Sepolia Guide

### Connecting your Safe

1. Start the app locally by following the setup instructions above, or visit https://getwax.github.io/wax. If running locally, remember to generate the WalletConnect project ID.
2. Ensure you have a Safe account deployed to Base Sepolia. This is easiest to do through the Safe Wallet UI at https://app.safe.global. Connect your signer(s) e.g. MetaMask
3. Click the "Connect Wallet" button, choose the WalletConnect option, and then "Copy to Clipboard". This copies a pairing code that can be used to connect your Safe to the recovery dApp.
4. Return to the Safe Wallet UI and look for the WalletConnect icon, it's located next to your connected account info at the top right of the screen on desktop. Click on the icon and paste the pairing code - it should connect automatically and you should see a ZKEmail icon alongside the WalletConnect icon in the UI.

### Enabling the recovery module

5. In the recovery dApp, click "Enable Email Recovery Module", you should then be prompted in the Safe UI to confirm this transaction.

### Configuring the recovery module and adding a guardian

6. Now the recovery module has been enabled, you can configure recovery and request a guardian. Enter the guardians email address and also the recovery delay in seconds (so for a 10 second delay, enter the number 10). Then click "Configure Recovery & Request Guardian" and confirm the transaction in your Safe. This will add the required recovery config to the recovery module. The relayer will also be called under the hood and will send an email to your guardian so that they can confirm they agree to be your guardian. This additional confirmation from the guardian helps to prevent mistakes when adding the guardian to the recovery config. The recovery delay is a security feature that adds a delay from when recovery is approved until recovery can actually be executed. This protects against malicious recovery attempts where a guardian or hacker tries to take over an account - when this happens, the account owner can cancel the recovery while the delay is in progress.
7. Your guardian should now receive an email asking them to confirm this request by replying "Confirm" to the email. After about a minute or two of the guardian confirming, they should get a confirmation that they have been accepted as a guardian successfully. Under the hood, the relayer is generating the zkp from the email and verifying it onchain. Your recovery module is now setup and ready to go!

### Recovering your Safe

8. To initiate the recovery process, paste your new owner address into the "New Owner" field and click "Request Recovery".
9. Your guardian will receive an email asking them to confirm the recovery request. They can do this by replying "Confirm" to the email. The relayer will then generate a zkp from this email and verify it onchain. After about a minute or two, the guardian will receive an email confirmation that their recovery approval has been a success.
10. After the recovery delay has passed, click the "Complete Recovery" button in the recovery dApp. This will rotate the owner on the Safe and replace it with the new owner. Refresh the Safe Wallet app and visit settings to see the new owner rotated successfully.
