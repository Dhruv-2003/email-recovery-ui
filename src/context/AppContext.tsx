import { createContext } from "react";

type AppContextType = {
  accountCode: `0x${string}`| null;
  setAccountCode: (ac: `0x${string}`) => void;
  guardianEmail: string;
  setGuardianEmail: (ge: string) => void;
};

export const appContext = createContext<AppContextType>({
  accountCode: null,
  setAccountCode: () => {},
  guardianEmail: "",
  setGuardianEmail: () => {},
});
