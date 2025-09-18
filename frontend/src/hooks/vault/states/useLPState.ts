import { useNewContext } from "@/context/NewProvider";
import { useMemo } from "react";
import useLPStateRPC from "../rpc/useLPStateRPC";

const useLPState = () => {
  const { conn, wsData, mockData, vaultAddress } = useNewContext();
  const lpStateRPC = useLPStateRPC({
    vaultAddress:
      conn === "rpc" || conn === "demo"
        ? (vaultAddress as `0x${string}`)
        : undefined,
  });
  const lpStateWS = wsData.wsLiquidityProviderState;
  const lpStateMock = mockData.lpState;

  const lpState =
    conn === "mock"
      ? lpStateMock
      : conn === "rpc" || conn === "demo"
        ? lpStateRPC
        : lpStateWS;

  return lpState;
};

export default useLPState;
