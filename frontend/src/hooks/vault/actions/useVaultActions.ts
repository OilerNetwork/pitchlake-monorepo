import { useAccount, useContract, useProvider } from "@starknet-react/core";
import { vaultABI } from "@/lib/abi";
import {
  DepositArgs,
  TransactionResult,
  VaultActionsType,
  WithdrawLiquidityArgs,
  QueueArgs,
  CollectArgs,
  SendFossiLRequestParams,
} from "@/lib/types";
import { useCallback, useMemo } from "react";
import { useTransactionContext } from "@/context/TransactionProvider";
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

  //Maybe used later to rewrite calls as useMemos with and sendAsync
  //May not be required if we watch our transactions off the plugin
  // const { sendAsync } = useSendTransaction({});
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
          | SendFossiLRequestParams,
      ) => {
        if (!typedContract || !provider || !account) return;
        let argsData;
        if (args) argsData = Object.values(args).map((value) => value);
        const nonce = await provider?.getNonceForAddress(account?.address);
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

  // @NOTE: rm and consider adding demo_fossil_callback to actions
  const settleOptionRound = useCallback(async () => {
    try {
      await callContract("settle_round")();
    } catch (error) {
      console.log(error);
    }
  }, [callContract]);

  //State Transition

  return {
    depositLiquidity,
    withdrawLiquidity,
    withdrawStash,
    queueWithdrawal,
    startAuction,
    endAuction,
    demoFossilCallback,
    settleOptionRound,
  } as VaultActionsType;
};

export default useVaultActions;
