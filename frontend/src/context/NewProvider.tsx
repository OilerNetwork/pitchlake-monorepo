"use client";
import useMockVault from "@/hooks/vault_v2/mock/useMockVault";
import useWebSocketVault from "@/hooks/vault_v2/websocket/useWebSocketVault";
import { MockData, WebSocketData } from "@/lib/types";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";

export type NewContextType = {
  conn: string;
  vaultAddress?: string;
  selectedRound: number;
  setSelectedRound: (roundId: number) => void;
  setVaultAddress: Dispatch<SetStateAction<string | undefined>>;
  wsData: WebSocketData;
  mockData: MockData;
};

export const NewContext = createContext<NewContextType>({} as NewContextType);
const NewContextProvider = ({ children }: { children: ReactNode }) => {
  const [vaultAddress, setVaultAddress] = useState<string | undefined>();
  const conn = process.env.NEXT_PUBLIC_ENVIRONMENT || "rpc";

  const [selectedRound, setSelectedRound] = useState<number>(0);

  const wsData = useWebSocketVault(conn, vaultAddress);
  const mockData = useMockVault({
    address: vaultAddress,
  });
  const contextValue = {
    conn,
    vaultAddress,
    setVaultAddress,
    selectedRound,
    setSelectedRound, //: setRound,
    wsData,
    mockData,
  };

  return (
    <NewContext.Provider value={contextValue}>{children}</NewContext.Provider>
  );
};

export const useNewContext = () => useContext(NewContext);
export default NewContextProvider;
