import { useNewContext } from "@/context/NewProvider";
import useOptionRoundStateRPC from "../rpc/useOptionRoundStateRPC";
import { useMemo } from "react";

const useRoundState = (address?: string) => {
  const { conn, wsData, mockData } = useNewContext();

  const roundStateRPC = useOptionRoundStateRPC(conn, address);
  const roundStateWS = useMemo(() => {
    return wsData.wsOptionRoundStates.find(
      (round) => round.address?.toLowerCase() === address?.toLowerCase(),
    );
  }, [wsData, address]);

  const roundStateMock = useMemo(() => {
    return mockData.optionRoundStates.find(
      (round) => round.address?.toLowerCase() === address?.toLowerCase(),
    );
  }, [mockData, address]);

  const roundState = useMemo(() => {
    if (conn === "ws") return roundStateWS;
    else if (conn === "rpc" || "demo") return roundStateRPC;
    else return roundStateMock;
  }, [conn, roundStateMock, roundStateRPC, roundStateWS]);

  return roundState;
};

export default useRoundState;
