import { useAccount, useContractRead } from "@starknet-react/core";
import { useMemo } from "react";
import { erc20ABI } from "@/lib/abi";

const useErc20Balance = (tokenAddress: `0x${string}` | undefined) => {
  const { account } = useAccount();

  const { data: balanceRaw } = useContractRead({
    abi: erc20ABI,
    address: tokenAddress ? tokenAddress : undefined,
    functionName: "balance_of",
    args: account ? [account.address] : undefined,
    watch: true,
  });

  // No increase_allowance on ETH ?
  const balance: bigint = useMemo(() => {
    return (balanceRaw ? balanceRaw : 0) as bigint;
  }, [balanceRaw]);

  return {
    balance,
  };
};

export default useErc20Balance;
