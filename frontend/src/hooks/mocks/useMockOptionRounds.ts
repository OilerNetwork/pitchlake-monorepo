import { useEffect, useState } from "react";
import {
  OptionBuyerStateType,
  OptionRoundActionsType,
  OptionRoundStateType,
} from "@/lib/types";
import { useAccount } from "@starknet-react/core";
import { PlaceBidArgs, Bid, RefundBidsArgs, UpdateBidArgs } from "@/lib/types";

const useMockOptionRounds = ({ selectedRound }: { selectedRound: number }) => {
  const { address } = useAccount();
  const [date, setDate] = useState(0);
  useEffect(() => {
    setDate(Date.now());
  }, []);
  const [rounds, setRounds] = useState<OptionRoundStateType[]>(
    // Initial mock data for option round states
    [
      {
        roundId: 1,
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
        auctionStartDate: date + 200000,
        auctionEndDate: date + 400000,
        optionSettleDate: date + 600000,
        deploymentDate: "1",
        soldLiquidity: "",
        unsoldLiquidity: "",
        optionSold: "",
        totalPayout: "",
        treeNonce: "",
        performanceLP: "0",
        performanceOB: "0",
        // Add other fields as necessary
      },
    ],
    // Add more mock states as needed
  );

  const [buyerStates, setBuyerStates] = useState<OptionBuyerStateType[]>([
    {
      address: address ?? "0xbuyer",
      roundAddress: "0x1",
      mintableOptions: 11,
      refundableOptions: 24,
      totalOptions: 35,
      payoutBalance: 100,
      bids: [],
    },
  ]);

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

  const mintOptions = async (): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const exerciseOptions = async (): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "";
  };

  const roundActions: OptionRoundActionsType = {
    placeBid,
    updateBid,
    mintOptions,
    refundUnusedBids,
    exerciseOptions,
  };

  return {
    rounds,
    setRounds,
    buyerStates,
    setBuyerStates,
    roundActions,
  };
};

export default useMockOptionRounds;
