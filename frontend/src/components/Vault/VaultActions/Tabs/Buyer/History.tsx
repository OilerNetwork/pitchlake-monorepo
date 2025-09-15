import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { SquarePen } from "lucide-react";
import { formatNumber, formatNumberText } from "@/lib/utils";
import { formatUnits } from "ethers";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { ExclamationIcon } from "@/components/Icons";
import { useTimeContext } from "@/context/TimeProvider";
import EditBid from "./EditBid";
import useOBState from "@/hooks/vault_v2/states/useOBState";

interface HistoryProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
  setIsShowingTabs: (value: boolean) => void;
}

export type Bid = {
  bid_id: string;
  amount: string | number | bigint;
  price: string | number | bigint;
};

const History: React.FC<HistoryProps> = ({
  showConfirmation,
  setIsShowingTabs,
}) => {
  const { selectedRoundAddress } = useVaultState();
  const { timestamp } = useTimeContext();
  const obState = useOBState(selectedRoundAddress);
  const bids: Bid[] = obState?.bids || [];
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [bidToEdit, setBidToEdit] = useState({
    bid_id: "",
    amount: "",
    price: "",
  });

  const isAuctionOver = useMemo(() => {
    return (
      selectedRoundState?.roundState !== "Auctioning" ||
      timestamp > Number(selectedRoundState?.auctionEndDate)
    );
  }, [
    selectedRoundState?.roundState,
    selectedRoundState?.auctionEndDate,
    timestamp,
  ]);

  // Only hide tabs when editing
  useEffect(() => {
    if (isEditOpen) setIsShowingTabs(false);
    else setIsShowingTabs(true);
  }, [isEditOpen]);

  return (
    <>
      {bids.length === 0 && <NoBids />}

      {isEditOpen && (
        <EditBid
          bidToEdit={bidToEdit}
          onClose={() => {
            setIsEditOpen(false);
          }}
          showConfirmation={showConfirmation}
        />
      )}

      {!isEditOpen && (
        <div className="">
          {bids.map((item, index) => (
            <BidItem
              key={index}
              bid={item}
              isLast={index === bids.length - 1}
              setIsEditOpen={setIsEditOpen}
              setBidToEdit={setBidToEdit}
              isAuctionOver={isAuctionOver}
            />
          ))}
        </div>
      )}
    </>
  );
};

const NoBids = () => {
  return (
    <Hoverable
      dataId="noBids"
      className="flex space-y-6 flex-col flex-grow items-center justify-center text-center p-6"
    >
      <ExclamationIcon />
      <div className="flex flex-col space-y-2">
        <p className="text-[16px] font-medium text-[#FAFAFA] text-center">
          No Bids
        </p>
        <p className="max-w-[290px] font-regular text-[14px] text-[#BFBFBF] pt-0">
          You have not placed any bids.
        </p>
      </div>
    </Hoverable>
  );
};

const BidItem: React.FC<{
  bid: Bid;
  isLast: boolean;
  setBidToEdit: (bid: any) => void;
  setIsEditOpen: (open: boolean) => void;
  isAuctionOver: boolean;
}> = ({ bid, isLast, setIsEditOpen, setBidToEdit, isAuctionOver }) => (
  <div
    className={`bid-item py-4 px-4 flex flex-row justify-between items-center ${!isLast ? "border-b border-[#262626]" : ""} m-0`}
  >
    <div className="flex align-center flex-col gap-1">
      <p className="bid-item-details text-[#fafafa] font-regular text-[14px] text-sm">
        {formatNumberText(Number(bid.amount))} options at{" "}
        {formatUnits(bid.price, "gwei")} GWEI each
      </p>
      <p className="bid-item-total text-[12px] text-[var(--buttongrey)] font-regular">
        Total:{" "}
        {formatNumber(
          Number(formatUnits(bid.price, "ether")) * Number(bid.amount),
        )}{" "}
        ETH
      </p>
    </div>
    {!isAuctionOver && (
      <Hoverable
        dataId="openUpdateBidPanel"
        className="edit-button flex flex-row items-center justify-center bg-[#0D0D0D] border border-[1px] border-[#262626] p-2 rounded-lg cursor-pointer w-[40px] h-[40px]"
      >
        <button
          className="edit-button flex flex-row items-center justify-center "
          aria-label="edit bid"
          onClick={() => {
            setBidToEdit(bid);
            setIsEditOpen(true);
            console.log("clicked on this bid:", bid);
          }}
        >
          <SquarePen size={20} className="text-[#E2E2E2]" stroke="#F5EBB8" />
        </button>
      </Hoverable>
    )}
  </div>
);
export default History;
