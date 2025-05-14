import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "@reown/appkit/networks";

export const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const appKitMetadata = {
  name: "Email Recovery Demo",
  description: "Email Recovery Demo",
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ["https://i.imgur.com/46VRTCF.png"],
};

const appKitNetwork = [baseSepolia];

// 4. Create Wagmi Adapter
export const appKitWagmiAdapter = new WagmiAdapter({
  networks: appKitNetwork,
  projectId,
  ssr: true,
});

export const config = appKitWagmiAdapter.wagmiConfig;
