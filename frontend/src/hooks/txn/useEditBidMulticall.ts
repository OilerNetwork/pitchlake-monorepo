import { useMemo } from "react";
import { Call } from "starknet";
import { useContractWrite } from "@starknet-react/core";
import { isValidHex64 } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useErc20Contract } from "@/hooks/contracts/useErc20Contract";
import { useVaultContract } from "@/hooks/contracts/useVaultContract";

interface EditBidMulticallProps {
  accountAddress: string | undefined;
  vaultAddress: string | undefined;
  roundAddress: string | undefined;
  ethAddress: string | undefined;
  allowance: bigint | undefined;
  bidId: string;
  priceIncreaseWei: BigInt;
  totalNewCostWei: BigInt;
  localStorageToRemove: string[];
}

export default function useEditBidMulticall({
  accountAddress,
  vaultAddress,
  roundAddress,
  ethAddress,
  allowance,
  bidId,
  totalNewCostWei,
  priceIncreaseWei,
  localStorageToRemove,
}: EditBidMulticallProps) {
  const { setPendingTx } = useTransactionContext();

  // Get contract objects
  const { erc20Contract: ethContract } = useErc20Contract({
    tokenAddress: ethAddress,
  });
  const { vaultContract } = useVaultContract({
    vaultAddress: vaultAddress,
  });

  const calls: Call[] = useMemo(() => {
    // Is account ok
    if (!accountAddress || !isValidHex64(accountAddress)) return [];

    // Are vars ok
    if (!vaultAddress || !roundAddress || !vaultContract || !ethContract)
      return [];

    // Prepare calls
    const callsArr: Call[] = [];

    const approveCall = ethContract.populateTransaction.approve(
      roundAddress,
      totalNewCostWei as bigint,
    );
    const editBidCall = vaultContract.populateTransaction.update_bid(
      bidId,
      priceIncreaseWei as bigint,
    );

    // Only push approve if allowance is too low
    if (approveCall && (allowance || 0) < (totalNewCostWei as bigint)) {
      callsArr.push(approveCall);
    }

    // Always push bid call
    if (editBidCall) {
      callsArr.push(editBidCall);
    }

    return callsArr;
  }, [
    accountAddress,
    vaultAddress,
    roundAddress,
    ethAddress,
    allowance,
    bidId,
    totalNewCostWei,
    priceIncreaseWei,
  ]);

  const { writeAsync } = useContractWrite({ calls });

  const handleMulticall = async () => {
    if (!calls.length) {
      throw new Error("No calls to execute. Check your bid parameters.");
    }

    const response = await writeAsync();
    setPendingTx(response?.transaction_hash);

    localStorageToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    return response?.transaction_hash;
  };

  return {
    calls,
    handleMulticall,
  };
}
