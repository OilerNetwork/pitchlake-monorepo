import { useEffect, useMemo } from "react";
import { parseEther } from "ethers";
import { num, Call } from "starknet";
import { useContractWrite } from "@starknet-react/core";
import { isValidHex64 } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useErc20Contract } from "@/hooks/contracts/useErc20Contract";
import { useVaultContract } from "@/hooks/contracts/useVaultContract";

interface DepositMulticallProps {
  accountAddress: string | undefined;
  vaultAddress: string | undefined;
  ethAddress: string | undefined;
  allowance: bigint | undefined;
  depositAmount: string;
  isDepositAsBeneficiary: boolean;
  beneficiaryAddress: string;
  localStorageToRemove: string[];
}

export default function useDepositMulticall({
  accountAddress,
  vaultAddress,
  ethAddress,
  allowance,
  depositAmount,
  isDepositAsBeneficiary,
  beneficiaryAddress,
  localStorageToRemove,
}: DepositMulticallProps) {
  const { setPendingTx } = useTransactionContext();

  // Get contract objects
  const { erc20Contract: ethContract } = useErc20Contract({
    tokenAddress: ethAddress,
  });
  const { vaultContract } = useVaultContract({
    vaultAddress: vaultAddress,
  });

  /**
   * Build the calls array for approval + deposit.
   * Only build calls if conditions are correct:
   * - We have a valid deposit amount > 0
   * - We have valid addresses
   */
  const calls: Call[] = useMemo(() => {
    // Is account ok
    if (!accountAddress || !isValidHex64(accountAddress)) return [];

    // Are vars ok
    if (
      !vaultAddress ||
      !depositAmount ||
      !vaultContract ||
      !ethContract ||
      Number(depositAmount) <= 0
    )
      return [];

    // If user is depositing for someone else, beneficiary must be a valid address
    if (isDepositAsBeneficiary && !isValidHex64(beneficiaryAddress)) return [];

    // Convert deposit to Wei
    const amountWei: bigint = parseEther(depositAmount);

    // If not depositing for someone else, the beneficiary is the user
    const actualBeneficiary = isDepositAsBeneficiary
      ? beneficiaryAddress
      : accountAddress;

    // Prepare calls
    const callsArr: Call[] = [];

    const approveCall = ethContract.populateTransaction.approve(
      vaultAddress,
      amountWei,
    );

    const depositCall = vaultContract.populateTransaction.deposit(
      amountWei,
      actualBeneficiary,
    );

    // Only push approve if allowance is too low
    if (approveCall && (allowance || 0) < amountWei) {
      callsArr.push(approveCall);
    }

    // Always push deposit call
    if (depositCall) {
      callsArr.push(depositCall);
    }

    return callsArr;
  }, [
    accountAddress,
    allowance,
    depositAmount,
    beneficiaryAddress,
    isDepositAsBeneficiary,
    vaultContract,
    ethContract,
    vaultAddress,
    ethAddress,
  ]);

  const { writeAsync } = useContractWrite({ calls });

  const handleMulticall = async () => {
    if (!calls.length) {
      throw new Error("No calls to execute. Check your deposit parameters.");
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
