import React, { useState, ReactNode, useMemo } from "react";
import InputField from "@/components/Vault/Utils/InputField";
import { Layers3 } from "lucide-react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { formatUnits, parseUnits, formatEther } from "ethers";
import { useAccount } from "@starknet-react/core";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import { formatNumber, formatNumberText } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { useTimeContext } from "@/context/TimeProvider";
import { EthereumIcon, HourglassIcon } from "@/components/Icons";
import usePlaceBidMulticall from "@/hooks/txn/usePlaceBidMulticall";

const PLACE_BID_AMOUNT = "placeBidAmount";
const PLACE_BID_PRICE = "placeBidPrice";

interface PlaceBidProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const PlaceBid: React.FC<PlaceBidProps> = ({ showConfirmation }) => {
  const { account } = useAccount();
  const { timestamp } = useTimeContext();
  const { vaultState, selectedRoundAddress } = useVaultState();
  const { pendingTx, setStatusModalProps } = useTransactionContext();

  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { balance } = useErc20Balance(vaultState?.ethAddress as `0x${string}`);
  const { allowance } = useErc20Allowance(
    vaultState?.ethAddress as `0x${string}`,
    selectedRoundState?.address,
  );

  const [state, setState] = useState({
    bidAmount: localStorage.getItem(PLACE_BID_AMOUNT) || "",
    bidPrice: localStorage.getItem(PLACE_BID_PRICE) || "",
  });

  const updateState = (updates: Partial<typeof state>) => {
    setState((prevState) => ({ ...prevState, ...updates }));
  };

  // Send confirmation
  const handleSubmitForMulticall = () => {
    showConfirmation(
      "Bid",
      <>
        bid
        <br />
        <span className="font-semibold text-[#fafafa]">
          {bidPriceGwei} Gwei{" "}
        </span>{" "}
        per
        <br />
        <span className="font-semibold text-[#fafafa]">
          {formatNumberText(Number(bidAmount))} options
        </span>
        , totaling
        <br />
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(bidTotalEth)} ETH
        </span>
        ?
      </>,
      async () => {
        try {
          const hash = await handleMulticall();

          setStatusModalProps({
            version: "success",
            txnHeader: "Bid Successful",
            txnHash: hash,
            txnOutcome: (
              <>
                Your bid of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {bidPriceGwei} Gwei{" "}
                </span>{" "}
                per{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(Number(bidAmount))} options
                </span>
                , totaling{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(bidTotalEth)} ETH
                </span>{" "}
                was successful.
              </>
            ),
          });

          setState((prevState) => ({ ...prevState, bidAmount: "" }));
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Bid Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your bid of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {bidPriceGwei} Gwei
                </span>{" "}
                per{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(Number(bidAmount))} options
                </span>
                , totaling{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(bidTotalEth)} ETH
                </span>{" "}
                failed.
              </>
            ),
          });

