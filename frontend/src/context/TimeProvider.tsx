"use client";
import { ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useNewContext } from "./NewProvider";
import { useBlock, useBlockNumber } from "@starknet-react/core";
import { BlockTag } from "starknet";

/*This is the bridge for any transactions to go through, it's disabled by isTxDisabled if there is data loading or if
  there's a pending transaction. The data loading is enforced to ensure no transaction is done without latest data.
  Add pendingStates from any critical data here and add it in the subsequent hooks
*/
//Possible Updates:
//Make transactions accepted only after 2 confirmations

export type TimeContextType = {
  timestamp: number;
  mockTimeForward: () => void;
};

export const TimeContext = createContext<TimeContextType>(
  {} as TimeContextType,
);
const TimeContextProvider = ({ children }: { children: ReactNode }) => {
  //Mock States

  const { conn } = useNewContext();
  const [mockTimestamp, setMockTimestamp] = useState(0);

  const { data: block } = useBlock({
    refetchInterval: 1000,
  });
  const blockNumber = useBlockNumber({
    refetchInterval: 1000,
  });

  const timestamp = useMemo(() => {
    if (conn === "mock") return mockTimestamp;
    else return block?.timestamp ?? 0;
  }, [conn, block?.timestamp, mockTimestamp]);

  const mockTimeForward = () => {
    if (conn === "mock") setMockTimestamp((prevState) => prevState + 100001);
  };

  const contextValue = {
    timestamp,
    mockTimeForward,
  };

  return (
    <TimeContext.Provider value={contextValue}>{children}</TimeContext.Provider>
  );
};

export const useTimeContext = () => useContext(TimeContext);
export default TimeContextProvider;
