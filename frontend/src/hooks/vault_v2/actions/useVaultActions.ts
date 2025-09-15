import { useAccount, useContract, useProvider } from "@starknet-react/core";
import { vaultABI } from "@/lib/abi";
import {
  DepositArgs,
  TransactionResult,
  VaultActionsType,
  WithdrawLiquidityArgs,
  QueueArgs,
  CollectArgs,
  PlaceBidArgs,
  UpdateBidArgs,
  RefundBidsArgs,
  MintOptionsArgs,
  ExerciseOptionsArgs,
  SendFossiLRequestParams,
} from "@/lib/types";
import { useCallback, useMemo } from "react";
import {
  useTransactionContext,
} from "@/context/TransactionProvider";
import { useNewContext } from "@/context/NewProvider";
import { DemoFossilCallParams } from "@/app/api/sendMockFossilCallback/route";
const useVaultActions = () => {
  const { vaultAddress, conn } = useNewContext();
  const { setPendingTx } = useTransactionContext();
  const { account } = useAccount();
  const { provider } = useProvider();
  const { contract } = useContract({
    abi: vaultABI,
    address: vaultAddress as `0x${string}`,
  });

  const typedContract = useMemo(() => {
    if (!contract) return;
    const typedContract = contract.typedv2(vaultABI);
    if (account) typedContract.connect(account);
    return typedContract;
  }, [contract, account]);

  //Maybe used later to rewrite calls as useMemos with and writeAsync
  //May not be required if we watch our transactions off the plugin
  // const { writeAsync } = useContractWrite({});
  // const contractData = {
  //   abi: vaultABI,
  //   address,
  // };

  //Write Calls

  const callContract = useCallback(
    (functionName: string) =>
      async (
        args?:
          | DepositArgs
          | WithdrawLiquidityArgs
          | QueueArgs
          | CollectArgs
          | PlaceBidArgs
          | UpdateBidArgs
          | RefundBidsArgs
          | MintOptionsArgs
          | ExerciseOptionsArgs
          | SendFossiLRequestParams,
      ) => {
        if (!typedContract || !provider || !account) return;
        let argsData;
        if (args) argsData = Object.values(args).map((value) => value);
        const nonce = await provider?.getNonceForAddress(account?.address);
        const data = (
          argsData
            ? await typedContract?.[functionName](...argsData, { nonce })
            : await typedContract?.[functionName]({ nonce })
        ) as TransactionResult;

        setPendingTx(data.transaction_hash);

        return data;
      },
    [typedContract, account, provider, setPendingTx],
  );

  /// LP

  const depositLiquidity = useCallback(
    async (depositArgs: DepositArgs): Promise<string> => {
      const reponse = await callContract("deposit")(depositArgs);
      return reponse?.transaction_hash || "";
    },
    [callContract],
  );

  const withdrawLiquidity = useCallback(
    async (withdrawArgs: WithdrawLiquidityArgs): Promise<string> => {
      const reponse = await callContract("withdraw")(withdrawArgs);
      return reponse?.transaction_hash || "";
    },
    [callContract],
  );

  const withdrawStash = useCallback(
    async (collectArgs: CollectArgs): Promise<string> => {
      const reponse = await callContract("withdraw_stash")(collectArgs);
      return reponse?.transaction_hash || "";
    },
    [callContract],
  );

  const queueWithdrawal = useCallback(
    async (queueArgs: QueueArgs): Promise<string> => {
      const reponse = await callContract("queue_withdrawal")(queueArgs);
      return reponse?.transaction_hash || "";
    },
    [callContract],
  );

  // STATE TRANSITIONS

  const startAuction = useCallback(async () => {
    await callContract("start_auction")();
  }, [callContract]);

  const endAuction = useCallback(async () => {
    await callContract("end_auction")();
  }, [callContract]);

  const demoFossilCallback = useCallback(
    async ({
      roundId,
      toTimestamp,
    }: DemoFossilCallParams): Promise<boolean> => {
      const body: DemoFossilCallParams = {
        vaultAddress: vaultAddress ? vaultAddress : "0x0",
        roundId,
        toTimestamp,
      };

      try {
        const response = await fetch("/api/sendMockFossilCallback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          alert("Txn failed to send, try again in a couple seconds");
          return false;
        } else {
          return true;
        }
      } catch (error) {
        console.error(
          "Failed to send mocked Fossil request from client side",
          error,
        );
        return false;
      }
    },
    [vaultAddress],
  );

  const sendFossilRequest = useCallback(
    async ({
      targetTimestamp,
      roundDuration,
      clientAddress,
      vaultAddress,
      alpha,
      k,
    }: SendFossiLRequestParams): Promise<string> => {
      const OK = Promise.resolve("Ok");
      const NOT_OK = Promise.resolve("Not Ok");
      if (conn === "ws" || conn === "rpc") {
        const response = await fetch("/api/sendFossilRequest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetTimestamp,
            roundDuration,
            clientAddress,
            vaultAddress,
            alpha,
            k,
          }),
        });

        if (response.ok) return OK;
        //if ((await response.text()) === "Conflict") return NOT_OK;
        return NOT_OK;
      }
      return OK;
    },
    [conn],
  );

  // @NOTE: rm and consider adding demo_fossil_callback to actions
  const settleOptionRound = useCallback(async () => {
    try {
      await callContract("settle_round")();
    } catch (error) {
      console.log(error);
    }
  }, [callContract]);

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

  const mintOptions = useCallback(
    async (args: MintOptionsArgs): Promise<string> => {
      const response = await callContract("mint_options")(args);
      return response?.transaction_hash || "";
    },
    [callContract],
  );

  const exerciseOptions = useCallback(
    async (args: ExerciseOptionsArgs): Promise<string> => {
      const response = await callContract("exercise_options")(args);
      return response?.transaction_hash || "";
    },
    [callContract],
  );

  //State Transition

  return {
    depositLiquidity,
    withdrawLiquidity,
    withdrawStash,
    queueWithdrawal,
    startAuction,
    endAuction,
    demoFossilCallback,
    sendFossilRequest,
    settleOptionRound,
    placeBid,
    updateBid,
    refundUnusedBids,
    mintOptions,
    exerciseOptions,
  } as VaultActionsType;
};

export default useVaultActions;
