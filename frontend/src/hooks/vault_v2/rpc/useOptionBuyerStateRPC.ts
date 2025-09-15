import { useNewContext } from "@/context/NewProvider";
import { optionRoundABI } from "@/lib/abi";
import { OptionBuyerStateType } from "@/lib/types";
import { useAccount, useContractRead } from "@starknet-react/core";
import { useMemo } from "react";
import { BlockTag } from "starknet";

const useOptionBuyerStateRPC = (address?: string) => {
  const { conn } = useNewContext();
  const contractData = useMemo(() => {
    if (conn === "mock") return { abi: optionRoundABI, address: undefined };
    else return { abi: optionRoundABI, address: address as `0x${string}` };
  }, [conn, address]);
  const account = useAccount();

  const { data: biddingNonce } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_bid_nonce",
  });
  const { data: bids } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_bids",
  });
  const { data: refundableBids } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_refundable_balance",
  });
  const { data: mintableOptions } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_mintable_options",
  });

  const { data: totalOptions } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_total_options",
  });
  const { data: payoutBalance } = useContractRead({
    ...contractData,
    
    watch: true,
    args: [account?.address as string],
    functionName: "get_account_payout_balance",
  });

  return {
    address: account?.address as string,
    bids: bids ? bids : [],
    roundAddress: address,
    bidderNonce: biddingNonce ? biddingNonce.toString() : 0,
    refundableOptions: refundableBids ? refundableBids.toString() : 0,
    mintableOptions: mintableOptions ? mintableOptions.toString() : 0,
    totalOptions: totalOptions ? totalOptions.toString() : 0,
    payoutBalance: payoutBalance ? payoutBalance.toString() : 0,
  } as OptionBuyerStateType;
};

export default useOptionBuyerStateRPC;
