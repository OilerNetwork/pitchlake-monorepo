import { useAccount } from "@starknet-react/core";
import { erc20ABI } from "@/lib/abi";
import { useContract } from "@starknet-react/core";
import { useMemo } from "react";

export const useErc20Contract = ({
  tokenAddress,
}: {
  tokenAddress: string | undefined;
}) => {
  const { account } = useAccount();

  const { contract: erc20ContractRaw } = useContract({
    abi: erc20ABI,
    address: tokenAddress || ("0x0" as `0x${string}`),
  });

  const erc20Contract = useMemo(() => {
    if (!erc20ContractRaw || !tokenAddress) return null;
    const typedContract = erc20ContractRaw.typedv2(erc20ABI);
    if (account) typedContract.connect(account);
    return typedContract;
  }, [erc20ContractRaw, account]);

  return { erc20Contract };
};
