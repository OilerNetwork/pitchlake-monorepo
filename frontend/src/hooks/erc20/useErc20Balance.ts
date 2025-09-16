import { useAccount, useReadContract } from "@starknet-react/core";
import { useMemo } from "react";
import { erc20ABI } from "@/lib/abi";

const useErc20Balance = (tokenAddress: `0x${string}` | undefined) => {
  const { account } = useAccount();

  console.log("erc20ABI", erc20ABI);
  const { data: balanceRaw } = useReadContract({
    abi: [{
      "type": "function",
      "name": "balance_of",
      "inputs": [
        {
          "name": "account",
          "type": "core::starknet::contract_address::ContractAddress"
        }
      ],
      "outputs": [
        {
          "type": "core::integer::u256"
        }
      ],
      "state_mutability": "view"
    }] as const,
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
