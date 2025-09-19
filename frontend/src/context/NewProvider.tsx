"use client";
import useMockVault from "@/hooks/vault/mock/useMockVault";
import useWebSocketVault from "@/hooks/vault/websocket/useWebSocketVault";
import { MockData, WebSocketData } from "@/lib/types";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useState,
  useEffect,
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
  const [conn, setConn] = useState<string>("rpc"); // Default value for SSR

  const [selectedRound, setSelectedRound] = useState<number>(0);

  // Set connection type after hydration to prevent mismatch
  useEffect(() => {
    setConn(process.env.NEXT_PUBLIC_ENVIRONMENT || "rpc");
  }, []);

  const wsData = useWebSocketVault(conn, vaultAddress);
  const mockData = useMockVault({
    address: vaultAddress,
  });
  const contextValue = {
    conn,
    vaultAddress,
    setVaultAddress,
    selectedRound,
    setSelectedRound,
    wsData,
    mockData,
  };

  return (
    <NewContext.Provider value={contextValue}>{children}</NewContext.Provider>
  );
};

export const useNewContext = () => useContext(NewContext);
export default NewContextProvider;
