import { useNewContext } from "@/context/NewProvider";
import { vaultABI } from "@/lib/abi";
import { LiquidityProviderStateType } from "@/lib/types";
import { useAccount, useContractRead } from "@starknet-react/core";
import { useMemo } from "react";
import { BlockTag } from "starknet";

const useLPStateRPC = ({vaultAddress}:{vaultAddress?:string}) => {
 
  const contractData = useMemo(() => {
    return {
      abi: vaultABI,
      address: vaultAddress,
    };
  }, [vaultAddress]);

  const { account } = useAccount();

  const { data: lockedBalance } = useContractRead({
    ...contractData,
    watch: true,
    functionName: "get_account_locked_balance",
    args: [account?.address as string],
  });
  const { data: unlockedBalance } = useContractRead({
    ...contractData,
    watch: true,
    functionName: "get_account_unlocked_balance",
    args: [account?.address as string],
  });
  const { data: stashedBalance } = useContractRead({
    ...contractData,
    watch: true,
    functionName: "get_account_stashed_balance",
    args: [account?.address as string],
  });
  const { data: queuedBps } = useContractRead({
    ...contractData,
    watch: true,
    functionName: "get_account_queued_bps",
    args: [account?.address as string],
  });
  return {
    address: account?.address,
    lockedBalance,
    unlockedBalance,
    stashedBalance,
    queuedBps,
  } as LiquidityProviderStateType;
};

export default useLPStateRPC;
