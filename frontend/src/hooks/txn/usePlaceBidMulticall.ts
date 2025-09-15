import { useMemo } from "react";
import { parseUnits } from "ethers";
import { num, Call } from "starknet";
import { useContractWrite } from "@starknet-react/core";
import { isValidHex64 } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useErc20Contract } from "@/hooks/contracts/useErc20Contract";
import { useVaultContract } from "@/hooks/contracts/useVaultContract";

interface PlaceBidMulticallProps {
  accountAddress: string | undefined;
  vaultAddress: string | undefined;
  roundAddress: string | undefined;
  ethAddress: string | undefined;
  allowance: bigint | undefined;
  bidAmount: string;
  bidPrice: string;
  localStorageToRemove: string[];
}

export default function usePlaceBidMulticall({
  accountAddress,
  vaultAddress,
  roundAddress,
  ethAddress,
  allowance,
  bidAmount,
  bidPrice,
  localStorageToRemove,
}: PlaceBidMulticallProps) {
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
    if (
      !vaultAddress ||
      !roundAddress ||
      !bidAmount ||
      !bidPrice ||
      !vaultContract ||
      !ethContract ||
      Number(bidAmount) <= 0 ||
      Number(bidPrice) <= 0
    )
      return [];

    // Convert bid total to wei
    const priceWei = num.toBigInt(parseUnits(bidPrice, "gwei"));
    const amount = num.toBigInt(bidAmount);
    const totalWei = priceWei * amount;

    // Prepare calls
    const callsArr: Call[] = [];

    const approveCall = ethContract.populateTransaction.approve(
      roundAddress,
      totalWei,
    );
    const bidCall = vaultContract.populateTransaction.place_bid(
      BigInt(bidAmount),
      parseUnits(bidPrice, "gwei"),
    );

    // Only push approve if allowance is too low
    if (approveCall && (allowance || 0) < totalWei) {
      callsArr.push(approveCall);
    }

    // Always push bid call
    if (bidCall) {
      callsArr.push(bidCall);
    }

    return callsArr;
  }, [
    accountAddress,
    allowance,
    bidAmount,
    bidPrice,
    vaultContract,
    ethContract,
    vaultAddress,
    ethAddress,
    roundAddress,
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
