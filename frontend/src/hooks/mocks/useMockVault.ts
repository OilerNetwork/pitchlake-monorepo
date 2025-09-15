import { useAccount } from "@starknet-react/core";
import {
  DepositArgs,
  LiquidityProviderStateType,
  VaultActionsType,
  VaultStateType,
  WithdrawLiquidityArgs,
  QueueArgs,
  CollectArgs,
  PlaceBidArgs,
  Bid,
  RefundBidsArgs,
  UpdateBidArgs,
  MintOptionsArgs,
  ExerciseOptionsArgs,
  SendFossiLRequestParams,
} from "@/lib/types";
import { useState } from "react";
import useMockOptionRounds from "./useMockOptionRounds";
import { DemoFossilCallParams } from "@/app/api/sendMockFossilCallback/route";

const useMockVault = (
  selectedRound: number,
  timestamp: number,
  address?: string,
) => {
  const { address: accountAddress } = useAccount();
  //Read States
  const [vaultState, setVaultState] = useState<VaultStateType>({
    address: address ?? "0x1",
    vaultType: "ITM",
    alpha: "5555",
    ethAddress: "0x00",
    l1DataProcessorAddress: "0x00",
    currentRoundId: 1,
    lockedBalance: "0",
    unlockedBalance: "123456789123456789123",
    stashedBalance: "112233445566778899",
    queuedBps: "0",
    strikeLevel: "-1111",
    now: "0",
    deploymentDate: "1",
    currentRoundAddress: "",
  });
  //States without a param

  //Wallet states
  const [lpState, setLPState] = useState<LiquidityProviderStateType>({
    address: accountAddress ?? "0x1",
    lockedBalance: "12800000000000000000",
    unlockedBalance: "1500000000000000000",
    stashedBalance: "123000000000000000",
    queuedBps: "1234",
  });

  const { rounds, setRounds, buyerStates, setBuyerStates } =
    useMockOptionRounds();

  // Function to update a specific field in the LP state
  const currentRoundAddress = "";
  //Round Addresses and States
  const depositLiquidity = async (
    depositArgs: DepositArgs,
  ): Promise<string> => {
    // setLPState((prevState) => {
    //   return {
    //     ...prevState,
    //     unlockedBalance: (
    //       BigInt(prevState.unlockedBalance) + BigInt(depositArgs.amount)
    //     ).toString(),
    //   };
    // });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "";
  };

  const withdrawLiquidity = async (
    withdrawArgs: WithdrawLiquidityArgs,
  ): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "";
  };

  const withdrawStash = async (collectArgs: CollectArgs): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "";
  };

  const queueWithdrawal = async (queueArgs: QueueArgs): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "";
  };

  const startAuction = async () => {
    if (rounds[selectedRound - 1].roundState === "Open")
      setRounds((prevState) => {
        const newState = [...prevState];
        newState[selectedRound - 1].roundState = "Auctioning";
        return prevState;
      });
  };
  const endAuction = async () => {
    if (rounds[selectedRound - 1].roundState === "Auctioning")
      setRounds((prevState) => {
        const newState = [...prevState];
        newState[selectedRound - 1].roundState = "Running";
        return prevState;
      });
  };

  const settleOptionRound = async () => {
    if (rounds[selectedRound - 1].roundState === "Running")
      setRounds((prevState) => {
        const newState = [...prevState];
        newState[selectedRound - 1].roundState = "Settled";
        newState.push({
          roundId: BigInt(vaultState.currentRoundId) + BigInt(1),
          clearingPrice: "0",
          strikePrice: "10000000000",
          address: "0x1",
          capLevel: "2480",
          startingLiquidity: "",
          availableOptions: "",
          settlementPrice: "",
          optionsSold: "",
          roundState: "Open",
          premiums: "",
          payoutPerOption: "",
          vaultAddress: "",
          reservePrice: "2000000000",
          deploymentDate: timestamp.toString(),
          auctionStartDate: 200000 + timestamp,
          auctionEndDate: 400000 + timestamp,
          optionSettleDate: 600000 + timestamp,
          soldLiquidity: "",
          unsoldLiquidity: "",
          optionSold: "",
          totalPayout: "",
          treeNonce: "",
          performanceLP: "",
          performanceOB: "",
          // Add other fields as necessary
        });
        return newState;
      });

    setBuyerStates((prevState) => {
      return [
        ...prevState,
        {
          address: address ?? "0x1",
          roundAddress: "0x1",
          mintableOptions: "",
          refundableOptions: "",
          bids: [],
          totalOptions: "0",
          payoutBalance: "0",
        },
      ];
    });

    setVaultState((prevState) => {
      return {
        ...prevState,
        currentRoundId: BigInt(prevState.currentRoundId) + BigInt(1),
      };
    });
  };

  const demoFossilCallback = async (
    fossilArgs: DemoFossilCallParams,
  ): Promise<boolean> => {
    await settleOptionRound();
    return true;
  };

  const sendFossilRequest = async (
    fossilRequest: SendFossiLRequestParams,
  ): Promise<string> => {
    return "Ok";
  };

  const placeBid = async (placeBidArgs: PlaceBidArgs): Promise<string> => {
    setBuyerStates((prevState) => {
      const newState = [...prevState];
      const buyerStateIndex = newState.findIndex(
        (state) => state.address === (address ?? "0xbuyer"),
      );

      if (buyerStateIndex === -1) {
        return prevState;
      }

      const newBid: Bid = {
        bidId: "3",
        address: address ?? "",
        roundAddress: rounds[selectedRound - 1].address ?? "",
        treeNonce: "2",
        amount: placeBidArgs.amount,
        price: placeBidArgs.price,
      };

      // Initialize bids array if it doesn't exist
      if (!newState[buyerStateIndex].bids) {
        newState[buyerStateIndex].bids = [];
      }

      newState[buyerStateIndex].bids = [
        ...(newState[buyerStateIndex].bids || []),
        newBid,
      ];
      return newState;
    });
    return "";
  };

  const refundUnusedBids = async (
    refundBidsArgs: RefundBidsArgs,
  ): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const updateBid = async (updateBidArgs: UpdateBidArgs): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const mintOptions = async (
    mintOptionsArgs: MintOptionsArgs,
  ): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const exerciseOptions = async (
    exerciseOptionsArgs: ExerciseOptionsArgs,
  ): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const vaultActions: VaultActionsType = {
    // User actions
    depositLiquidity,
    withdrawLiquidity,
    withdrawStash,
    queueWithdrawal,
    startAuction,
    endAuction,
    settleOptionRound,
    demoFossilCallback,
    sendFossilRequest,
    placeBid,
    updateBid,
    mintOptions,
    refundUnusedBids,
    exerciseOptions,
  };

  return {
    vaultState,
    lpState,
    currentRoundAddress,
    vaultActions,
    optionRoundStates: rounds,
    optionBuyerStates: buyerStates,
  };
};

export default useMockVault;
