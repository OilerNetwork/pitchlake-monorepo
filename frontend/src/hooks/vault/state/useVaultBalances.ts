import { vaultABI } from "@/lib/abi";
import { useContractRead } from "@starknet-react/core";
import { useMemo } from "react";
import { BlockTag } from "starknet";

const useVaultBalances = (address: string | undefined, args?: { watch?: boolean }) => {
  // Determine if args were provided
  const watch = args?.watch ?? false;
  const contractData = useMemo(() => {
    return { abi: vaultABI, address:address as `0x${string}` };
  }, [address]);

  const { data: lockedBalance } = useContractRead({
    ...contractData,

    watch,
    functionName:"get_vault_locked_balance",
    args:[],
    
  })
  const { data: unlockedBalance } = useContractRead({
    ...contractData,

    watch,
    functionName:"get_vault_unlocked_balance",
    args:[],
    
  })
  const { data: stashedBalance } = useContractRead({
    ...contractData,

    watch,
    functionName:"get_vault_stashed_balance",
    args:[],
    
  })
  return {
    lockedBalance: lockedBalance ? lockedBalance.toString() : 0,
    unlockedBalance: unlockedBalance ? unlockedBalance.toString() : 0,
    stashedBalance: stashedBalance ? stashedBalance.toString() : 0,
  };
};

export default useVaultBalances;
