import { useAccount, useContractRead } from "@starknet-react/core";
import { useMemo } from "react";
import { erc20ABI } from "@/lib/abi";

const useErc20Allowance = (
  tokenAddress: `0x${string}` | undefined,
  spender?: string,
) => {
  const { account } = useAccount();

  const { data: allowanceRaw } = useContractRead({
    abi: erc20ABI,
    address: tokenAddress ? tokenAddress : undefined,
    functionName: "allowance",
    args: account?.address && spender ? [account.address, spender] : undefined,
    watch: true,
  });

  const allowance: bigint = useMemo(() => {
    return (allowanceRaw ? allowanceRaw : 0) as bigint;
  }, [allowanceRaw]);

  return {
    allowance,
  };
};

export default useErc20Allowance;
