import { useAccount } from "@starknet-react/core";
import { optionRoundABI } from "@/lib/abi";
import { useContract } from "@starknet-react/core";
import { useMemo } from "react";

export const useOptionRoundContract = ({
  contractAddress,
}: {
  contractAddress: string | undefined;
}) => {
  const { account } = useAccount();

  const { contract: roundContractRaw } = useContract({
    abi: optionRoundABI,
    address: contractAddress
      ? (contractAddress as `0x${string}`)
      : ("0x0" as `0x${string}`),
  });

  const optionRoundContract = useMemo(() => {
    if (!roundContractRaw || !contractAddress) return null;
    const typedContract = roundContractRaw.typedv2(optionRoundABI);
    if (account) typedContract.connect(account);
    return typedContract;
  }, [roundContractRaw, account, contractAddress]);

  return { optionRoundContract };
};
