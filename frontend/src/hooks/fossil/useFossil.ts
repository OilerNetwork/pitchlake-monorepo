import { useContract } from "@starknet-react/core";
import { useEffect, useCallback, useMemo, useState } from "react";
import { ApprovalArgs, TransactionResult } from "@/lib/types";
import { fossilClientABI } from "@/lib/abi";
import { Account, AccountInterface, RpcProvider } from "starknet";
import { useTransactionContext } from "@/context/TransactionProvider";
import { getDevAccount } from "@/lib/constants";

const useFossil = (
  l1DataProcessorAddress: string | undefined,
  account?: AccountInterface | undefined,
) => {
  const contractData = {
    abi: fossilClientABI,
    address: l1DataProcessorAddress as `0x${string}`,
  };

  const { contract } = useContract({ ...contractData });
  const { setPendingTx } = useTransactionContext();

  // No increase_allowance on ETH ?
  const fossilCallback = useCallback(
    async (request: any[], result: any[]) => {
      if (!contract) return;
      const typedContract = contract.typedv2(fossilClientABI);
      if (account) typedContract.connect(account as Account);

      try {
        const data = await typedContract.fossil_callback(request, result);
        const typedData = data as TransactionResult;
        setPendingTx(typedData.transaction_hash);
      } catch (err) {
        console.log(err);
      }
    },
    [account, setPendingTx],
  );

  return {
    fossilCallback,
  };
};

export default useFossil;
