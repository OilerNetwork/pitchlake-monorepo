import { useAccount, useContract, useProvider } from "@starknet-react/core";
import { Account, Contract, Provider } from "starknet";
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
  FossilRequest,
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

  const sendFossilRequest = useCallback(
    async (jobRequest: FossilRequest | null): Promise<string> => {
      const OK = Promise.resolve("Ok");
      const NOT_OK = Promise.resolve("Not Ok");
      if (!jobRequest) return NOT_OK;
      
      if (conn === "demo") {
        // Mock verifier - use demo account like the old route
        try {
          // Get demo account setup (same as sendMockFossilCallback route)
          const address = process.env.DEMO_ACCOUNT_ADDRESS;
          const pk = process.env.DEMO_PRIVATE_KEY;
          const rpc = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA;

          if (!address || !pk || !rpc) {
            console.error("Failed to fetch demo account secrets");
            return NOT_OK;
          }

          // Initialize demo account
          const provider = new Provider({ nodeUrl: rpc });
          const account = new Account(provider, address, pk);

          // Initialize vault contract with demo account
          const vaultContract = new Contract(vaultABI, vaultAddress as string, account);
          
          // Hardcoded values as specified in support-server utils.ts
          const RESERVE_PRICE = "34028236692093846346337460743176821145600000000";
          const TWAP = "680564733841876926926749214863536422912000000000";
          const MAX_RETURN = "113416112894748789872342756657008344878";
          
          // Get proving delay from vault
          const provingDelay = await vaultContract.get_proving_delay();
          
          // Calculate timestamp: upper bound + proving delay + tolerance
          const tolerance = 60; // seconds
          const timestamp = Number(jobRequest.params.reserve_price[1]) + Number(provingDelay) + tolerance;
          
          // Serialize job request: [vault_address, timestamp, program_id]
          const jobRequestSerialized = [
            jobRequest.vault_address,
            timestamp.toString(),
            jobRequest.program_id,
          ];
          
          // Serialize result: [reserve_price_lower, reserve_price_upper, reserve_price, twap_lower, twap_upper, twap, max_return_lower, max_return_upper, max_return]
          const resultSerialized = [
            jobRequest.params.reserve_price[0].toString(), // reserve price lower bound
            jobRequest.params.reserve_price[1].toString(), // reserve price upper bound
            RESERVE_PRICE, // reserve price
            jobRequest.params.twap[0].toString(), // twap lower bound
            jobRequest.params.twap[1].toString(), // twap upper bound
            TWAP, // twap
            jobRequest.params.max_return[0].toString(), // max return lower bound
            jobRequest.params.max_return[1].toString(), // max return upper bound
            MAX_RETURN, // max return
          ];
          
          // Call fossil_callback directly on the vault contract
          const { transaction_hash } = await vaultContract.fossil_callback(
            jobRequestSerialized,
            resultSerialized,
          );
          
          console.log("Mock verifier callback sent successfully", {
            transactionHash: transaction_hash,
          });
          
          return OK;
        } catch (error) {
          console.error("Error in mock verifier request:", error);
          return NOT_OK;
        }
      } else if (conn === "ws" || conn === "rpc") {
        const formattedRequest = {
          program_id: "0x" + jobRequest.program_id.toString(16),
          vault_address: "0x" + jobRequest.vault_address.toString(16),
          params: {
            twap: [
              Number(jobRequest.params.twap[0]),
              Number(jobRequest.params.twap[1]),
            ],
            max_return: [
              Number(jobRequest.params.max_return[0]),
              Number(jobRequest.params.max_return[1]),
            ],
            reserve_price: [
              Number(jobRequest.params.reserve_price[0]),
              Number(jobRequest.params.reserve_price[1]),
            ],
          },
        };

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_WS_URL}sendJobRequest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fossil_request: formattedRequest,
              round_id: 1, // You may need to pass the actual round ID
            }),
          },
        );

        if (response.ok) return OK;
        return NOT_OK;
      }
      return OK;
    },
    [conn, typedContract],
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
