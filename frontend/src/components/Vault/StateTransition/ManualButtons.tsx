import { useAccount } from "@starknet-react/core";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useTransactionContext } from "@/context/TransactionProvider";
import { getIconByRoundState } from "@/hooks/stateTransition/getIconByRoundState";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useTimeContext } from "@/context/TimeProvider";
import { useNewContext } from "@/context/NewProvider";

const ManualButtons = ({
  isPanelOpen,
  setModalState,
}: {
  isPanelOpen: boolean;
  setModalState: any;
}) => {
  const { vaultState, selectedRoundAddress } = useVaultState();
  const { pendingTx } = useTransactionContext();
  const { account } = useAccount();
  const { timestamp } = useTimeContext();
  const { conn } = useNewContext();
  const vaultActions = useVaultActions();
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const [expectedNextState, setExpectedNextState] = useState<string | null>(
    null,
  );

  const {
    isDisabled,
    roundState,
  }: { isDisabled: boolean; roundState: string } = useMemo(() => {
    if (!selectedRoundState || !timestamp)
      return { isDisabled: true, roundState: "Settled" };

    if (pendingTx) return { isDisabled: true, roundState: "Pending" };

    if (
      expectedNextState &&
      expectedNextState !== selectedRoundState.roundState
    ) {
      return { isDisabled: true, roundState: "Pending" };
    }

    const { roundState, auctionStartDate, auctionEndDate, optionSettleDate } =
      selectedRoundState;

    if (!account) return { isDisabled: true, roundState };

    // Exit early if round settled
    if (roundState === "Settled") return { isDisabled: true, roundState };

    const targetTimestamp =
      roundState === "Open"
        ? auctionStartDate
        : roundState === "Auctioning"
          ? auctionEndDate
          : conn !== "demo"
            ? Number(optionSettleDate) + 0 // fossilDelay
            : optionSettleDate;

    if (Number(timestamp) < Number(targetTimestamp))
      return { isDisabled: true, roundState };

    return { isDisabled: false, roundState };
  }, [account, pendingTx, selectedRoundState, timestamp, expectedNextState]);

  const handleAction = useCallback(async () => {
    if (!account || !vaultState || !selectedRoundState) return;

    if (roundState === "Open") {
      try {
        await vaultActions.startAuction();
        setExpectedNextState("Auctioning");
      } catch (error) {
        console.error(error);
        setExpectedNextState(null);
      }
    } else if (roundState === "Auctioning") {
      try {
        await vaultActions.endAuction();
        setExpectedNextState("Running");
      } catch (error) {
        console.error(error);
        setExpectedNextState(null);
      }
    } else if (roundState === "Running") {
      try {
        // Do demo fossil_client_callback
        if (conn === "demo") {
          const result = await vaultActions.demoFossilCallback({
            vaultAddress: vaultState.address,
            roundId: selectedRoundState.roundId.toString(),
            toTimestamp: selectedRoundState.optionSettleDate.toString(),
          });

          result ? setExpectedNextState("Settled") : setExpectedNextState(null);
        } // Do standard fossil request
        else {
          const response = await vaultActions.sendFossilRequest({
            targetTimestamp: Number(selectedRoundState.optionSettleDate),
            vaultAddress: vaultState.address,
            clientAddress: vaultState.l1DataProcessorAddress,
            roundDuration:
              Number(selectedRoundState.optionSettleDate) -
              Number(selectedRoundState.auctionEndDate),
            alpha: Number(vaultState.alpha),
            k: Number(vaultState.strikeLevel),
          });
          if (response === "Ok") setExpectedNextState("Settled");
          else setExpectedNextState(null);
        }
      } catch (error) {
        console.error(error);
        setExpectedNextState(null);
      }
    }

    setModalState((prev: any) => ({
      ...prev,
      show: false,
    }));
  }, [
    conn,
    roundState,
    account,
    vaultState?.address,
    selectedRoundState?.auctionStartDate,
    selectedRoundState?.roundState,
    selectedRoundState?.roundId,
    selectedRoundState?.auctionEndDate,
    selectedRoundState?.optionSettleDate,
    vaultActions,
  ]);

  const actions: Record<string, string> = useMemo(
    () => ({
      Open: "Start Auction",
      Auctioning: "End Auction",
      Running: "Settle Round",
      Pending: "Pending",
    }),
    [],
  );

  const icon = getIconByRoundState(roundState, isDisabled, isPanelOpen);

  useEffect(() => {
    if (expectedNextState && roundState === expectedNextState) {
      setExpectedNextState(null);
    }
  }, [roundState, expectedNextState]);

  if (
    !vaultState ||
    !selectedRoundState ||
    !roundState ||
    roundState === "Settled"
  )
    return null;

  return (
    <div>
      <Hoverable dataId="stateTransitionCronFail" className="px-2 p-2">
        {isPanelOpen && !expectedNextState && conn !== "demo" && (
          <div className="text-[#DA718C] px-2 pb-2">
            Something went wrong,
            {account ? " please manually " : " connect account to manually "}
            {roundState === "Open"
              ? "start the auction."
              : roundState === "Auctioning"
                ? "end the auction."
                : "settle the round."}
          </div>
        )}
        {isPanelOpen && !expectedNextState && conn === "demo" && !account && (
          <div className="text-[#DA718C] px-2 pb-2">
            Connect account to transition the state.{" "}
          </div>
        )}

        <button
          disabled={isDisabled}
          className={`flex ${!isPanelOpen && !isDisabled ? "hover-zoom-small" : ""} ${
            roundState === "Settled" ? "hidden" : ""
          } ${isPanelOpen ? "p-2" : "w-[44px] h-[44px]"} border border-greyscale-700 text-primary disabled:text-greyscale rounded-md justify-center items-center min-w-[44px] min-h-[44px] w-full`}
          onClick={() => {
            setModalState({
              show: true,
              action: actions[roundState],
              onConfirm: handleAction,
            });
          }}
        >
          <p className={`${isPanelOpen ? "" : "hidden"}`}>
            {actions[roundState]}
          </p>
          {icon}
        </button>
      </Hoverable>
    </div>
  );
};

export default ManualButtons;
