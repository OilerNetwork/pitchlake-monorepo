import { useState } from "react";
import { OptionBuyerStateType, OptionRoundStateType } from "@/lib/types";
import { useAccount } from "@starknet-react/core";

const useMockOptionRounds = () => {
  const { address } = useAccount();
  const date = Date.now();
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

  return {
    rounds,
    setRounds,
    buyerStates,
    setBuyerStates,
  };
};

export default useMockOptionRounds;