          console.error("Error placing bid: ", e);
        }
      },
    );
  };

  const { handleMulticall } = usePlaceBidMulticall({
    accountAddress: account?.address,
    vaultAddress: vaultState?.address,
    roundAddress: selectedRoundState?.address,
    ethAddress: vaultState?.ethAddress,
    allowance,
    bidAmount: state.bidAmount,
    bidPrice: state.bidPrice,
    localStorageToRemove: [PLACE_BID_AMOUNT, PLACE_BID_PRICE],
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      updateState({ bidAmount: value });
    }
    localStorage?.setItem(PLACE_BID_AMOUNT, value);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    const formattedValue = value.includes(".")
      ? value.slice(0, value.indexOf(".") + 10)
      : value;
    updateState({ bidPrice: formattedValue });
    localStorage?.setItem(PLACE_BID_PRICE, formattedValue);
  };

  const bidPriceWei = parseUnits(state.bidPrice ? state.bidPrice : "0", "gwei");
  const bidPriceEth = formatEther(bidPriceWei);
  const bidPriceGwei = formatUnits(bidPriceWei, "gwei");
  const bidAmount = state.bidAmount ? state.bidAmount : "0";
  const bidTotalEth = Number(bidPriceEth) * Number(bidAmount);

  const amountReason: string = useMemo(() => {
    if (!account) return "Connect account";
    else if (timestamp > Number(selectedRoundState?.auctionEndDate))
      return "Auction period is over; transaction pending...";
    else if (state.bidAmount == "") return "";
    else if (Number(state.bidAmount) <= 0)
      return "Amount must be greater than 0";
    else return "";
  }, [
    account,
    timestamp,
    selectedRoundState?.auctionEndDate,
    state.bidAmount,
    balance,
  ]);

  const priceReason: string = useMemo(() => {
    const reservePriceWei = selectedRoundState?.reservePrice
      ? selectedRoundState.reservePrice
      : 0;
    const reservePriceGwei = formatUnits(reservePriceWei, "gwei");
    if (!account) return "Connect account";
    else if (timestamp > Number(selectedRoundState?.auctionEndDate))
      return "Auction period is over; transaction pending...";
    else if (state.bidPrice == "") return "";
    else if (BigInt(bidPriceWei) < BigInt(reservePriceWei))
      return `Price must be at least the reserve price (${Number(reservePriceGwei).toFixed(5)} Gwei)`;
    else if (BigInt(BigInt(bidPriceWei) * BigInt(bidAmount)) > BigInt(balance))
      return `Exceeds balance (${parseFloat(
        formatEther(balance.toString() || "0"),
      ).toFixed(5)} ETH)`;
    else return "";
  }, [
    account,
    timestamp,
    selectedRoundState?.auctionEndDate,
    selectedRoundState?.reservePrice,
    state.bidPrice,
    state.bidAmount,
    balance,
  ]);

  const isButtonDisabled: boolean = useMemo(() => {
    if (pendingTx) return true;
    if (priceReason !== "" || amountReason !== "") return true;
    if (!state.bidAmount || !state.bidPrice) return true;
    return false;
  }, [pendingTx, priceReason, amountReason, state.bidAmount, state.bidPrice]);

  if (timestamp > Number(selectedRoundState?.auctionEndDate)) {
    return <AuctionOverPanel />;
  } else
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow space-y-6 p-6">
          <div className="place-bid-container">
            <InputField
              label="Enter Amount"
              dataId="inputBidAmount"
              type="integer"
              value={state.bidAmount}
              onChange={handleAmountChange}
              placeholder="e.g. 5000"
              icon={
                <Layers3
                  size="20px"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 stroke-[1px]"
                />
              }
              error={amountReason}
            />
          </div>
          <div>
            <InputField
              label="Enter Price (Gwei)"
              type="number"
              value={state.bidPrice}
              dataId="inputBidPrice"
              onChange={handlePriceChange}
              placeholder="e.g. 0.3"
              icon={
                <EthereumIcon classname="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              }
              error={priceReason}
            />
          </div>
        </div>
        <Hoverable dataId="newBidSummary" className="flex flex-col h-[full]">
          <div className="flex justify-between text-sm px-6 pb-1">
            <span className="text-gray-400 place-bid-total">Total</span>
            <span>{formatNumber(bidTotalEth)} ETH</span>
          </div>
        </Hoverable>
        <Hoverable
          dataId="placingBidBalance"
          className="flex flex-col h-[full]"
        >
          <div className="flex justify-between text-sm px-6 pb-6">
            <span className="text-gray-400">Balance</span>
            <span>
              {formatNumber(parseFloat(formatEther(BigInt(balance))))} ETH
            </span>
          </div>
        </Hoverable>
        <div className="mt-auto">
          <div className="place-bid-action-button px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
            <ActionButton
              onClick={handleSubmitForMulticall}
              disabled={isButtonDisabled}
              text="Place Bid"
              dataId="placeBidButton"
            />
          </div>
        </div>
      </div>
    );
};

export const AuctionOverPanel: React.FC = () => (
  <Hoverable
    dataId="auctionOverPlanel"
    className="flex space-y-6 flex-col flex-grow items-center justify-center text-center p-6"
  >
    <HourglassIcon />
    <div className="flex flex-col space-y-2">
      <p className="text-[16px] font-medium text-[#FAFAFA] text-center">
        Auction Ending
      </p>
      <p className="max-w-[290px] font-regular text-[14px] text-[#BFBFBF] pt-0">
        No more bids can be placed.
      </p>
    </div>
  </Hoverable>
);

export default PlaceBid;
