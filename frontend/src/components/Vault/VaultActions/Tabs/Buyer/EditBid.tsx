import React, { useState, useMemo, ReactNode, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import InputField from "@/components/Vault/Utils/InputField";
import {
  EthereumIcon,
  HourglassIcon,
  LayerStackIcon,
} from "@/components/Icons";
import { formatUnits, parseUnits, formatEther } from "ethers";
import { num } from "starknet";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import { useAccount } from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { formatNumber } from "@/lib/utils";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { useTimeContext } from "@/context/TimeProvider";
import { Bid } from "./History";
import useEditBidMulticall from "@/hooks/txn/useEditBidMulticall";
import { AuctionOverPanel } from "./PlaceBid";

const LOCAL_STORAGE_KEY = "editBidPriceGwei";

interface EditModalProps {
  onClose: () => void;
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
  bidToEdit: Bid;
}

function stringGweiToWei(gwei: string): bigint {
  return parseUnits(gwei ? gwei : "0", "gwei");
}

const EditModal: React.FC<EditModalProps> = ({
  onClose,
  showConfirmation,
  bidToEdit,
}) => {
  const { account } = useAccount();
  const { timestamp } = useTimeContext();
  const { vaultState, selectedRoundAddress } = useVaultState();
  const { pendingTx, setStatusModalProps, updateStatusModalProps } =
    useTransactionContext();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { balance } = useErc20Balance(vaultState?.ethAddress as `0x${string}`);
  const { allowance } = useErc20Allowance(
    vaultState?.ethAddress as `0x${string}`,
    selectedRoundState?.address,
  );
  const bid = bidToEdit || { amount: "0", price: "0", bid_id: "" };
  const { bid_id: bidId, amount: oldAmount, price: oldPriceWei } = bid;
  const oldPriceGwei = formatUnits(oldPriceWei, "gwei");

  const [state, setState] = useState({
    newPriceGwei: localStorage.getItem(LOCAL_STORAGE_KEY) || "",
  });

  const updateState = (updates: Partial<typeof state>) => {
    setState((prevState) => ({ ...prevState, ...updates }));
  };

  const { priceIncreaseWei, totalNewCostWei, totalNewCostEth } = useMemo(() => {
    // Calculate price increase in Wei
    const newPriceWei = stringGweiToWei(state.newPriceGwei);
    const oldPriceWeiBigInt = oldPriceWei ? BigInt(oldPriceWei) : BigInt(0);
    const priceIncreaseWei =
      newPriceWei <= oldPriceWeiBigInt
        ? BigInt(0)
        : newPriceWei - oldPriceWeiBigInt;

    // Calculate total new cost in Wei
    const totalNewCostWei = BigInt(oldAmount || "0") * priceIncreaseWei;

    // Convert total new cost to ETH
    const totalNewCostEth = formatUnits(totalNewCostWei, "ether");

    return { priceIncreaseWei, totalNewCostWei, totalNewCostEth };
  }, [state.newPriceGwei, oldPriceWei, oldAmount]);

  const { handleMulticall } = useEditBidMulticall({
    accountAddress: account?.address,
    vaultAddress: vaultState?.address,
    roundAddress: selectedRoundState?.address,
    ethAddress: vaultState?.ethAddress,
    allowance,
    bidId,
    priceIncreaseWei,
    totalNewCostWei,
    localStorageToRemove: [LOCAL_STORAGE_KEY],
  });

  // Send confirmation
  const handleSubmitForMulticall = () => {
    showConfirmation(
      "Update Bid",
      <>
        Update your bid? You will
        <br /> be spending an additional
        <br />
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(Number(totalNewCostEth))} ETH
        </span>
      </>,
      async () => {
        try {
          const hash = await handleMulticall();

          setStatusModalProps({
            version: "success",
            txnHeader: "Edit Bid Successful",
            txnHash: "",
            txnOutcome: (
              <>
                Your bid was successfully increased for{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(totalNewCostEth))} ETH
                </span>
                .
              </>
            ),
          });
          updateStatusModalProps({
            txnHash: hash,
          });

          setState((prevState) => ({ ...prevState, bidAmount: "" }));
          //onClose();
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Edit Bid Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your bid increase of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(totalNewCostEth))} ETH
                </span>{" "}
                failed.
              </>
            ),
          });
          setState((prevState) => ({ ...prevState, bidAmount: "" }));
          console.error("Error editting bid: ", e);
        }
      },
    );
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    const formattedValue = value.includes(".")
      ? value.slice(0, value.indexOf(".") + 10)
      : value;
    localStorage.setItem(LOCAL_STORAGE_KEY, formattedValue);
    updateState({ newPriceGwei: formattedValue });
  };

  const priceReason: string = useMemo(() => {
    if (!account) return "Connect account";
    else if (timestamp > Number(selectedRoundState?.auctionEndDate))
      return "Auction period is over; transaction pending...";
    else if (!state.newPriceGwei) return "";
    else if (priceIncreaseWei === BigInt(0)) return "Bid price must increase";
    else if (BigInt(totalNewCostWei) > BigInt(balance))
      return `Exceeds balance (${parseFloat(
        formatEther(balance.toString() || "0"),
      ).toFixed(5)} ETH)`;
    else return "";
  }, [
    account,
    timestamp,
    selectedRoundState?.auctionEndDate,
    state.newPriceGwei,
    totalNewCostWei,
    balance,
  ]);

  const isButtonDisabled: boolean = useMemo(() => {
    if (pendingTx) return true;
    if (priceReason !== "") return true;
    if (!state.newPriceGwei) return true;
    return false;
  }, [pendingTx, priceReason, state.newPriceGwei]);

  return (
    <>
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-0 w-full flex flex-col h-full edit-bid-modal">
        <div className="flex items-center p-4">
          <button
            onClick={onClose}
            className="flex justify-center items-center mr-4 w-[44px] h-[44px] rounded-lg border-[1px] border-[#262626] bg-[#0D0D0D] edit-bid-close"
          >
            <ChevronLeft className="size-[16px] stroke-[4px] text-[#F5EBB8]" />
          </button>
          <h2 className="text-[#FAFAFA] text-[16px] font-medium text-md edit-bid-header">
            Edit Bid
          </h2>
        </div>
        {timestamp > Number(selectedRoundState?.auctionEndDate) && (
          <AuctionOverPanel />
        )}

        {timestamp < Number(selectedRoundState?.auctionEndDate) && (
          <>
            <div className="flex flex-col h-full">
              <div className="flex-grow space-y-6 pt-2 px-4">
                <div className="edit-bid-current-amount">
                  <InputField
                    type="number"
                    value={""}
                    label="Current Amount"
                    dataId="inputUpdateBidAmount"
                    onChange={(_e) => {}}
                    placeholder={oldAmount.toString()}
                    disabled={true}
                    className="text-[#8c8c8c] bg-[#161616] border-[#262626]"
                    icon={
                      <LayerStackIcon
                        stroke="#8C8C8C"
                        fill="transparent"
                        classname="absolute right-2 top-1/2 -translate-y-1/2"
                      />
                    }
                  />
                </div>
                <div className="edit-bid-new-price">
                  <InputField
                    type="number"
                    value={state.newPriceGwei}
                    label="Enter Price"
                    label2={`Current: ${oldPriceGwei} Gwei`}
                    dataId="inputUpdateBidPrice"
                    onChange={handlePriceChange}
                    placeholder={`e.g. ${oldPriceGwei}`}
                    icon={
                      <EthereumIcon classname="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    }
                    error={priceReason}
                  />
                </div>
              </div>
            </div>

            <Hoverable
              dataId="updateBidSummary"
              className="flex justify-between text-sm px-6 pb-1 edit-bid-total"
            >
              <span className="text-gray-400">Total</span>
              <span>{formatNumber(parseFloat(totalNewCostEth))} ETH</span>
            </Hoverable>
            <Hoverable
              dataId="placingBidBalance"
              className="flex justify-between text-sm px-6 pb-6 edit-bid-balance"
            >
              <span className="text-gray-400">Balance</span>
              <span>
                {formatNumber(parseFloat(formatEther(num.toBigInt(balance))))}{" "}
                ETH
              </span>
            </Hoverable>
            <div className="mt-auto">
              <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
                <ActionButton
                  onClick={handleSubmitForMulticall}
                  disabled={isButtonDisabled}
                  text="Edit Bid"
                  dataId="updateBidButton"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default EditModal;
