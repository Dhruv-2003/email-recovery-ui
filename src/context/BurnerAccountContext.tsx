import React, { createContext, ReactNode, useContext, useState } from "react";
import "viem/window";

type BurnerAccountContextType = {
  burnerAccountClient: any;
  setBurnerAccountClient: (accountClient: any) => void;
  burnerAccount: any; // For PrivateKeyAccounts
  setBurnerAccount: (account: any) => void;
};

const BurnerAccountContext = createContext<BurnerAccountContextType>({
  burnerAccountClient: null,
  setBurnerAccountClient: () => {},
  burnerAccount: null,
  setBurnerAccount: () => {},
});

export const BurnerAccountProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [burnerAccountClient, setBurnerAccountClient] = useState(null); // Adjust type as needed

  const [burnerAccount, setBurnerAccount] = useState(null); // Adjust type as needed

  return (
    <BurnerAccountContext.Provider
      value={{
        burnerAccountClient,
        setBurnerAccountClient,
        burnerAccount,
        setBurnerAccount,
      }}
    >
      {children}
    </BurnerAccountContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBurnerAccount = () => {
  const context = useContext(BurnerAccountContext);
  if (!context) {
    throw new Error(
      "useBurnerAccount must be used within a BurnerAccountProvider"
    );
  }
  return context;
};
