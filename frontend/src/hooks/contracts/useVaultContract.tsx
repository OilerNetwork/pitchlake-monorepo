import { useAccount } from "@starknet-react/core";
import { vaultABI } from "@/lib/abi";
import { useContract } from "@starknet-react/core";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import { useMemo } from "react";

export const useVaultContract = ({
  vaultAddress,
}: {
  vaultAddress: string | undefined;
}) => {
  const { account } = useAccount();

  const { contract: vaultContractRaw } = useContract({
    abi: vaultABI,
    address: vaultAddress || ("0x0" as `0x${string}`),
  });

  const vaultContract = useMemo(() => {
    if (!vaultContractRaw || !vaultAddress) return null;
    const typedContract = vaultContractRaw.typedv2(vaultABI);
    if (account) typedContract.connect(account);
    return typedContract;
  }, [vaultContractRaw, account]);

  return { vaultContract };
};
