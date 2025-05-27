import { createAppKit } from "@reown/appkit";
import { baseSepolia } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { appKitMetadata, appKitWagmiAdapter, projectId } from "./config";

createAppKit({
  adapters: [appKitWagmiAdapter],
  networks: [baseSepolia],
  projectId,
  metadata: appKitMetadata,
  features: {
    analytics: false,
    email: false,
  },
  themeMode: "dark",
});

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={appKitWagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};
