import { useAccount, useContract, useProvider } from "@starknet-react/core";
import { optionRoundABI } from "@/lib/abi";
import {
  TransactionResult,
  OptionRoundActionsType,
  PlaceBidArgs,
  UpdateBidArgs,
  RefundBidsArgs,
} from "@/lib/types";
import { useCallback, useMemo } from "react";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useNewContext } from "@/context/NewProvider";
import { useOptionRoundContract } from "../../contracts/useOptionRoundContract";

const useOptionRoundActions = (args: {
  optionRoundAddress: string | undefined;
}) => {
  const { conn } = useNewContext();
  const { setPendingTx } = useTransactionContext();
  const { account } = useAccount();
  const { provider } = useProvider();
  const { optionRoundContract: contract } = useOptionRoundContract({
    contractAddress: args.optionRoundAddress,
  });

  const typedContract = useMemo(() => {
    if (!contract) return;
    const typedContract = contract.typedv2(optionRoundABI);
    if (account) typedContract.connect(account);
    return typedContract;
  }, [contract, account]);

  //Write Calls

  const callContract = useCallback(
    (functionName: string) =>
      async (
        args?:
          | PlaceBidArgs
          | UpdateBidArgs
          | RefundBidsArgs
          | string
          | string[],
      ) => {
        if (!typedContract || !provider || !account) return;
        let argsData;
        if (args) argsData = Object.values(args).map((value) => value);
        const data = (
          argsData
            ? await typedContract?.[functionName](...argsData)
            : await typedContract?.[functionName]()
        ) as TransactionResult;

        setPendingTx(data.transaction_hash);

        return data;
      },
    [typedContract, account, provider, setPendingTx],
  );

  // OB
  const placeBid = useCallback(
    async (args: PlaceBidArgs): Promise<string> => {
      const response = await callContract("place_bid")(args);
      return response?.transaction_hash || "";
    },
    [callContract],
  );

  const updateBid = useCallback(
    async (args: UpdateBidArgs): Promise<string> => {
      const response = await callContract("update_bid")(args);
      return response?.transaction_hash || "";
    },
    [callContract],
  );

  const refundUnusedBids = useCallback(
    async (args: RefundBidsArgs): Promise<string> => {
      const response = await callContract("refund_unused_bids")(args);
      return response?.transaction_hash || "";
    },
    [callContract],
  );

  const mintOptions = useCallback(async (): Promise<string> => {
    const response = await callContract("mint_options")();
    return response?.transaction_hash || "";
  }, [callContract]);

  const exerciseOptions = useCallback(async (): Promise<string> => {
    const response = await callContract("exercise_options")();
    return response?.transaction_hash || "";
  }, [callContract]);

  //State Transition

  return {
    placeBid,
    updateBid,
    refundUnusedBids,
    mintOptions,
    exerciseOptions,
  } as OptionRoundActionsType;
};

export default useOptionRoundActions;
