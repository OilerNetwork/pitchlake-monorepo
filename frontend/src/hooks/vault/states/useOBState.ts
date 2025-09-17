import { useNewContext } from "@/context/NewProvider";
import useOptionBuyerStateRPC from "../rpc/useOptionBuyerStateRPC";
import { useMemo } from "react";

const useOBState = (address?: string) => {
  const { conn, wsData, mockData } = useNewContext();
  const obStateRPC = useOptionBuyerStateRPC(address);
  const obStateWS = wsData.wsOptionBuyerStates.find(
    (state) => state.address?.toLowerCase() === address?.toLowerCase(),
  );
  const obStateMock = mockData.optionBuyerStates.find(
    (state) => state.address?.toLowerCase() === address?.toLowerCase(),
  );

  const obState = useMemo(() => {
    if (conn === "mock") {
      return obStateMock;
    }
    if (conn === "rpc" || conn === "demo") {
      return obStateRPC;
    }
    return obStateWS;
  }, [conn, obStateMock, obStateRPC, obStateWS]);

  return obState;
};

export default useOBState;

