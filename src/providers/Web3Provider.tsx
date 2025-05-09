import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "./config";

const connectKitOptions = {
  walletConnectName: "WalletConnect",
  hideNoWalletCTA: true,
};

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  console.log(config, "config");
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider options={connectKitOptions}>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
